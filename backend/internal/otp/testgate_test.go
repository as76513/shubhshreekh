package otp

import (
	"context"
	"testing"
)

func TestParseTestPhones(t *testing.T) {
	got := ParseTestPhones("9876543210, +91 9811111111, bad, 919822222222")
	if len(got) != 3 {
		t.Fatalf("want 3 phones, got %d: %#v", len(got), got)
	}
	for _, want := range []string{"919876543210", "919811111111", "919822222222"} {
		if _, ok := got[want]; !ok {
			t.Errorf("missing %s", want)
		}
	}
}

func TestGateTestPhone(t *testing.T) {
	g := NewGate(nil, "9876543210", "654321").(*Gate)

	if err := g.Send(context.Background(), "919876543210"); err != nil {
		t.Fatalf("Send test phone: %v", err)
	}
	ok, err := g.Verify(context.Background(), "919876543210", "654321")
	if err != nil || !ok {
		t.Fatalf("Verify want ok, got ok=%v err=%v", ok, err)
	}
	ok, err = g.Verify(context.Background(), "919876543210", "000000")
	if err != nil || ok {
		t.Fatalf("Verify wrong code want false, got ok=%v err=%v", ok, err)
	}
}

func TestGateNonTestWithoutInner(t *testing.T) {
	g := NewGate(nil, "9876543210", "123456").(*Gate)
	if err := g.Send(context.Background(), "919900000000"); err == nil {
		t.Fatal("expected error for non-test phone without Inner")
	}
}

type stubProvider struct {
	sent   string
	verify bool
}

func (s *stubProvider) Send(_ context.Context, phone string) error {
	s.sent = phone
	return nil
}

func (s *stubProvider) Verify(_ context.Context, phone, code string) (bool, error) {
	return s.verify && phone != "" && code != "", nil
}

func TestGateDelegatesToInner(t *testing.T) {
	stub := &stubProvider{verify: true}
	p := NewGate(stub, "9876543210", "123456")

	if err := p.Send(context.Background(), "919900000000"); err != nil {
		t.Fatal(err)
	}
	if stub.sent != "919900000000" {
		t.Fatalf("inner not called, sent=%q", stub.sent)
	}
	ok, err := p.Verify(context.Background(), "919900000000", "111111")
	if err != nil || !ok {
		t.Fatalf("inner verify: ok=%v err=%v", ok, err)
	}
}

func TestNewGateEmptyPhonesReturnsInner(t *testing.T) {
	stub := &stubProvider{}
	p := NewGate(stub, "", "123456")
	if p != stub {
		t.Fatal("empty phones should return inner unchanged")
	}
}
