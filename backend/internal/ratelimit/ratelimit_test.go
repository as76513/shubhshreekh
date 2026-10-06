package ratelimit

import (
	"testing"
	"time"
)

func TestCheckSend_Cooldown(t *testing.T) {
	lim := Limits{SendCooldown: time.Minute, SendDailyCap: 100}
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)

	rec := Record{LastSentAt: now.Add(-30 * time.Second)}
	ok, retryAfter := CheckSend(rec, now, lim)
	if ok {
		t.Fatalf("expected cooldown to block a send 30s after the last one")
	}
	if retryAfter != 30*time.Second {
		t.Fatalf("retryAfter = %v, want 30s", retryAfter)
	}

	rec = Record{LastSentAt: now.Add(-60 * time.Second)}
	ok, _ = CheckSend(rec, now, lim)
	if !ok {
		t.Fatalf("expected a send exactly at the cooldown boundary to be allowed")
	}
}

func TestCheckSend_DailyCap(t *testing.T) {
	lim := Limits{SendCooldown: time.Second, SendDailyCap: 3}
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)

	rec := Record{LastSentAt: now.Add(-time.Hour), SendCount: 2}
	ok, _ := CheckSend(rec, now, lim)
	if !ok {
		t.Fatalf("expected send 3 of 3 to be allowed")
	}

	rec = Record{LastSentAt: now.Add(-time.Hour), SendCount: 3}
	ok, _ = CheckSend(rec, now, lim)
	if ok {
		t.Fatalf("expected send to be blocked once SendCount reaches the cap")
	}
}

func TestRecordSend(t *testing.T) {
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)
	rec := RecordSend(Record{SendCount: 1}, now)
	if rec.SendCount != 2 {
		t.Fatalf("SendCount = %d, want 2", rec.SendCount)
	}
	if !rec.LastSentAt.Equal(now) {
		t.Fatalf("LastSentAt = %v, want %v", rec.LastSentAt, now)
	}
}

func TestCheckVerify_Lockout(t *testing.T) {
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)

	rec := Record{LockedUntil: now.Add(5 * time.Minute)}
	ok, retryAfter := CheckVerify(rec, now)
	if ok {
		t.Fatalf("expected a verify attempt to be blocked while locked out")
	}
	if retryAfter != 5*time.Minute {
		t.Fatalf("retryAfter = %v, want 5m", retryAfter)
	}

	rec = Record{LockedUntil: now.Add(-time.Second)}
	ok, _ = CheckVerify(rec, now)
	if !ok {
		t.Fatalf("expected a verify attempt to be allowed once LockedUntil has passed")
	}

	ok, _ = CheckVerify(Record{}, now)
	if !ok {
		t.Fatalf("expected a fresh (never-locked) record to allow verify")
	}
}

func TestRecordVerifyFailure_TriggersLockout(t *testing.T) {
	lim := Limits{VerifyMaxAttempts: 3, VerifyLockout: 15 * time.Minute}
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)

	rec := Record{}
	rec = RecordVerifyFailure(rec, now, lim)
	if rec.VerifyFailures != 1 || !rec.LockedUntil.IsZero() {
		t.Fatalf("after 1st failure: got %+v, want failures=1, not locked", rec)
	}
	rec = RecordVerifyFailure(rec, now, lim)
	if rec.VerifyFailures != 2 || !rec.LockedUntil.IsZero() {
		t.Fatalf("after 2nd failure: got %+v, want failures=2, not locked", rec)
	}
	rec = RecordVerifyFailure(rec, now, lim)
	if rec.VerifyFailures != 3 {
		t.Fatalf("after 3rd failure: VerifyFailures = %d, want 3", rec.VerifyFailures)
	}
	if rec.LockedUntil.IsZero() {
		t.Fatalf("expected lockout to start once VerifyFailures reaches VerifyMaxAttempts")
	}
	if want := now.Add(15 * time.Minute); !rec.LockedUntil.Equal(want) {
		t.Fatalf("LockedUntil = %v, want %v", rec.LockedUntil, want)
	}
}

func TestRecordVerifySuccess_ClearsState(t *testing.T) {
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)
	rec := Record{VerifyFailures: 4, LockedUntil: now.Add(time.Minute)}
	rec = RecordVerifySuccess(rec)
	if rec.VerifyFailures != 0 {
		t.Fatalf("VerifyFailures = %d, want 0", rec.VerifyFailures)
	}
	if !rec.LockedUntil.IsZero() {
		t.Fatalf("LockedUntil = %v, want zero", rec.LockedUntil)
	}
}

func TestDefaultLimits(t *testing.T) {
	lim := DefaultLimits()
	if lim.SendCooldown != DefaultSendCooldown ||
		lim.SendDailyCap != DefaultSendDailyCap ||
		lim.VerifyMaxAttempts != DefaultVerifyMaxAttempts ||
		lim.VerifyLockout != DefaultVerifyLockout {
		t.Fatalf("DefaultLimits() = %+v, want the Default* constants", lim)
	}
}
