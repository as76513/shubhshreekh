#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST_URL="https://app.shubhshreeknowledgehub.com/manifest.webmanifest"

mkdir -p "$ANDROID_DIR"
cd "$ANDROID_DIR"

if command -v bubblewrap >/dev/null 2>&1; then
  BUBBLEWRAP=(bubblewrap)
else
  BUBBLEWRAP=(npx --yes @bubblewrap/cli)
fi

echo "→ Initializing TWA project (interactive — create a signing key when asked)"
"${BUBBLEWRAP[@]}" init --manifest="$MANIFEST_URL"
