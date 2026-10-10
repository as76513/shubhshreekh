package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// --- GET /pricing — public ---

func TestHandleGetPricing(t *testing.T) {
	settings := newFakeSettingsStore()
	settings.discountPercent = 50
	d := Deps{Settings: settings}

	req := httptest.NewRequest(http.MethodGet, "/pricing", nil)
	rec := httptest.NewRecorder()
	d.handleGetPricing(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var resp pricingResponse
	decodeJSON(t, rec, &resp)
	if resp.DiscountPercent != 50 {
		t.Fatalf("discountPercent = %v, want 50", resp.DiscountPercent)
	}
	if len(resp.Plans) != 3 {
		t.Fatalf("plans = %+v, want 3 (monthly/quarterly/annual)", resp.Plans)
	}
	for _, p := range resp.Plans {
		if want := p.AnchorPrice / 2; p.DiscountedPrice != want {
			t.Errorf("plan %s: discountedPrice = %v, want %v (50%% off anchor)", p.ID, p.DiscountedPrice, want)
		}
	}
}

// --- PATCH /admin/pricing — the discount floor/ceiling (TD-055/060) ---

func TestHandleUpdatePricing_FloorAndCeiling(t *testing.T) {
	cases := []struct {
		name    string
		pct     string
		wantErr bool
	}{
		{"just below floor rejected", "24.9", true},
		{"at floor accepted", "25", false},
		{"typical festive discount accepted", "60", false},
		{"just below ceiling accepted", "99.9", false},
		{"at ceiling rejected", "100", true},
		{"above ceiling rejected", "150", true},
		{"negative rejected", "-10", true},
		{"zero rejected (no clean way to disable, TD-061)", "0", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			settings := newFakeSettingsStore()
			d := Deps{SigningSecret: testSigningSecret, Settings: settings}

			body := `{"discountPercent":` + c.pct + `}`
			req := httptest.NewRequest(http.MethodPatch, "/admin/pricing", strings.NewReader(body))
			rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdatePricing)

			if c.wantErr {
				if rec.Code != http.StatusBadRequest {
					t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
				}
				if settings.discountPercent != 50 { // DefaultDiscountPercent, untouched
					t.Fatalf("a rejected update must not change the stored discount, got %v", settings.discountPercent)
				}
			} else if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
			}
		})
	}
}

func TestHandleUpdatePricing_RequiresAuth(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	// No Authorization header at all, calling the handler directly
	// (router-level role-gating is covered separately in router_test.go) —
	// this exercises the handler's own auth.FromContext guard.
	req := httptest.NewRequest(http.MethodPatch, "/admin/pricing", strings.NewReader(`{"discountPercent":50}`))
	rec := httptest.NewRecorder()
	d.handleUpdatePricing(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", rec.Code, rec.Body)
	}
}
