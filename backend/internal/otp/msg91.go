package otp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// baseURL per MSG91's documented v5 OTP API (docs.msg91.com/otp/sendotp,
// docs.msg91.com/otp-widget/verify-otp). NOT yet tested against a live
// account — DLT registration was still pending when this was written.
// Re-verify the exact response shape (the `type`/`message` fields below)
// against a real call once MSG91_AUTH_KEY is available; MSG91's public
// docs didn't expose a machine-readable schema at the time.
const baseURL = "https://control.msg91.com/api/v5/otp"

type MSG91 struct {
	AuthKey    string
	TemplateID string
	OTPLength  int
	Client     *http.Client
}

func NewMSG91(authKey, templateID string) *MSG91 {
	return &MSG91{
		AuthKey:    authKey,
		TemplateID: templateID,
		OTPLength:  6,
		Client:     http.DefaultClient,
	}
}

type msg91Response struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

func (p *MSG91) Send(ctx context.Context, phone string) error {
	q := url.Values{
		"template_id": {p.TemplateID},
		"mobile":      {phone},
		"otp_length":  {fmt.Sprintf("%d", p.OTPLength)},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"?"+q.Encode(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("authkey", p.AuthKey)

	resp, err := p.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var out msg91Response
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return err
	}
	if out.Type != "success" {
		return fmt.Errorf("msg91 send-otp: %s", out.Message)
	}
	return nil
}

func (p *MSG91) Verify(ctx context.Context, phone, code string) (bool, error) {
	q := url.Values{"mobile": {phone}, "otp": {code}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/verify?"+q.Encode(), nil)
	if err != nil {
		return false, err
	}
	req.Header.Set("authkey", p.AuthKey)

	resp, err := p.Client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var out msg91Response
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return false, err
	}
	return out.Type == "success", nil
}
