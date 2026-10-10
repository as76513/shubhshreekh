package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// --- POST /admin/overview ---

func TestHandleCreateOverview_HappyPath(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"text":"Markets closed flat today.","photoUrls":["https://bucket.s3.ap-south-1.amazonaws.com/overview-photo/a.jpg"]}`
	req := httptest.NewRequest(http.MethodPost, "/admin/overview", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleCreateOverview)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body = %s", rec.Code, rec.Body)
	}
	if len(store.overviews) != 1 {
		t.Fatalf("expected one overview posted, got %d", len(store.overviews))
	}
}

func TestHandleCreateOverview_BlankTextRejected(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"text":"   "}`
	req := httptest.NewRequest(http.MethodPost, "/admin/overview", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleCreateOverview)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}

// A non-https photo URL (e.g. a "javascript:" URI) must never be accepted —
// the admin's own browser is still client input (architecture.md's "never
// trust the client... not just customers'"), and this value is rendered
// back to every customer's Dashboard/Blogs page.
func TestHandleCreateOverview_RejectsNonHTTPSPhotoURL(t *testing.T) {
	cases := []string{
		"javascript:alert(1)",
		"http://insecure.example.com/a.jpg",
		"data:text/html,<script>alert(1)</script>",
		"",
	}
	for _, photoURL := range cases {
		t.Run(photoURL, func(t *testing.T) {
			store := newFakeContentStore()
			d := Deps{SigningSecret: testSigningSecret, Content: store}

			body := `{"text":"update","photoUrls":["` + photoURL + `"]}`
			req := httptest.NewRequest(http.MethodPost, "/admin/overview", strings.NewReader(body))
			rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleCreateOverview)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 for photoUrl %q; body = %s", rec.Code, photoURL, rec.Body)
			}
			if len(store.overviews) != 0 {
				t.Fatalf("a rejected photoUrl must never reach the store")
			}
		})
	}
}

// --- GET /overview/latest ---

func TestHandleGetLatestOverview_Empty(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{Content: store}

	req := httptest.NewRequest(http.MethodGet, "/overview/latest", nil)
	rec := httptest.NewRecorder()
	d.handleGetLatestOverview(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (null, not an error, when nothing's posted yet); body = %s", rec.Code, rec.Body)
	}
	if strings.TrimSpace(rec.Body.String()) != "null" {
		t.Fatalf("body = %q, want null", rec.Body.String())
	}
}

// --- PATCH /admin/weekly-pdf ---

func TestHandleSetWeeklyPDF_RejectsNonHTTPSURL(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"title":"Week 42","summary":"...","pdfUrl":"javascript:alert(1)"}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/weekly-pdf", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleSetWeeklyPDF)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
	if settings.weeklyPDF.PdfURL != "" {
		t.Fatalf("a rejected pdfUrl must never be stored, got %q", settings.weeklyPDF.PdfURL)
	}
}

func TestHandleSetWeeklyPDF_HappyPath(t *testing.T) {
	settings := newFakeSettingsStore()
	d := Deps{SigningSecret: testSigningSecret, Settings: settings}

	body := `{"title":"Week 42","summary":"A quiet week.","pdfUrl":"https://bucket.s3.ap-south-1.amazonaws.com/weekly-pdf/a.pdf"}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/weekly-pdf", strings.NewReader(body))
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handleSetWeeklyPDF)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if settings.weeklyPDF.Title != "Week 42" {
		t.Fatalf("title = %q, want %q", settings.weeklyPDF.Title, "Week 42")
	}
}
