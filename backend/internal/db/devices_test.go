package db

import (
	"testing"
	"time"
)

func TestHasActiveEntitlement(t *testing.T) {
	now := time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name string
		user User
		want bool
	}{
		{"trial active", User{TrialEndsAt: now.Add(time.Hour).Format(time.RFC3339)}, true},
		{"trial expired, no paid sub", User{TrialEndsAt: now.Add(-time.Hour).Format(time.RFC3339), Subscription: "free"}, false},
		{"trial expired but paid", User{TrialEndsAt: now.Add(-time.Hour).Format(time.RFC3339), Subscription: "pro"}, true},
		{"legacy row (no trial field), not pro", User{Subscription: "free"}, true},
		{"legacy row (no trial field), pro", User{Subscription: "pro"}, true},
		{"unparseable trial timestamp", User{TrialEndsAt: "not-a-date"}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := HasActiveEntitlement(&c.user, now); got != c.want {
				t.Errorf("HasActiveEntitlement(%+v) = %v, want %v", c.user, got, c.want)
			}
		})
	}
}

func TestCheckDevice(t *testing.T) {
	devices := []Device{{DeviceID: "a"}, {DeviceID: "b"}}

	if !CheckDevice(devices, "a") {
		t.Error("an already-registered device should always be allowed")
	}
	if CheckDevice(devices, "c") {
		t.Error("a 3rd unregistered device should be rejected once MaxDevices is reached")
	}
	if !CheckDevice([]Device{{DeviceID: "a"}}, "c") {
		t.Error("a new device should be allowed while there's still a free slot")
	}
}

func TestTouchOrRegisterDevice(t *testing.T) {
	now := time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC)

	// New device appends.
	devices := TouchOrRegisterDevice(nil, "a", "Chrome on Windows", now)
	if len(devices) != 1 || devices[0].DeviceID != "a" {
		t.Fatalf("devices = %+v, want one new device 'a'", devices)
	}

	// Existing device updates in place, doesn't duplicate.
	later := now.Add(time.Hour)
	devices = TouchOrRegisterDevice(devices, "a", "Chrome on Windows", later)
	if len(devices) != 1 {
		t.Fatalf("devices = %+v, want still exactly 1 (touched, not duplicated)", devices)
	}
	if devices[0].LastActiveAt != later.UTC().Format(time.RFC3339) {
		t.Fatalf("LastActiveAt = %q, want updated to %v", devices[0].LastActiveAt, later)
	}
}

func TestSwapDevice(t *testing.T) {
	now := time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC)
	devices := []Device{{DeviceID: "a"}, {DeviceID: "b"}}

	out := SwapDevice(devices, "a", "c", "Edge on Windows", now)
	if len(out) != 2 {
		t.Fatalf("devices after swap = %+v, want exactly 2", out)
	}
	for _, d := range out {
		if d.DeviceID == "a" {
			t.Fatalf("device 'a' should have been removed, got %+v", out)
		}
	}
}

func TestCanSwapDevice(t *testing.T) {
	now := time.Date(2026, 10, 6, 12, 0, 0, 0, time.UTC)

	if ok, _ := CanSwapDevice("", now); !ok {
		t.Error("a never-swapped account (empty lastSwapAt) should always be allowed to swap")
	}

	ok, retryAfter := CanSwapDevice(now.Add(-time.Hour).Format(time.RFC3339), now)
	if ok {
		t.Error("a swap within the cooldown window should be rejected")
	}
	if want := DeviceSwapCooldown - time.Hour; retryAfter != want {
		t.Errorf("retryAfter = %v, want %v", retryAfter, want)
	}

	ok, _ = CanSwapDevice(now.Add(-DeviceSwapCooldown).Format(time.RFC3339), now)
	if !ok {
		t.Error("a swap exactly at the cooldown boundary should be allowed")
	}
}
