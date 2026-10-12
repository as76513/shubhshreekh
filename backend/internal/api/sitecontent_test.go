package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// --- GET /site-stats — public ---

func TestHandleGetSiteStats_Default(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{Settings: settings}

	req := httptest.NewRequest(http.MethodGet, "/site-stats", nil)
	rec := httptest.NewRecorder()
	d.handleGetSiteStats(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var stats db.SiteStats
	decodeJSON(t, rec, &stats)
	if stats != db.DefaultSiteStats {
		t.Fatalf("stats = %+v, want the untouched default %+v", stats, db.DefaultSiteStats)
	}
}

// --- PATCH /admin/site-stats ---

func TestHandleUpdateSiteStats(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"learners":"60,000+","ideasShared":"3,000+","courses":"50+","avgRating":"4.9★"}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/site-stats", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdateSiteStats)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if settings.siteStats.Learners != "60,000+" || settings.siteStats.AvgRating != "4.9★" {
		t.Fatalf("stored stats = %+v, want the updated values", settings.siteStats)
	}
}

func TestHandleUpdateSiteStats_BlankFieldRejected(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"learners":"60,000+","ideasShared":"","courses":"50+","avgRating":"4.9★"}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/site-stats", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdateSiteStats)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
	if settings.siteStats != db.DefaultSiteStats {
		t.Fatalf("a rejected update must not change the stored stats, got %+v", settings.siteStats)
	}
}

func TestHandleUpdateSiteStats_RequiresAuth(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"learners":"60,000+","ideasShared":"3,000+","courses":"50+","avgRating":"4.9★"}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/site-stats", strings.NewReader(body))
	rec := httptest.NewRecorder()
	d.handleUpdateSiteStats(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", rec.Code, rec.Body)
	}
}

// --- GET /testimonials — public ---

func TestHandleGetTestimonials_Default(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{Settings: settings}

	req := httptest.NewRequest(http.MethodGet, "/testimonials", nil)
	rec := httptest.NewRecorder()
	d.handleGetTestimonials(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var testimonials []db.Testimonial
	decodeJSON(t, rec, &testimonials)
	if len(testimonials) != len(db.DefaultTestimonials) {
		t.Fatalf("testimonials = %+v, want the %d untouched defaults", testimonials, len(db.DefaultTestimonials))
	}
}

// --- PATCH /admin/testimonials ---

func TestHandleUpdateTestimonials_DerivesInitials(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	// No "initials" field in the request at all — the admin form never
	// asks for one; it must be derived server-side from name, not left
	// blank or trusted from the client.
	body := `{"testimonials":[{"name":"Priya Sharma","city":"Pune","text":"Great platform","returns":"+40%"}]}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/testimonials", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdateTestimonials)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if len(settings.testimonials) != 1 || settings.testimonials[0].Initials != "PS" {
		t.Fatalf("testimonials = %+v, want one entry with derived Initials \"PS\"", settings.testimonials)
	}
}

func TestHandleUpdateTestimonials_BlankFieldRejected(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"testimonials":[{"name":"","city":"Pune","text":"Great platform","returns":"+40%"}]}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/testimonials", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdateTestimonials)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}

func TestHandleUpdateTestimonials_EmptyListAllowed(t *testing.T) {
	// The RA deleting every testimonial (e.g. starting a fresh curated
	// list) must be allowed — an empty list is a valid state, not an error.
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"testimonials":[]}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/testimonials", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleUpdateTestimonials)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if len(settings.testimonials) != 0 {
		t.Fatalf("testimonials = %+v, want empty", settings.testimonials)
	}
}

func TestDeriveInitials(t *testing.T) {
	cases := []struct {
		name string
		want string
	}{
		{"Arjun Patel", "AP"},
		{"Cher", "C"},
		{"Mary Jane Watson", "MJ"}, // only the first two words
		{"", ""},
	}
	for _, c := range cases {
		if got := deriveInitials(c.name); got != c.want {
			t.Errorf("deriveInitials(%q) = %q, want %q", c.name, got, c.want)
		}
	}
}
