// Biometric/PIN unlock, built on the browser's WebAuthn API — the same
// mechanism behind Face ID / fingerprint / device-PIN "passkey" prompts.
// The backend (see backend/internal/api/webauthn.go) is the Relying Party;
// this file only converts between its JSON (base64url strings, per the
// WebAuthn JSON serialization convention) and the ArrayBuffers
// navigator.credentials actually wants — no secret ever lives here, the
// private key never leaves the device's secure hardware.
import {
  webauthnRegisterBegin,
  webauthnRegisterFinish,
  refreshBegin,
  refreshFinish,
} from "@/lib/api";

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type JSONObject = Record<string, unknown>;

function decodeCredentialDescriptor(desc: JSONObject): PublicKeyCredentialDescriptor {
  return {
    ...desc,
    id: base64urlToBuffer(desc.id as string),
  } as PublicKeyCredentialDescriptor;
}

/** Can this device even show a biometric/PIN prompt? Call before offering the feature. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * One-time setup, right after a full OTP login: registers this device's
 * biometric/PIN as a WebAuthn credential so future app opens (within the
 * server's 7-day re-verification window) can skip OTP. Returns false
 * (never throws) on anything short of success, since this is an optional
 * convenience step, not a required part of login.
 */
export async function registerPasskey(accessToken: string): Promise<boolean> {
  try {
    const options = (await webauthnRegisterBegin(accessToken)) as {
      publicKey: JSONObject & {
        challenge: string;
        user: JSONObject & { id: string };
        excludeCredentials?: JSONObject[];
      };
    };
    const publicKey = options.publicKey;

    const creationOptions: CredentialCreationOptions = {
      publicKey: {
        ...publicKey,
        challenge: base64urlToBuffer(publicKey.challenge),
        user: { ...publicKey.user, id: base64urlToBuffer(publicKey.user.id) },
        excludeCredentials: publicKey.excludeCredentials?.map(decodeCredentialDescriptor),
      } as PublicKeyCredentialCreationOptions,
    };

    const credential = (await navigator.credentials.create(
      creationOptions
    )) as PublicKeyCredential | null;
    if (!credential) return false;

    const response = credential.response as AuthenticatorAttestationResponse;
    await webauthnRegisterFinish(accessToken, {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        attestationObject: bufferToBase64url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Silent-ish re-auth for a returning user: trades a biometric/PIN prompt
 * for a fresh short-lived access token, without OTP, as long as the
 * server's 7-day window (since the last real OTP login) hasn't lapsed.
 * Returns null (never throws) on any failure — callers must fall back to
 * full OTP login, since that's the only path that can ever reset the
 * 7-day window in the first place.
 */
export async function refreshWithPasskey(
  userId: string
): Promise<{ token: string; subscription: string; name?: string; role?: string } | null> {
  try {
    const options = (await refreshBegin(userId)) as {
      publicKey: JSONObject & { challenge: string; allowCredentials?: JSONObject[] };
    };
    const publicKey = options.publicKey;

    const requestOptions: CredentialRequestOptions = {
      publicKey: {
        ...publicKey,
        challenge: base64urlToBuffer(publicKey.challenge),
        allowCredentials: publicKey.allowCredentials?.map(decodeCredentialDescriptor),
      } as PublicKeyCredentialRequestOptions,
    };

    const credential = (await navigator.credentials.get(
      requestOptions
    )) as PublicKeyCredential | null;
    if (!credential) return null;

    const response = credential.response as AuthenticatorAssertionResponse;
    return await refreshFinish(userId, {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        authenticatorData: bufferToBase64url(response.authenticatorData),
        signature: bufferToBase64url(response.signature),
        userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
      },
    });
  } catch {
    return null;
  }
}
