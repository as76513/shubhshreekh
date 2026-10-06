package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// --- fakes: stub testing per TECH_DEBT.md TD-006/TD-010 — exercise the
// handlers over net/http/httptest without touching MSG91 or real DynamoDB.

type fakeOTPProvider struct {
	sendErr    error
	verifyOK   bool
	verifyErr  error
	sentTo     []string
	verifiedTo []string
}

func (f *fakeOTPProvider) Send(ctx context.Context, phone string) error {
	f.sentTo = append(f.sentTo, phone)
	return f.sendErr
}

func (f *fakeOTPProvider) Verify(ctx context.Context, phone, code string) (bool, error) {
	f.verifiedTo = append(f.verifiedTo, phone)
	return f.verifyOK, f.verifyErr
}

type fakeRateLimiter struct {
	allowSend   bool
	allowVerify bool
	retryAfter  time.Duration

	allowSendCalls   int
	recordSendCalls  int
	allowVerifyCalls int
	failureCalls     int
	successCalls     int
}

func newFakeRateLimiter() *fakeRateLimiter {
	return &fakeRateLimiter{allowSend: true, allowVerify: true}
}

func (f *fakeRateLimiter) AllowSend(ctx context.Context, phone string) (bool, time.Duration, error) {
	f.allowSendCalls++
	return f.allowSend, f.retryAfter, nil
}

func (f *fakeRateLimiter) RecordSend(ctx context.Context, phone string) error {
	f.recordSendCalls++
	return nil
}

func (f *fakeRateLimiter) AllowVerify(ctx context.Context, phone string) (bool, time.Duration, error) {
	f.allowVerifyCalls++
	return f.allowVerify, f.retryAfter, nil
}

func (f *fakeRateLimiter) RecordVerifyFailure(ctx context.Context, phone string) error {
	f.failureCalls++
	return nil
}

func (f *fakeRateLimiter) RecordVerifySuccess(ctx context.Context, phone string) error {
	f.successCalls++
	return nil
}

type fakeUsersStore struct {
	users map[string]*db.User
}

func newFakeUsersStore() *fakeUsersStore {
	return &fakeUsersStore{users: map[string]*db.User{}}
}

func (f *fakeUsersStore) Get(ctx context.Context, userID string) (*db.User, error) {
	return f.users[userID], nil
}

func (f *fakeUsersStore) GetOrCreateByPhone(ctx context.Context, phone, name, email string) (*db.User, error) {
	if u, ok := f.users[phone]; ok {
		return u, nil
	}
	now := time.Now().UTC()
	u := &db.User{
		UserID:       phone,
		PhoneNumber:  "+" + phone,
		Name:         name,
		Email:        email,
		Subscription: "free",
		TrialEndsAt:  now.Add(db.TrialDuration).Format(time.RFC3339), // mirrors db.UsersTable.GetOrCreateByPhone
	}
	f.users[phone] = u
	return u, nil
}

func (f *fakeUsersStore) PutStub(ctx context.Context, userID string) error { return nil }
func (f *fakeUsersStore) SetWebAuthnSession(ctx context.Context, userID, sessionJSON string) error {
	return nil
}
func (f *fakeUsersStore) ClearWebAuthnSession(ctx context.Context, userID string) error { return nil }
func (f *fakeUsersStore) SetWebAuthnCredential(ctx context.Context, userID, credentialJSON string) error {
	return nil
}
func (f *fakeUsersStore) SetVerifiedUntil(ctx context.Context, userID string, until time.Time) error {
	return nil
}

// RegisterDevice/SwapDevice reuse the real pure functions from
// internal/db/devices.go — only the storage (an in-memory map here instead
// of DynamoDB) is faked, so these tests exercise the actual device-limit
// rules, not a reimplementation of them.
func (f *fakeUsersStore) RegisterDevice(ctx context.Context, userID, deviceID, label string) (bool, []db.Device, error) {
	u, ok := f.users[userID]
	if !ok {
		return false, nil, nil
	}
	if !db.CheckDevice(u.Devices, deviceID) {
		return false, u.Devices, nil
	}
	u.Devices = db.TouchOrRegisterDevice(u.Devices, deviceID, label, time.Now().UTC())
	return true, u.Devices, nil
}

func (f *fakeUsersStore) SwapDevice(ctx context.Context, userID, removeDeviceID, newDeviceID, newLabel string) (bool, time.Duration, error) {
	u, ok := f.users[userID]
	if !ok {
		return false, 0, nil
	}
	allowed, wait := db.CanSwapDevice(u.LastDeviceSwapAt, time.Now().UTC())
	if !allowed {
		return false, wait, nil
	}
	now := time.Now().UTC()
	u.Devices = db.SwapDevice(u.Devices, removeDeviceID, newDeviceID, newLabel, now)
	u.LastDeviceSwapAt = now.Format(time.RFC3339)
	return true, 0, nil
}

// testDeps builds a Deps wired entirely to fakes — no AWS, no MSG91.
func testDeps(otpProvider *fakeOTPProvider, limiter *fakeRateLimiter, users *fakeUsersStore) Deps {
	return Deps{
		SigningSecret: []byte("test-signing-secret"),
		Users:         users,
		OTP:           otpProvider,
		RateLimit:     limiter,
	}
}

func decodeJSON(t *testing.T, body *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.NewDecoder(body.Body).Decode(v); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
}

// --- POST /auth/send-otp ---

func TestHandleSendOTP_HappyPath(t *testing.T) {
	otpProvider := &fakeOTPProvider{}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(`{"phone":"9876543210"}`))
	rec := httptest.NewRecorder()
	d.handleSendOTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if len(otpProvider.sentTo) != 1 || otpProvider.sentTo[0] != "919876543210" {
		t.Fatalf("provider.Send calls = %v, want one call for 919876543210", otpProvider.sentTo)
	}
	if limiter.allowSendCalls != 1 || limiter.recordSendCalls != 1 {
		t.Fatalf("rate limiter calls: allowSend=%d recordSend=%d, want 1 and 1", limiter.allowSendCalls, limiter.recordSendCalls)
	}
}

func TestHandleSendOTP_InvalidPhone(t *testing.T) {
	otpProvider := &fakeOTPProvider{}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(`{"phone":"12345"}`))
	rec := httptest.NewRecorder()
	d.handleSendOTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
	if len(otpProvider.sentTo) != 0 {
		t.Fatalf("provider.Send should not be called for an invalid phone")
	}
	if limiter.allowSendCalls != 0 {
		t.Fatalf("rate limiter should not be consulted before phone validation passes")
	}
}

func TestHandleSendOTP_RateLimited(t *testing.T) {
	otpProvider := &fakeOTPProvider{}
	limiter := newFakeRateLimiter()
	limiter.allowSend = false
	limiter.retryAfter = 45 * time.Second
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(`{"phone":"9876543210"}`))
	rec := httptest.NewRecorder()
	d.handleSendOTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429; body = %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Retry-After"); got != "45" {
		t.Fatalf("Retry-After = %q, want 45", got)
	}
	if len(otpProvider.sentTo) != 0 {
		t.Fatalf("provider.Send must not be called once rate-limited — that's the whole point of TD-006")
	}
	if limiter.recordSendCalls != 0 {
		t.Fatalf("RecordSend should not be called when AllowSend already rejected the attempt")
	}
}

func TestHandleSendOTP_TestPhoneBypassesRateLimit(t *testing.T) {
	t.Setenv("OTP_TEST_PHONES", "9999900000")
	otpProvider := &fakeOTPProvider{}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/send-otp", strings.NewReader(`{"phone":"9999900000"}`))
	rec := httptest.NewRecorder()
	d.handleSendOTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if limiter.allowSendCalls != 0 || limiter.recordSendCalls != 0 {
		t.Fatalf("rate limiter should never be consulted for an OTP_TEST_PHONES number, got allowSend=%d recordSend=%d",
			limiter.allowSendCalls, limiter.recordSendCalls)
	}
}

// --- POST /auth/verify-otp ---

func TestHandleVerifyOTP_HappyPath(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: true}
	limiter := newFakeRateLimiter()
	users := newFakeUsersStore()
	d := testDeps(otpProvider, limiter, users)

	body := `{"phone":"9876543210","otp":"223344","first_name":"Amol","last_name":"Shinde","deviceId":"device-1","deviceLabel":"Chrome on Windows"}`
	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(body))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var resp struct {
		Token        string `json:"token"`
		Subscription string `json:"subscription"`
		Name         string `json:"name"`
		UserID       string `json:"userId"`
		Role         string `json:"role"`
	}
	decodeJSON(t, rec, &resp)
	// TD-054: Free tier removed — any logged-in user (trial or paid) is "pro".
	if resp.Token == "" || resp.UserID != "919876543210" || resp.Subscription != "pro" || resp.Role != "customer" {
		t.Fatalf("unexpected response: %+v", resp)
	}
	if resp.Name != "Amol Shinde" {
		t.Fatalf("name = %q, want %q", resp.Name, "Amol Shinde")
	}
	if limiter.successCalls != 1 || limiter.failureCalls != 0 {
		t.Fatalf("rate limiter: successCalls=%d failureCalls=%d, want 1 and 0", limiter.successCalls, limiter.failureCalls)
	}
	if users.users["919876543210"] == nil {
		t.Fatalf("expected a user row to be created for a first-time verify")
	}
}

func TestHandleVerifyOTP_WrongCode(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: false}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"000000"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", rec.Code, rec.Body)
	}
	if limiter.failureCalls != 1 {
		t.Fatalf("RecordVerifyFailure calls = %d, want 1", limiter.failureCalls)
	}
	if limiter.successCalls != 0 {
		t.Fatalf("RecordVerifySuccess must not be called on a wrong code")
	}
}

func TestHandleVerifyOTP_LockedOut(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: true} // would succeed if it were ever called
	limiter := newFakeRateLimiter()
	limiter.allowVerify = false
	limiter.retryAfter = 10 * time.Minute
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"223344"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429; body = %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("Retry-After"); got != "600" {
		t.Fatalf("Retry-After = %q, want 600", got)
	}
	if len(otpProvider.verifiedTo) != 0 {
		t.Fatalf("provider.Verify must not be called while locked out")
	}
}

func TestHandleVerifyOTP_TestPhoneBypassesLockout(t *testing.T) {
	t.Setenv("OTP_TEST_PHONES", "9999900000")
	t.Setenv("OTP_TEST_CODE", "223344")
	otpProvider := &fakeOTPProvider{verifyOK: true}
	limiter := newFakeRateLimiter()
	limiter.allowVerify = false // would reject if consulted
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9999900000","otp":"223344","deviceId":"device-1"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (test phones must bypass lockout); body = %s", rec.Code, rec.Body)
	}
	if limiter.allowVerifyCalls != 0 || limiter.successCalls != 0 || limiter.failureCalls != 0 {
		t.Fatalf("rate limiter should never be consulted for an OTP_TEST_PHONES number")
	}
}

func TestHandleVerifyOTP_ProviderError(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyErr: errors.New("msg91 unreachable")}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"223344"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502", rec.Code)
	}
	if limiter.failureCalls != 0 || limiter.successCalls != 0 {
		t.Fatalf("a provider error is not a wrong code — it must not be recorded as a failed attempt")
	}
}

func TestHandleVerifyOTP_MissingDeviceID(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: true}
	limiter := newFakeRateLimiter()
	d := testDeps(otpProvider, limiter, newFakeUsersStore())

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"223344"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}

func TestHandleVerifyOTP_TrialExpired(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: true}
	limiter := newFakeRateLimiter()
	users := newFakeUsersStore()
	// A returning user whose 7-day trial lapsed with no paid subscription —
	// TD-054's "access revoked entirely," not a reduced/free fallback.
	users.users["919876543210"] = &db.User{
		UserID:       "919876543210",
		Subscription: "free",
		TrialEndsAt:  time.Now().UTC().Add(-time.Hour).Format(time.RFC3339),
	}
	d := testDeps(otpProvider, limiter, users)

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"223344","deviceId":"device-1"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body = %s", rec.Code, rec.Body)
	}
	var resp struct{ Error string }
	decodeJSON(t, rec, &resp)
	if resp.Error != "trial_expired" {
		t.Fatalf("error = %q, want trial_expired", resp.Error)
	}
}

func TestHandleVerifyOTP_DeviceLimitReached(t *testing.T) {
	otpProvider := &fakeOTPProvider{verifyOK: true}
	limiter := newFakeRateLimiter()
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{
		UserID:      "919876543210",
		TrialEndsAt: time.Now().UTC().Add(db.TrialDuration).Format(time.RFC3339),
		Devices: []db.Device{
			{DeviceID: "device-1", Label: "Chrome on Windows", LastActiveAt: time.Now().UTC().Format(time.RFC3339)},
			{DeviceID: "device-2", Label: "Safari on iPhone", LastActiveAt: time.Now().UTC().Format(time.RFC3339)},
		},
	}
	d := testDeps(otpProvider, limiter, users)

	req := httptest.NewRequest(http.MethodPost, "/auth/verify-otp", strings.NewReader(`{"phone":"9876543210","otp":"223344","deviceId":"device-3"}`))
	rec := httptest.NewRecorder()
	d.handleVerifyOTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body = %s", rec.Code, rec.Body)
	}
	var resp struct {
		Error                 string      `json:"error"`
		Devices               []db.Device `json:"devices"`
		DeviceManagementToken string      `json:"deviceManagementToken"`
	}
	decodeJSON(t, rec, &resp)
	if resp.Error != "device_limit_reached" {
		t.Fatalf("error = %q, want device_limit_reached", resp.Error)
	}
	if len(resp.Devices) != 2 {
		t.Fatalf("devices = %+v, want the 2 already-registered devices so the UI can show which to log out", resp.Devices)
	}
	if resp.DeviceManagementToken == "" {
		t.Fatalf("expected a deviceManagementToken to complete the swap with")
	}
}

// --- POST /auth/devices/swap ---

// withBearer runs a handler through the real auth.Middleware (not a fake —
// it's pure/fast, no AWS involved) so these tests exercise actual JWT
// verification + claims extraction, not a stand-in for it.
func withBearer(d Deps, token string, handler http.HandlerFunc) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/auth/devices/swap", strings.NewReader(
		`{"removeDeviceId":"device-1","newDeviceId":"device-3","newDeviceLabel":"Edge on Windows"}`,
	))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	auth.Middleware(d.SigningSecret)(handler).ServeHTTP(rec, req)
	return rec
}

func TestHandleSwapDevice_CompletesLogin(t *testing.T) {
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{
		UserID:      "919876543210",
		TrialEndsAt: time.Now().UTC().Add(db.TrialDuration).Format(time.RFC3339),
		Devices: []db.Device{
			{DeviceID: "device-1", Label: "Chrome on Windows"},
			{DeviceID: "device-2", Label: "Safari on iPhone"},
		},
	}
	d := testDeps(&fakeOTPProvider{}, newFakeRateLimiter(), users)

	swapToken, err := auth.IssueToken(d.SigningSecret, "919876543210", "", deviceSwapRole, deviceSwapTokenTTL)
	if err != nil {
		t.Fatalf("IssueToken: %v", err)
	}

	rec := withBearer(d, swapToken, d.handleSwapDevice)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var resp struct {
		Token        string `json:"token"`
		Subscription string `json:"subscription"`
	}
	decodeJSON(t, rec, &resp)
	if resp.Token == "" || resp.Subscription != "pro" {
		t.Fatalf("unexpected response: %+v", resp)
	}

	got := users.users["919876543210"].Devices
	if len(got) != 2 {
		t.Fatalf("devices after swap = %+v, want exactly 2 (device-1 replaced by device-3)", got)
	}
	for _, dv := range got {
		if dv.DeviceID == "device-1" {
			t.Fatalf("device-1 should have been removed by the swap, got %+v", got)
		}
	}
}

func TestHandleSwapDevice_WrongRole(t *testing.T) {
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{UserID: "919876543210"}
	d := testDeps(&fakeOTPProvider{}, newFakeRateLimiter(), users)

	// A normal session token (role "customer"), not a device-swap token —
	// must not be usable for this narrow, OTP-already-proven action.
	normalToken, err := auth.IssueToken(d.SigningSecret, "919876543210", "pro", "customer", accessTokenTTL)
	if err != nil {
		t.Fatalf("IssueToken: %v", err)
	}

	rec := withBearer(d, normalToken, d.handleSwapDevice)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body = %s", rec.Code, rec.Body)
	}
}

func TestHandleSwapDevice_Cooldown(t *testing.T) {
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{
		UserID:           "919876543210",
		TrialEndsAt:      time.Now().UTC().Add(db.TrialDuration).Format(time.RFC3339),
		Devices:          []db.Device{{DeviceID: "device-1"}, {DeviceID: "device-2"}},
		LastDeviceSwapAt: time.Now().UTC().Format(time.RFC3339), // just swapped a moment ago
	}
	d := testDeps(&fakeOTPProvider{}, newFakeRateLimiter(), users)

	swapToken, err := auth.IssueToken(d.SigningSecret, "919876543210", "", deviceSwapRole, deviceSwapTokenTTL)
	if err != nil {
		t.Fatalf("IssueToken: %v", err)
	}

	rec := withBearer(d, swapToken, d.handleSwapDevice)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429 (cooldown); body = %s", rec.Code, rec.Body)
	}
	if rec.Header().Get("Retry-After") == "" {
		t.Fatalf("expected a Retry-After header")
	}
}

// --- POST /auth/check-phone ---

func TestHandleCheckPhone(t *testing.T) {
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{UserID: "919876543210"}
	d := testDeps(&fakeOTPProvider{}, newFakeRateLimiter(), users)

	existing := httptest.NewRequest(http.MethodPost, "/auth/check-phone", strings.NewReader(`{"phone":"9876543210"}`))
	rec := httptest.NewRecorder()
	d.handleCheckPhone(rec, existing)
	var got struct{ Exists bool }
	decodeJSON(t, rec, &got)
	if !got.Exists {
		t.Fatalf("expected exists=true for a known phone")
	}

	fresh := httptest.NewRequest(http.MethodPost, "/auth/check-phone", strings.NewReader(`{"phone":"9111111111"}`))
	rec = httptest.NewRecorder()
	d.handleCheckPhone(rec, fresh)
	decodeJSON(t, rec, &got)
	if got.Exists {
		t.Fatalf("expected exists=false for an unknown phone")
	}
}
