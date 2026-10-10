const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type TradeIdea = {
  symbol: string;
  action: "Buy" | "Sell" | "Hold";
  target?: string;
  changePercent: number | null;
  locked?: boolean;
};

// TODO(build-plan.md Phase 1 Week 3): once the Go API exists, replace with
// `fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/market/top-ideas`).then(r => r.json())`.
// Kept async now so call sites don't change shape when that lands. Mock
// data only — never put real signals here, this file must stay swappable.
export async function getTopIdeas(): Promise<TradeIdea[]> {
  return [
    { symbol: "RELIANCE", action: "Buy", target: "₹1,540", changePercent: 4.2 },
    { symbol: "HDFCBANK", action: "Hold", changePercent: 1.1 },
    { symbol: "TATAMOTORS", action: "Buy", changePercent: null, locked: true },
  ];
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? "Something went wrong, please try again.";
}

/** Carries the HTTP status so callers can distinguish 401 (needs re-auth) from other failures. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type DeviceInfo = {
  deviceId: string;
  label: string;
  lastActiveAt: string;
};

/**
 * Thrown by confirmOtp when the 2-device anti-piracy cap (TD-054) rejects
 * this login — carries what a normal Error can't (the occupied devices,
 * and the short-lived token swapDevice needs) so the caller can show a
 * "log out which device?" picker instead of a generic error string.
 */
export class DeviceLimitError extends Error {
  devices: DeviceInfo[];
  deviceManagementToken: string;
  constructor(devices: DeviceInfo[], deviceManagementToken: string) {
    super("device_limit_reached");
    this.devices = devices;
    this.deviceManagementToken = deviceManagementToken;
  }
}

/** Optional Bearer token for authenticated API calls. */
export function authHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// phone is a bare 10-digit Indian mobile number, no country code (the "+91"
// is a fixed UI prefix — see SignupModal). Backend re-validates regardless.
export async function requestOtp(phone: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

/** Read-only lookup so the login screen can route to login vs. signup before sending an OTP. */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/auth/check-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return Boolean(data.exists);
}

export async function confirmOtp(
  phone: string,
  otp: string,
  profile?: { firstName: string; lastName: string; email: string },
  device?: { deviceId: string; deviceLabel: string }
): Promise<{ token: string; subscription: string; name?: string; userId?: string; role?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      otp,
      ...(profile
        ? {
            first_name: profile.firstName,
            last_name: profile.lastName,
            email: profile.email,
          }
        : {}),
      ...(device ? { deviceId: device.deviceId, deviceLabel: device.deviceLabel } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 403 && body?.error === "device_limit_reached") {
      throw new DeviceLimitError(body.devices ?? [], body.deviceManagementToken ?? "");
    }
    throw new Error(body?.error ?? "Something went wrong, please try again.");
  }
  return res.json();
}

/** Completes a login that confirmOtp blocked with DeviceLimitError, by freeing one device slot. */
export async function swapDevice(
  deviceManagementToken: string,
  removeDeviceId: string,
  newDeviceId: string,
  newDeviceLabel: string
): Promise<{ token: string; subscription: string; name?: string; userId?: string; role?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/devices/swap`, {
    method: "POST",
    headers: authHeaders(deviceManagementToken),
    body: JSON.stringify({ removeDeviceId, newDeviceId, newDeviceLabel }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// --- Biometric/PIN unlock (WebAuthn) -------------------------------------
// See src/lib/webauthn.ts for the browser-API orchestration that calls
// these. Registration requires a just-issued access token (Bearer); the
// refresh pair deliberately does not, since a possibly-expired access
// token is exactly the case refresh exists to handle — the backend
// re-derives trust itself from user_id + the stored credential.

export async function webauthnRegisterBegin(token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/auth/webauthn/register/begin`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function webauthnRegisterFinish(token: string, credential: unknown): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/webauthn/register/finish`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(credential),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function refreshBegin(userId: string): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh/begin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function refreshFinish(
  userId: string,
  assertion: unknown
): Promise<{ token: string; subscription: string; name?: string; role?: string }> {
  const res = await fetch(
    `${API_BASE_URL}/auth/refresh/finish?user_id=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assertion),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// --- RA content platform (Pipe B) — thin insights CMS --------------------

/** "equity" calls carry exactly one target; "fno" calls carry 1-3 scaled booking levels. */
export type InstrumentType = "equity" | "fno";

/** "open" until the RA marks it resolved by hand (TD-053) — no live price feed to detect this automatically. */
export type TradeStatus = "open" | "closed";
export type TradeOutcome = "target_hit" | "sl_hit" | "";

export type Insight = {
  id: string;
  stock: string;
  symbol: string;
  action: string;
  instrumentType: InstrumentType;
  /** Equity only — F&O is intraday, so this is empty/absent there. */
  timeframe?: string;
  tier: string;
  entryPriceLow: number;
  entryPriceHigh: number;
  targets: number[];
  stopLoss: number;
  returnsPct: number;
  rationale: string;
  date: string;
  tradeStatus: TradeStatus;
  outcome?: TradeOutcome;
  closedAt?: string;
  /** Which `targets[]` element was hit, for a "target_hit" close on a F&O call with more than one booking level. Undefined means T1 (index 0). */
  targetHitIndex?: number;
};

/** Every row ever created (draft/published/archived) — analyst's own admin list. */
export type AdminInsight = {
  id: string;
  status: "draft" | "published" | "archived";
  tier: string;
  action: string;
  instrumentType: InstrumentType;
  stock: string;
  symbol: string;
  timeframe?: string;
  entryPriceLow: number;
  entryPriceHigh: number;
  targets: number[];
  stopLoss: number;
  returnsPct: number;
  rationale: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tradeStatus: TradeStatus;
  outcome?: TradeOutcome;
  closedAt?: string;
  targetHitIndex?: number;
};

export type InsightInput = {
  tier: string;
  action: string;
  instrumentType: InstrumentType;
  stock: string;
  symbol: string;
  timeframe: string;
  entryPriceLow: number;
  entryPriceHigh: number;
  targets: number[];
  stopLoss: number;
  rationale: string;
};

export async function listInsights(token: string): Promise<Insight[]> {
  const res = await fetch(`${API_BASE_URL}/insights`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function listAllInsights(token: string): Promise<AdminInsight[]> {
  const res = await fetch(`${API_BASE_URL}/admin/insights`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createInsight(token: string, input: InsightInput): Promise<AdminInsight> {
  const res = await fetch(`${API_BASE_URL}/admin/insights`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateInsight(
  token: string,
  id: string,
  input: InsightInput
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/insights/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function publishInsight(token: string, id: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/admin/insights/${encodeURIComponent(id)}/publish`,
    { method: "POST", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function archiveInsight(token: string, id: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/admin/insights/${encodeURIComponent(id)}/archive`,
    { method: "POST", headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(await parseError(res));
}

/**
 * Records that a scaled F&O target was reached WITHOUT closing the trade —
 * a multi-target call can hit T1, stay open, and later hit T2 and/or T3
 * too. Call this as many times as targets are actually reached; closeInsight
 * (a separate, terminal action) finalizes using whichever target was last
 * marked here if it isn't given its own targetIndex.
 */
export async function markTargetHit(
  token: string,
  id: string,
  targetIndex: number
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/admin/insights/${encodeURIComponent(id)}/mark-target-hit`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ targetIndex }),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function closeInsight(
  token: string,
  id: string,
  outcome: "target_hit" | "sl_hit",
  targetIndex?: number
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/admin/insights/${encodeURIComponent(id)}/close`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ outcome, ...(targetIndex !== undefined ? { targetIndex } : {}) }),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
}

// --- Pricing (TD-055) — discount % is admin-configurable, anchor prices are not ---

export type PricingPlan = {
  id: string;
  label: string;
  anchorPrice: number;
  discountedPrice: number;
};

export type Pricing = {
  discountPercent: number;
  offerWindowHours: number;
  plans: PricingPlan[];
};

/** Public — no auth required, same as a logged-out visitor viewing the landing page's plans. */
export async function getPricing(): Promise<Pricing> {
  const res = await fetch(`${API_BASE_URL}/pricing`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updatePricing(token: string, discountPercent: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/pricing`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ discountPercent }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// --- Daily Market Overview + weekly PDF (TD-057/058) --------------------

export type Overview = {
  id: string;
  text: string;
  photoUrls?: string[];
  publishedAt: string;
};

export type WeeklyPDF = {
  title: string;
  summary: string;
  pdfUrl: string;
  updatedAt?: string;
};

/** The Dashboard card's data — null if the RA hasn't posted today (or ever). */
export async function getLatestOverview(token: string): Promise<Overview | null> {
  const res = await fetch(`${API_BASE_URL}/overview/latest`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  const data = await res.json();
  return data ?? null;
}

/** Full history, newest first — the Blogs archive page. */
export async function listOverviews(token: string): Promise<Overview[]> {
  const res = await fetch(`${API_BASE_URL}/overview`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function createOverview(token: string, text: string, photoUrls: string[]): Promise<Overview> {
  const res = await fetch(`${API_BASE_URL}/admin/overview`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ text, photoUrls }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getWeeklyPDF(token: string): Promise<WeeklyPDF> {
  const res = await fetch(`${API_BASE_URL}/weekly-pdf`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json();
}

export async function setWeeklyPDF(token: string, pdf: WeeklyPDF): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/weekly-pdf`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(pdf),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

/** Presigned S3 PUT URL — the browser uploads the file bytes directly to `uploadUrl`, never through our API. */
export async function getMediaUploadURL(
  token: string,
  contentType: string,
  purpose: "overview-photo" | "weekly-pdf"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const res = await fetch(`${API_BASE_URL}/admin/media/upload-url`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ contentType, purpose }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Uploads a File directly to S3 via the presigned URL from getMediaUploadURL, then returns its public URL. */
export async function uploadMedia(
  token: string,
  file: File,
  purpose: "overview-photo" | "weekly-pdf"
): Promise<string> {
  const { uploadUrl, publicUrl } = await getMediaUploadURL(token, file.type, purpose);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Could not upload file");
  return publicUrl;
}
