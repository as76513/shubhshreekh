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

export async function confirmOtp(
  phone: string,
  otp: string
): Promise<{ token: string; subscription: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
