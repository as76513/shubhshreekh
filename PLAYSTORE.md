# PWA → TWA → Play Store

Status and how-to for the pipeline that turns the Next.js web app into an
installable Android app on Google Play: **PWA** (the installable website)
→ **TWA** (the Android wrapper around it) → **Play Store listing**
(getting that wrapper in front of real users). See also
[build-plan.md](build-plan.md) Phase 6, [TECH_DEBT.md](TECH_DEBT.md)
TD-004/005/012/014, and [android/README.md](android/README.md) (build
mechanics).

**One-line status (8 Oct 2026):** PWA is live and installable. TWA is
built, signed, and verified — not yet wired to the live domain or tested on
a device. Play Store submission itself hasn't started (no developer
account yet).

---

## 1. PWA — done

The web app is already an installable Progressive Web App.

| Piece | File | Status |
|---|---|---|
| Manifest | `src/app/manifest.ts` → served at `/manifest.webmanifest` | Done — name, icons, theme colors, `display: standalone` |
| Service worker | `public/sw.js`, registered by `src/components/PwaRegistrar.tsx` | Done, minimal (TD-043 — shell only, no offline caching strategy yet) |
| Icons | `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Done (TD-044 — maskable icon is a plain copy of the 512 one, not properly padded; cosmetic only) |
| Install prompt / "Add to Home Screen" | Browser-native, no custom code needed | Works on Android Chrome today |

Nothing else is required here for Play Store purposes — the TWA step below
just wraps this already-working PWA.

---

## 2. TWA (Trusted Web Activity) — built, not yet deployed

A TWA is a thin native Android shell that opens the live PWA full-screen,
with no browser address bar. It's **not** a rewrite of the app — it's a
signed Android package (`.apk`/`.aab`) that points at
`https://app.shubhshreeknowledgehub.com`.

### What was built (8 Oct 2026)

No JDK, Android SDK, or Bubblewrap (Google's TWA-generator tool) existed on
this Mac. Rather than permanently installing all of that, the whole
toolchain was built into a **disposable Docker image**
(`android/Dockerfile.build`) — delete it with `docker rmi
shubhshreekh-android-build` any time; nothing it installed lives outside
that container.

Bubblewrap's own interactive setup wizard doesn't work when driven
non-interactively (piped answers get lost), so `android/noninteractive-init.js`
calls the same underlying library Bubblewrap's CLI uses, with fixed values
instead of prompts, reading the **live** manifest directly from
`https://app.shubhshreeknowledgehub.com/manifest.webmanifest`.

Three real bugs had to be fixed along the way (full details in
TECH_DEBT.md TD-012) — in short: this Mac's chip can't run Android's build
tools natively (worked around with emulation), Bubblewrap had a stale check
that rejected a perfectly valid modern Android SDK (worked around), and the
signing-key file initially got created with a password quirk that broke
signing (fixed).

### What exists now, and where

| What | Where | Notes |
|---|---|---|
| Android package name | `com.shubhshreekh.app` | Matches `plan.md`'s existing `assetlinks.json` example |
| Generated Android/Gradle project | `android/` (`app/`, `build.gradle`, `gradlew`, `twa-manifest.json`, …) | Committed to the repo — this is normal source, not a secret |
| Signed test APK | `android/app-release-signed.apk` | Installable directly on a device for testing (gitignored — rebuild from the project if needed, don't rely on this exact file persisting) |
| **Signed AAB (what Play Store actually wants)** | `android/app-release-bundle.aab` | Same signing key as the APK; gitignored |
| **Signing key (secret!)** | `android/android.keystore` + `android/signingKey.properties` | **Back these up outside this repo now** — see warning below |
| Signing cert SHA-256 fingerprint | `D9:EC:76:DE:F8:F1:9A:B2:EF:47:EA:67:76:CC:53:9E:A4:01:10:0A:88:A9:50:28:8D:CD:90:B4:58:D1:B5:43` | Needed by `assetlinks.json` (§3) |

Verified: the APK's signature checks out against the fingerprint above
(`apksigner verify`), and the package contains only `classes.dex` +
resources — no native/CPU-specific code (`.so` files) at all, so there's
no "wrong chip architecture" risk on real devices regardless of how it was
built.

> ⚠️ **`android/android.keystore` and `android/signingKey.properties` are
> real secrets, not sample files.** They're already excluded from git. If
> they're lost, this exact app can never be updated again under the same
> Play Store listing (Google rejects an update that isn't signed with the
> original key) — you'd have to publish as a brand-new listing and lose all
> reviews/installs/history. Copy both files to a password manager or
> encrypted backup **before** doing anything else with this machine or repo.

### What's still pending for the TWA itself

1. **Wire the fingerprint into `assetlinks.json`.** `src/app/.well-known/assetlinks.json/route.ts`
   reads it from the `TWA_SHA256_FINGERPRINT` environment variable (returns
   an empty `[]` until it's set — that's the current live state). Set it
   either:
   - via Terraform (consistent with how every other env var here is
     managed): add `TWA_SHA256_FINGERPRINT = var.twa_sha256_fingerprint` to
     `environment_variables` in `infra/main.tf`'s `aws_amplify_app.site`
     block, declare the variable, `terraform apply` with
     `TF_VAR_twa_sha256_fingerprint="D9:EC:76:…"`; or
   - as a quick one-off: `aws amplify update-app --app-id d2epzyuzlmxrlg
     --environment-variables TWA_SHA256_FINGERPRINT="D9:EC:76:…",...` (must
     include the app's other existing env vars in the same call, or they
     get wiped — the Terraform path avoids that risk).
   - Either way, redeploy, then confirm at
     `https://app.shubhshreeknowledgehub.com/.well-known/assetlinks.json`
     that it lists `com.shubhshreekh.app` with that fingerprint.
2. **Install `app-release-signed.apk` on a real Android device** and
   confirm it opens full-screen with no browser address bar (that only
   works once step 1 is live — Android checks `assetlinks.json` to decide
   whether to trust the TWA).
3. **Later, if/when this app enrolls in Play App Signing** during the Play
   Console upload (Google's recommended default — it re-signs the app with
   its own managed key for distribution), `assetlinks.json` needs to be
   updated again with *that* cert's SHA-256 (shown in Play Console after
   the first upload) — the fingerprint above is only correct for this
   locally-signed build.

---

## 3. Play Store submission — not started

Everything below is still open. Nothing here depends on more coding work
from this session — it's account setup, business/legal details, and Play
Console steps.

| Step | Status | Depends on |
|---|---|---|
| **Org Google Play Developer account + D-U-N-S verification** | **Not started** (TD-014) — biggest schedule risk, since Google's verification has its own turnaround time outside anyone's control | Nothing — start this first |
| Play Billing (or enrolled "billing choice" with PayU) | **Not built** (TD-004) — Play policy requires it for a TWA sold on Play | Play Console app existing |
| Privacy / Terms / Grievance pages | Drafted, but still has `[PENDING]` placeholders for the real SEBI RA Registration No., BASL Membership No., and Grievance Officer name/email (TD-005) | Compliance advisor supplying those facts |
| Store listing (screenshots, short/full description, category) | Not started | Play Console app existing |
| Data safety declaration | Not started | Play Console app existing |
| Finance declaration | Not started | Play Console app existing |
| Upload signed AAB → Internal testing track | AAB is ready (§2); not yet uploaded | Play Console app existing |
| Closed testing | Not started | Internal testing passing |
| Submit for Production review | Not started | Everything above |

### Suggested order

1. Start the **Org Play account + D-U-N-S** today — it has its own lead
   time and blocks every later step.
2. Wire up `assetlinks.json` (§2.4) and confirm the TWA works on a real
   device in parallel — doesn't need the Play account yet.
3. Once the Play Console app exists: upload the AAB to Internal testing,
   fill in the store listing / Data safety / Finance declaration, add
   Play Billing SKUs.
4. Get the real SEBI RA #, BASL membership #, and Grievance Officer
   contact from your compliance advisor and finalize the legal pages.
5. Closed testing → submit for Production.

---

## Quick reference

- **Package name:** `com.shubhshreekh.app`
- **Live manifest:** `https://app.shubhshreeknowledgehub.com/manifest.webmanifest`
- **assetlinks.json (once live):** `https://app.shubhshreeknowledgehub.com/.well-known/assetlinks.json`
- **Signing cert SHA-256:** `D9:EC:76:DE:F8:F1:9A:B2:EF:47:EA:67:76:CC:53:9E:A4:01:10:0A:88:A9:50:28:8D:CD:90:B4:58:D1:B5:43`
- **Keystore + password file:** `android/android.keystore`, `android/signingKey.properties` — **back these up outside the repo**
- **Build it again:** see `android/README.md`'s "Alternative: containerized build" section
