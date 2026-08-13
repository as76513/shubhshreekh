package otp

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"sync"
)

// Mock is a local-dev Provider that never sends a real SMS — it logs the
// generated code to stdout and verifies against what it "sent" in memory.
// Used automatically by cmd/server when MSG91_AUTH_KEY isn't set, so the
// full send -> verify -> session flow is buildable and testable before
// MSG91's DLT registration clears (build-plan.md Week 4). Swapping to MSG91
// later is a config change, not a code change — see NewMSG91.
type Mock struct {
	mu    sync.Mutex
	codes map[string]string
}

func NewMock() *Mock {
	return &Mock{codes: make(map[string]string)}
}

func (m *Mock) Send(_ context.Context, phone string) error {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return err
	}
	code := fmt.Sprintf("%06d", n.Int64())

	m.mu.Lock()
	m.codes[phone] = code
	m.mu.Unlock()

	log.Printf("[otp:mock] code for %s is %s (not a real SMS — MSG91_AUTH_KEY not set)", phone, code)
	return nil
}

func (m *Mock) Verify(_ context.Context, phone, code string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	want, ok := m.codes[phone]
	if !ok || want != code {
		return false, nil
	}
	delete(m.codes, phone) // one-time use, same as a real OTP
	return true, nil
}
