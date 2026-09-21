import type { User } from "@/lib/types";

const STORAGE_KEY = "shubhshreekh.session.v1";

type StoredSession = {
  phone: string;
  name: string;
  subscription: "free" | "pro";
  token: string;
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
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
