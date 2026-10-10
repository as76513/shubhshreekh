import { NextResponse } from "next/server";

const PACKAGE_NAME = "com.shubhshreekh.app";

// Without this, Next.js can statically pre-render this route at build time
// (no cookies/headers/searchParams used, so nothing else forces dynamic
// rendering) and Amplify's build cache can then serve a stale baked-in
// process.env.TWA_SHA256_FINGERPRINT across builds even after the env var
// changes — found 2026-10-10 when two full rebuilds in a row still served
// an empty assetlinks.json after setting the fingerprint.
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprint = process.env.TWA_SHA256_FINGERPRINT?.trim();

  if (!fingerprint) {
    return NextResponse.json([], {
      headers: { "Content-Type": "application/json" },
    });
  }

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
