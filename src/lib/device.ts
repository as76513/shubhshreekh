// Device identity for the 2-device anti-piracy login cap (TD-054). Purely
// client-generated and client-unforgeable-proof-of-nothing — the server
// never trusts a deviceId as identity, only as a slot key once a session
// is already OTP-verified. Losing/clearing localStorage just means this
// device looks "new" next login, which correctly costs it a device slot
// again rather than silently granting a 3rd one.

const DEVICE_ID_KEY = "shubhshreekh.deviceId.v1";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Best-effort "Chrome on Windows" style label so a user can recognize which device is which when freeing up a slot. */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "Mac"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : "device";
  return `${browser} on ${os}`;
}
