#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST_URL="https://app.shubhshreeknowledgehub.com/manifest.webmanifest"

if [[ ! -d "$ANDROID_DIR" ]]; then
  mkdir -p "$ANDROID_DIR"
fi

if [[ ! -f "$ANDROID_DIR/twa-manifest.json" ]]; then
  echo "→ First-time setup: generating TWA project from $MANIFEST_URL"
  echo "  (Deploy the PWA to Amplify first if this URL is not live yet.)"
  echo ""
  cd "$ANDROID_DIR"
  bubblewrap init --manifest="$MANIFEST_URL"
else
  echo "→ twa-manifest.json exists; run 'bubblewrap update' manually if the web manifest changed."
fi

cd "$ANDROID_DIR"
bubblewrap build

APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release-signed.apk"
if [[ -f "$APK" ]]; then
  echo ""
  echo "✓ Release APK ready:"
  echo "  $APK"
  ls -lh "$APK"
else
  echo "Build finished; check android/app/build/outputs/apk/ for APK files."
fi
