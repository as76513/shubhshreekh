// One-off, non-interactive replacement for `bubblewrap init`'s inquirer
// wizard (TD-012) — same @bubblewrap/core calls the CLI itself makes
// (see cmds/init.js), just driven with fixed values instead of prompts so
// it can run inside a disposable container with no TTY. Safe to delete
// once android/twa-manifest.json + the Gradle project exist; re-run only
// if the project needs regenerating from scratch.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const {
  TwaManifest,
  TwaGenerator,
  JdkHelper,
  KeyTool,
  ConsoleLog,
  BufferedLog,
} = require("@bubblewrap/core");

const MANIFEST_URL = "https://app.shubhshreeknowledgehub.com/manifest.webmanifest";
const PACKAGE_ID = "com.shubhshreekh.app"; // matches plan.md's assetlinks.json example + android/README.md
const APP_NAME = "ShubhShreekh";

async function main() {
  const targetDirectory = process.cwd(); // /work, bind-mounted to android/ on the host

  let twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);
  twaManifest.packageId = PACKAGE_ID;
  twaManifest.name = APP_NAME;
  twaManifest.launcherName = APP_NAME; // must be <=12 chars; "ShubhShreekh" is exactly 12
  twaManifest.appVersionCode = 1;
  twaManifest.appVersionName = "1";
  twaManifest.signingKey.path = path.join(targetDirectory, "android.keystore");
  twaManifest.signingKey.alias = "android";

  const twaGenerator = new TwaGenerator();
  const log = new BufferedLog(new ConsoleLog("Generating TWA"));
  await twaGenerator.createTwaProject(targetDirectory, twaManifest, log);
  log.flush();

  await twaManifest.saveToFile(path.join(targetDirectory, "twa-manifest.json"));

  const config = {
    jdkPath: "/usr/lib/jvm/java-17-openjdk-arm64",
    androidSdkPath: "/opt/android-sdk",
  };
  const jdkHelper = new JdkHelper(process, config);
  const keytool = new KeyTool(jdkHelper);

  // PKCS12 keystores (keytool's default since JDK 9+) don't support a
  // separate key password — keytool silently ignores a distinct -keypass
  // and encrypts the key with the store password alone. Using two
  // different random passwords here looks fine at creation time but then
  // fails apksigner later with "Wrong password?" on the key (found via
  // bubblewrap build), so store and key password must be identical.
  const storePassword = crypto.randomBytes(18).toString("base64url");
  const keyPassword = storePassword;

  await keytool.createSigningKey({
    fullName: "Shubhshree Knowledge Hub Private Limited",
    organizationalUnit: "ShubhShreekh",
    organization: "Shubhshree Knowledge Hub Private Limited",
    country: "IN",
    password: storePassword,
    keypassword: keyPassword,
    alias: twaManifest.signingKey.alias,
    path: twaManifest.signingKey.path,
  });

  // Matches the filename already reserved in the root .gitignore
  // (/android/signingKey.properties) — never commit this file.
  const propsPath = path.join(targetDirectory, "signingKey.properties");
  fs.writeFileSync(
    propsPath,
    `storeFile=android.keystore\nstorePassword=${storePassword}\nkeyAlias=${twaManifest.signingKey.alias}\nkeyPassword=${keyPassword}\n`,
    { mode: 0o600 },
  );

  console.log("DONE: twa-manifest.json, Gradle project, android.keystore, signingKey.properties written to " + targetDirectory);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
