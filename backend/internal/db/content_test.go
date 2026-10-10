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
