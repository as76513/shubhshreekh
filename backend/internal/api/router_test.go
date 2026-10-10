package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// adminRoute is one of router.go's requireRole("analyst","admin")-gated
// endpoints. These table-driven tests exercise the full router (not a
// handler in isolation) specifically because the bug class this guards
// against — a route accidentally left reachable by the wrong role, or by
// TD-054's narrow-purpose deviceSwapRole token — lives in router.go's
// wiring, not in any one handler.
type adminRoute struct {
	method string
	path   string
	body   string
}

func adminRoutes(insightID string) []adminRoute {
	return []adminRoute{
		{http.MethodGet, "/admin/insights", ""},
		{http.MethodPost, "/admin/insights", `{"instrumentType":"equity","targets":[100]}`},
		{http.MethodPatch, "/admin/insights/" + insightID, `{"instrumentType":"equity","targets":[100]}`},
		{http.MethodPost, "/admin/insights/" + insightID + "/publish", ""},
		{http.MethodPost, "/admin/insights/" + insightID + "/archive", ""},
		{http.MethodPost, "/admin/insights/" + insightID + "/close", `{"outcome":"sl_hit"}`},
		{http.MethodPatch, "/admin/pricing", `{"discountPercent":50}`},
		{http.MethodPost, "/admin/overview", `{"text":"today's update"}`},
		{http.MethodPatch, "/admin/weekly-pdf", `{"title":"Week 1","pdfUrl":"https://bucket.s3.ap-south-1.amazonaws.com/weekly-pdf/a.pdf"}`},
		{http.MethodPost, "/admin/media/upload-url", `{"contentType":"image/png","purpose":"overview-photo"}`},
	}
}

func newTestRouter(t *testing.T) (http.Handler, *fakeContentStore, string) {
	t.Helper()
	users := newFakeUsersStore()
	users.users["919876543210"] = &db.User{UserID: "919876543210", TrialEndsAt: time.Now().UTC().Add(db.TrialDuration).Format(time.RFC3339)}
	content := newFakeContentStore()
	settings := newFakeSettingsStore()
	insight, err := content.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "equity", Targets: []float64{100}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	deps := Deps{
		SigningSecret: testSigningSecret,
		Users:         users,
		Content:       content,
		Settings:      settings,
	}
	return NewRouter(deps), content, insight.ID
}

func doRequest(t *testing.T, router http.Handler, rt adminRoute, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(rt.method, rt.path, strings.NewReader(rt.body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// Every /admin/* route must reject a role that isn't analyst/admin — this
// is the core authz-bypass check: a customer, a compliance reviewer
// (deliberately read-only, see roles.go), and TD-054's short-lived
// deviceSwapRole token (history of being usable on routes it was never
// meant to reach) must all get 403, never through to the handler.
func TestAdminRoutes_RejectNonWriterRoles(t *testing.T) {
	router, _, insightID := newTestRouter(t)

	for _, role := range []string{"customer", "compliance", deviceSwapRole} {
		for _, rt := range adminRoutes(insightID) {
			t.Run(role+" "+rt.method+" "+rt.path, func(t *testing.T) {
				token, err := auth.IssueToken(testSigningSecret, "919876543210", "pro", role, time.Hour)
				if err != nil {
					t.Fatalf("IssueToken: %v", err)
				}
				rec := doRequest(t, router, rt, token)
				if rec.Code != http.StatusForbidden {
					t.Fatalf("role %q on %s %s: status = %d, want 403; body = %s", role, rt.method, rt.path, rec.Code, rec.Body)
				}
			})
		}
	}
}

// No Authorization header at all must 401, not 403/500 — confirms every
// admin route actually sits behind auth.Middleware before requireRole runs.
func TestAdminRoutes_RejectMissingToken(t *testing.T) {
	router, _, insightID := newTestRouter(t)

	for _, rt := range adminRoutes(insightID) {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			rec := doRequest(t, router, rt, "")
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want 401; body = %s", rec.Code, rec.Body)
			}
		})
	}
}

// Sanity check in the other direction: analyst and admin roles must still
// be able to reach every admin route — otherwise the rejection tests above
// would be trivially "passing" against a router that blocks everyone.
func TestAdminRoutes_AllowWriterRoles(t *testing.T) {
	for _, role := range []string{"analyst", "admin"} {
		t.Run(role, func(t *testing.T) {
			router, _, insightID := newTestRouter(t)
			token, err := auth.IssueToken(testSigningSecret, "919876543210", "pro", role, time.Hour)
			if err != nil {
				t.Fatalf("IssueToken: %v", err)
			}
			for _, rt := range adminRoutes(insightID) {
				// /admin/media/upload-url needs a real S3 client past the
				// role gate (deps.S3 is nil in this fake-only test setup);
				// its allowlist/rejection behavior is covered on its own in
				// media_test.go, and its role-gating is already covered by
				// TestAdminRoutes_RejectNonWriterRoles/RejectMissingToken
				// above, so it's excluded from this positive-path check.
				if strings.Contains(rt.path, "media") {
					continue
				}
				rec := doRequest(t, router, rt, token)
				if rec.Code == http.StatusForbidden || rec.Code == http.StatusUnauthorized {
					t.Errorf("role %q on %s %s: status = %d, want past the role gate; body = %s", role, rt.method, rt.path, rec.Code, rec.Body)
				}
			}
		})
	}
}

// TD-054's deviceSwapRole token is scoped to /auth/devices/swap only — the
// customer-facing TD-057/058 reads must reject it too, same bug class
// auth_test.go already covers for /me and /insights.
func TestDeviceSwapToken_RejectedByOverviewAndWeeklyPDF(t *testing.T) {
	router, _, _ := newTestRouter(t)
	swapToken, err := auth.IssueToken(testSigningSecret, "919876543210", "", deviceSwapRole, deviceSwapTokenTTL)
	if err != nil {
		t.Fatalf("IssueToken: %v", err)
	}
	for _, path := range []string{"/overview/latest", "/overview", "/weekly-pdf"} {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			req.Header.Set("Authorization", "Bearer "+swapToken)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)
			if rec.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want 403 — a device-swap token must not work on %s; body = %s", rec.Code, path, rec.Body)
			}
		})
	}
}
