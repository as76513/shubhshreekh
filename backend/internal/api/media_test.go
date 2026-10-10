package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// handleMediaUploadURL checks the contentType/purpose allowlist before ever
// touching d.S3 (building the presign client), so these rejection paths are
// testable without a real/fake S3 client — see media.go's handler.

func TestHandleMediaUploadURL_RejectsDisallowedContentType(t *testing.T) {
	cases := []string{
		"text/html",
		"application/javascript",
		"image/svg+xml", // SVG can carry <script> — deliberately not in the allowlist
		"application/x-sh",
		"",
	}
	for _, ct := range cases {
		t.Run(ct, func(t *testing.T) {
			d := Deps{}
			body := `{"contentType":"` + ct + `","purpose":"overview-photo"}`
			req := httptest.NewRequest(http.MethodPost, "/admin/media/upload-url", strings.NewReader(body))
			rec := httptest.NewRecorder()
			d.handleMediaUploadURL(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 for contentType %q; body = %s", rec.Code, ct, rec.Body)
			}
		})
	}
}

func TestHandleMediaUploadURL_RejectsDisallowedPurpose(t *testing.T) {
	cases := []string{
		"insight-attachment", // not a real purpose — would route into an
		// arbitrary S3 prefix if accepted
		"../../etc",
		"",
	}
	for _, purpose := range cases {
		t.Run(purpose, func(t *testing.T) {
			d := Deps{}
			body := `{"contentType":"image/png","purpose":"` + purpose + `"}`
			req := httptest.NewRequest(http.MethodPost, "/admin/media/upload-url", strings.NewReader(body))
			rec := httptest.NewRecorder()
			d.handleMediaUploadURL(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400 for purpose %q; body = %s", rec.Code, purpose, rec.Body)
			}
		})
	}
}

func TestHandleMediaUploadURL_InvalidBody(t *testing.T) {
	d := Deps{}
	req := httptest.NewRequest(http.MethodPost, "/admin/media/upload-url", strings.NewReader("not json"))
	rec := httptest.NewRecorder()
	d.handleMediaUploadURL(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}
