# Android test APK (TWA)

Wraps the live PWA at **https://app.shubhshreeknowledgehub.com** in a
full-screen Android app. The APK is a thin shell (~10 MB); UI updates ship when
you deploy the web app — testers do not need a new APK for every UI change.

## One-time setup (on your Mac)

### 1. Install build tools

```bash
# Java 17 (required by Android Gradle)
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Android command-line tools (or install Android Studio)
brew install --cask android-commandlinetools
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

Bubblewrap CLI (global or via npx):

```bash
npm install -g @bubblewrap/cli
# or: npx @bubblewrap/cli <command>
```

### 2. Deploy the PWA first

The manifest and service worker must be live on HTTPS before Bubblewrap can
read them:

1. Merge and deploy this branch to Amplify (`app.shubhshreeknowledgehub.com`).
2. Verify in a browser:
   - https://app.shubhshreeknowledgehub.com/manifest.webmanifest
   - https://app.shubhshreeknowledgehub.com/sw.js

### 3. Generate the Android project (first time only)

From the repo root:

```bash
npm run android:init
```

Suggested answers when prompted:

| Prompt | Value |
|--------|-------|
| Domain | `app.shubhshreeknowledgehub.com` |
| URL path | `/` |
| Application name | `ShubhShreekh` |
| Package name | `com.shubhshreekh.app` |
| Signing key | Create new (save password safely) |

This creates Gradle project files in this `android/` folder and a
`twa-manifest.json`.

### 4. Enable full-screen TWA (no browser bar)

After init, print your signing certificate fingerprint:

```bash
cd android
bubblewrap fingerprint list
```

Copy the **SHA-256** value, then set it in Amplify environment variables:

```
TWA_SHA256_FINGERPRINT=<paste-sha256-here>
```

Redeploy the frontend. Verify:

https://app.shubhshreeknowledgehub.com/.well-known/assetlinks.json

It should list `com.shubhshreekh.app` with your fingerprint.

## Build the APK

```bash
npm run android:build
```

Output APK (signed release):

```
android/app/build/outputs/apk/release/app-release-signed.apk
```

For a quick local debug build:

```bash
cd android && bubblewrap build --mode debug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Share with testers (WhatsApp / email)

1. Upload `app-release-signed.apk` to Google Drive (or send directly if &lt; 25 MB).
2. Message testers:

   > Install ShubhShreekh test app: [Drive link]
   > After download: Settings → Security → allow install from Files/WhatsApp → tap APK → Install.
   > Needs internet; app loads from our server.

3. **iPhone testers** cannot use APK — send them the web link instead.

## Updating the APK

| Change | New APK needed? |
|--------|-----------------|
| UI / content / API (web deploy) | No |
| App name, icon, package ID | Yes — `bubblewrap update` then rebuild |
| New signing key | Yes + update `TWA_SHA256_FINGERPRINT` |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| URL bar visible at top | Deploy `assetlinks.json` with correct SHA-256 |
| "App not installed" | Uninstall old test build; check Android version ≥ 7 |
| Blank white screen | Device needs internet; check Amplify URL loads in Chrome |
| `bubblewrap init` fails | Confirm manifest URL returns JSON over HTTPS |

## Play Store (later)

Use the same project: `bubblewrap build` also produces an AAB for Play Console
internal testing — see `build-plan.md` Phase 6.
