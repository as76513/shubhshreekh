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
