import type { User } from "@/lib/types";

const STORAGE_KEY = "shubhshreekh.session.v1";

type StoredSession = {
  phone: string;
  name: string;
  subscription: "free" | "pro";
  token: string;
  userId?: string;
  role?: string;
};

export function loadSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.phone) return null;
    return {
      phone: parsed.phone,
      name: parsed.name || "Investor",
      subscription: parsed.subscription === "pro" ? "pro" : "free",
      token: parsed.token,
      userId: parsed.userId,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function saveSession(user: User): void {
  if (typeof window === "undefined" || !user.token) return;
  const payload: StoredSession = {
    phone: user.phone,
    name: user.name,
    subscription: user.subscription,
    token: user.token,
    userId: user.userId,
    role: user.role,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Reads the `exp` claim straight out of the JWT (no signature check — this
 * is a client-side UX decision, never a trust boundary; the server always
 * re-verifies independently). Lets the caller decide "is this token worth
 * using as-is" without hardcoding the access-token TTL on the frontend —
 * single source of truth stays the token itself.
 */
export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}
