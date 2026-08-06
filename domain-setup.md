# Using shubshreekh.com for the Mobile App

A domain doesn't "point at" a mobile app the way it points at a website. Instead it plays **four distinct roles**. Your existing site stays as-is; you add subdomains and a couple of well-known files.

## 1. API subdomain — `api.shubshreekh.com`
Your Flutter app needs a stable, branded endpoint to call.

- Route 53 record → API Gateway (or ALB / your Go server)
- ACM certificate for HTTPS
- App config points at `https://api.shubshreekh.com`

## 2. Cognito custom domain — `auth.shubshreekh.com`
So the hosted login screen shows **your** brand, not `something.auth.us-east-1.amazoncognito.com`.

- Cognito → App integration → Custom domain → `auth.shubshreekh.com`
- Requires an ACM cert in **us-east-1** (Cognito requirement)
- Route 53 alias record to the Cognito CloudFront distribution

## 3. Android App Links (deep linking) — the well-known file
Lets `https://shubshreekh.com/...` links open **directly in the app** instead of a browser (password resets, email verification, share links).

Host this at `https://shubshreekh.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.shubshreekh.app",
    "sha256_cert_fingerprints": ["<YOUR_APP_SIGNING_SHA256>"]
  }
}]
```

Then declare the intent filter in the Flutter Android manifest. (iOS later uses `apple-app-site-association` the same way.)

## 4. Marketing / landing page — `shubshreekh.com`
Your existing website stays as the public face:
- App description + screenshots
- "Get it on Google Play" button → your Play Store listing
- Privacy policy + terms (Play Store **requires** a privacy-policy URL — host it here)

## Summary

| Subdomain / path | Role |
|:---|:---|
| `shubshreekh.com` | Marketing site + privacy policy (required by Play Store) |
| `api.shubshreekh.com` | Backend API the app calls |
| `auth.shubshreekh.com` | Branded Cognito hosted login |
| `shubshreekh.com/.well-known/assetlinks.json` | Android App Links (deep linking) |

All of this fits comfortably in Route 53 + ACM, and the certs are free.
