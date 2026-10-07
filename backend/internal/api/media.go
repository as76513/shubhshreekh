package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// allowedUploadTypes caps what the presigned URL can be used for — never
// trust the client's contentType claim beyond this allowlist, since
// whatever we sign here is exactly what S3 will accept.
var allowedUploadTypes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"application/pdf": ".pdf",
}

var allowedUploadPurposes = map[string]bool{
	"overview-photo": true,
	"weekly-pdf":     true,
}

const uploadURLTTL = 10 * time.Minute

type uploadURLRequest struct {
	ContentType string `json:"contentType"`
	Purpose     string `json:"purpose"` // "overview-photo" | "weekly-pdf"
}

type uploadURLResponse struct {
	UploadURL string `json:"uploadUrl"`
	PublicURL string `json:"publicUrl"`
}

// handleMediaUploadURL: POST /admin/media/upload-url — analyst/admin only
// (architecture.md's admin route table). Returns a short-lived presigned
// PUT URL so the RA's browser uploads the photo/PDF directly to S3; the
// binary never passes through this Lambda (avoids its payload limits).
func (d Deps) handleMediaUploadURL(w http.ResponseWriter, r *http.Request) {
	var req uploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ext, ok := allowedUploadTypes[req.ContentType]
	if !ok {
		writeError(w, http.StatusBadRequest, "unsupported content type")
		return
	}
	if !allowedUploadPurposes[req.Purpose] {
		writeError(w, http.StatusBadRequest, "invalid purpose")
		return
	}

	key := fmt.Sprintf("%s/%s%s", req.Purpose, uuid.NewString(), ext)
	presignClient := s3.NewPresignClient(d.S3)
	presigned, err := presignClient.PresignPutObject(r.Context(), &s3.PutObjectInput{
		Bucket:      &d.MediaBucket,
		Key:         &key,
		ContentType: &req.ContentType,
	}, s3.WithPresignExpires(uploadURLTTL))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create upload URL")
		return
	}

	publicURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", d.MediaBucket, d.MediaBucketRegion, key)
	writeJSON(w, http.StatusOK, uploadURLResponse{UploadURL: presigned.URL, PublicURL: publicURL})
}
