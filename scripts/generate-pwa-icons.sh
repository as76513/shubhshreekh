#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/public/assets/logo.png"
OUT="$ROOT/public/icons"

mkdir -p "$OUT"

if [[ ! -f "$SRC" ]]; then
  echo "Logo not found at $SRC" >&2
  exit 1
fi

sips -s format png -z 192 192 "$SRC" --out "$OUT/icon-192.png"
sips -s format png -z 512 512 "$SRC" --out "$OUT/icon-512.png"
cp "$OUT/icon-512.png" "$OUT/icon-maskable-512.png"
sips -s format png -z 180 180 "$SRC" --out "$ROOT/public/apple-touch-icon.png"

echo "PWA icons written to public/icons/"
