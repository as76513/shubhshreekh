package db

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// maxDeviceWriteRetries bounds the optimistic-concurrency retry loop in
// RegisterDevice/SwapDevice — a handful of attempts is enough to ride out a
// genuine race between two near-simultaneous logins without looping forever
// under pathological contention.
const maxDeviceWriteRetries = 3

// TrialDuration is how long a new signup's Pro trial lasts (TD-054) — one
// product, "Pro (7-day free trial)", no separate Free tier to fall into.
const TrialDuration = 7 * 24 * time.Hour

// MaxDevices is the anti-piracy cap: a login from a device beyond this
// count is rejected outright, never silently evicting one of the existing
// registered devices.
const MaxDevices = 2

// DeviceSwapCooldown rate-limits the self-service "log out other device"
// action — otherwise a user could rotate through unlimited devices one
// swap at a time, defeating the whole point of the cap.
const DeviceSwapCooldown = 24 * time.Hour

type Device struct {
	DeviceID     string `dynamodbav:"deviceId" json:"deviceId"`
	Label        string `dynamodbav:"label" json:"label"`
	LastActiveAt string `dynamodbav:"lastActiveAt" json:"lastActiveAt"`
}

// HasActiveEntitlement is TD-054's replacement for a stored free/pro flag:
// true while the trial clock hasn't run out, or if Subscription=="pro" (a
// manually/paid-set override — the path a future PayU integration writes
// through). A blank TrialEndsAt means this row predates the trial model
// entirely (created before 2026-10-06, back when "free" meant "logged in
// with limited access," not "no access") — grandfathered in unconditionally
// rather than retroactively locked out, since there's no Free tier left for
// such an account to fall back into under the new model.
func HasActiveEntitlement(user *User, now time.Time) bool {
	if user.TrialEndsAt == "" {
		return true
	}
	if user.Subscription == "pro" {
		return true
	}
	trialEnd, err := time.Parse(time.RFC3339, user.TrialEndsAt)
	if err != nil {
		return false
	}
	return now.Before(trialEnd)
}

// CheckDevice reports whether deviceID may log in: either it's already
// registered (just renewing its session), or there's still a free slot
// under maxDevices. maxDevices <= 0 means unlimited — used for staff roles
// (analyst/admin/compliance) that legitimately need multiple people/devices
// pushing trades; the anti-piracy cap is a customer-subscription concern,
// not an internal-tooling one (see handleVerifyOTP).
func CheckDevice(devices []Device, deviceID string, maxDevices int) bool {
	for _, d := range devices {
		if d.DeviceID == deviceID {
			return true
		}
	}
	if maxDevices <= 0 {
		return true
	}
	return len(devices) < maxDevices
}

// TouchOrRegisterDevice updates an existing device's lastActiveAt/label, or
// appends it as new. Callers must have already confirmed via CheckDevice
// that there's room — this does not enforce MaxDevices itself.
func TouchOrRegisterDevice(devices []Device, deviceID, label string, now time.Time) []Device {
	nowStr := now.UTC().Format(time.RFC3339)
	for i, d := range devices {
		if d.DeviceID == deviceID {
			devices[i].LastActiveAt = nowStr
			if label != "" {
				devices[i].Label = label
			}
			return devices
		}
	}
	return append(devices, Device{DeviceID: deviceID, Label: label, LastActiveAt: nowStr})
}

// SwapDevice drops removeDeviceID and adds the new device in its place —
// used by the self-service "log out other device" flow, never automatic.
func SwapDevice(devices []Device, removeDeviceID, newDeviceID, newLabel string, now time.Time) []Device {
	out := make([]Device, 0, len(devices)+1)
	for _, d := range devices {
		if d.DeviceID != removeDeviceID {
			out = append(out, d)
		}
	}
	return append(out, Device{DeviceID: newDeviceID, Label: newLabel, LastActiveAt: now.UTC().Format(time.RFC3339)})
}

// CanSwapDevice enforces DeviceSwapCooldown. An empty lastSwapAt (never
// swapped before) always allows it.
func CanSwapDevice(lastSwapAt string, now time.Time) (ok bool, retryAfter time.Duration) {
	if lastSwapAt == "" {
		return true, 0
	}
	t, err := time.Parse(time.RFC3339, lastSwapAt)
	if err != nil {
		return true, 0
	}
	if wait := t.Add(DeviceSwapCooldown).Sub(now); wait > 0 {
		return false, wait
	}
	return true, 0
}

// RegisterDevice is the DB glue around CheckDevice/TouchOrRegisterDevice —
// called at verify-otp time. Returns the current device list either way,
// so a rejection can show the caller what's occupying both slots. maxDevices
// is forwarded to CheckDevice (<=0 means unlimited — see CheckDevice).
//
// Retries on a fresh read if the optimistic-concurrency write loses a race
// (see DevicesVersion) — without this, two logins arriving at nearly the
// same instant could both read the same starting device list, both pass
// CheckDevice, and both get issued a session, landing at more than
// MaxDevices concurrently-valid logins (found in code review 2026-10-06).
func (t *UsersTable) RegisterDevice(ctx context.Context, userID, deviceID, label string, maxDevices int) (allowed bool, devices []Device, err error) {
	for attempt := 0; attempt < maxDeviceWriteRetries; attempt++ {
		user, err := t.Get(ctx, userID)
		if err != nil {
			return false, nil, err
		}
		if user == nil {
			return false, nil, nil
		}
		if !CheckDevice(user.Devices, deviceID, maxDevices) {
			return false, user.Devices, nil
		}
		now := time.Now().UTC()
		updated := TouchOrRegisterDevice(user.Devices, deviceID, label, now)
		wrote, err := t.updateDevicesAtomic(ctx, userID, updated, user.DevicesVersion, nil)
		if err != nil {
			return false, nil, err
		}
		if wrote {
			return true, updated, nil
		}
		// Someone else updated Devices between our read and write — retry
		// from a fresh read rather than overwriting their change.
	}
	return false, nil, fmt.Errorf("could not register device, please try again")
}

// SwapDevice is the DB glue around CanSwapDevice/SwapDevice — the
// self-service "log out other device" action. Same retry-on-race approach
// as RegisterDevice, for the same reason.
func (t *UsersTable) SwapDevice(ctx context.Context, userID, removeDeviceID, newDeviceID, newLabel string) (ok bool, retryAfter time.Duration, err error) {
	for attempt := 0; attempt < maxDeviceWriteRetries; attempt++ {
		user, err := t.Get(ctx, userID)
		if err != nil {
			return false, 0, err
		}
		if user == nil {
			return false, 0, nil
		}
		allowed, wait := CanSwapDevice(user.LastDeviceSwapAt, time.Now().UTC())
		if !allowed {
			return false, wait, nil
		}
		now := time.Now().UTC()
		updated := SwapDevice(user.Devices, removeDeviceID, newDeviceID, newLabel, now)
		wrote, err := t.updateDevicesAtomic(ctx, userID, updated, user.DevicesVersion, &now)
		if err != nil {
			return false, 0, err
		}
		if wrote {
			return true, 0, nil
		}
		// Lost the race — retry from a fresh read (re-checks the cooldown
		// too, in case the other writer was itself a swap).
	}
	return false, 0, fmt.Errorf("could not swap device, please try again")
}

// updateDevicesAtomic writes devices only if DevicesVersion still matches
// expectedVersion (the value just read) — otherwise another request wrote
// first, and it returns wrote=false (not an error) so the caller retries
// from a fresh read instead of blindly overwriting that other write.
func (t *UsersTable) updateDevicesAtomic(ctx context.Context, userID string, devices []Device, expectedVersion int, lastSwapAt *time.Time) (wrote bool, err error) {
	deviceAVs, err := attributevalue.MarshalList(devices)
	if err != nil {
		return false, err
	}
	set := map[string]types.AttributeValue{
		"devices":         &types.AttributeValueMemberL{Value: deviceAVs},
		"devices_version": &types.AttributeValueMemberN{Value: strconv.Itoa(expectedVersion + 1)},
	}
	if lastSwapAt != nil {
		set["last_device_swap_at"] = &types.AttributeValueMemberS{Value: lastSwapAt.UTC().Format(time.RFC3339)}
	}
	condValues := map[string]types.AttributeValue{
		":ev": &types.AttributeValueMemberN{Value: strconv.Itoa(expectedVersion)},
	}
	return t.updateAVConditional(ctx, userID, set, "attribute_not_exists(devices_version) OR devices_version = :ev", condValues)
}
