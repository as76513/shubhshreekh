import { NextResponse } from "next/server";

const PACKAGE_NAME = "com.shubhshreekh.app";

// Fallback for the upload-key SHA-256 (android/android.keystore, alias
// "android") — not a secret, it's meant to be published here, so there's
// no real downside to a hardcoded default. Added 2026-10-10 after
// TWA_SHA256_FINGERPRINT, set correctly at both the Amplify app and branch
// level and confirmed present via `aws amplify get-app`/`get-branch`,
// still never reached this route's process.env at runtime on Amplify's
// WEB_COMPUTE platform — reproduced locally with `next build` + `next
// start` and confirmed the *code* reads env vars correctly there, so the
// gap is specific to Amplify's hosting layer, not this route. Update this
// constant (not just the env var) if the signing key ever changes — e.g.
// once Play App Signing re-signs the app for distribution.
const FALLBACK_SHA256_FINGERPRINT =
  "D9:EC:76:DE:F8:F1:9A:B2:EF:47:EA:67:76:CC:53:9E:A4:01:10:0A:88:A9:50:28:8D:CD:90:B4:58:D1:B5:43";

// Without this, Next.js can statically pre-render this route at build time
// (no cookies/headers/searchParams used, so nothing else forces dynamic
// rendering) and Amplify's build cache can then serve a stale baked-in
// process.env.TWA_SHA256_FINGERPRINT across builds even after the env var
// changes — found 2026-10-10 when two full rebuilds in a row still served
// an empty assetlinks.json after setting the fingerprint.
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprint = process.env.TWA_SHA256_FINGERPRINT?.trim() || FALLBACK_SHA256_FINGERPRINT;

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
