package db

import (
	"errors"
	"testing"
)

func intPtr(i int) *int { return &i }

func TestResolveTargetHitIndex(t *testing.T) {
	equityTargets := []float64{3200}
	fnoTargets := []float64{24500, 24700, 24900}

	cases := []struct {
		name    string
		targets []float64
		idx     *int
		want    int
		wantErr error
	}{
		{"nil index defaults to T1 (equity)", equityTargets, nil, 0, nil},
		{"nil index defaults to T1 (fno)", fnoTargets, nil, 0, nil},
		{"explicit T1", fnoTargets, intPtr(0), 0, nil},
		{"explicit T2", fnoTargets, intPtr(1), 1, nil},
		{"explicit T3", fnoTargets, intPtr(2), 2, nil},
		{"equity index 1 out of range (only 1 target)", equityTargets, intPtr(1), 0, ErrTargetIndexOutOfRange},
		{"fno index 3 out of range (only 3 targets, 0-2 valid)", fnoTargets, intPtr(3), 0, ErrTargetIndexOutOfRange},
		{"negative index rejected", fnoTargets, intPtr(-1), 0, ErrTargetIndexOutOfRange},
		{"no targets at all", nil, nil, 0, ErrTargetIndexOutOfRange},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := ResolveTargetHitIndex(c.targets, c.idx)
			if c.wantErr != nil {
				if !errors.Is(err, c.wantErr) {
					t.Fatalf("err = %v, want %v", err, c.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != c.want {
				t.Fatalf("index = %d, want %d", got, c.want)
			}
		})
	}
}

func TestStampTargetHitKeepsEarlierLevels(t *testing.T) {
	first := StampTargetHit(nil, 3, 0, "2026-10-13T09:15:00Z")
	if len(first) != 3 || first[0] == "" || first[1] != "" || first[2] != "" {
		t.Fatalf("after T1 = %#v", first)
	}
	second := StampTargetHit(first, 3, 1, "2026-10-13T10:40:00Z")
	if second[0] != first[0] || second[1] == "" || second[2] != "" {
		t.Fatalf("after T2 = %#v, T1 clock must survive", second)
	}
	again := StampTargetHit(second, 3, 0, "2026-10-13T11:00:00Z")
	if again[0] != first[0] {
		t.Fatalf("re-marking T1 overwrote %q with %q", first[0], again[0])
	}
	if HighestHitIndex(again, 0) != 1 {
		t.Fatalf("highest = %d, want 1", HighestHitIndex(again, 0))
	}
}
