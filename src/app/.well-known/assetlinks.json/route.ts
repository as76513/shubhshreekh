import { NextResponse } from "next/server";

const PACKAGE_NAME = "com.shubhshreekh.app";

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
