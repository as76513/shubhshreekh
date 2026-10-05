"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listAllInsights,
  createInsight,
  publishInsight,
  archiveInsight,
  type AdminInsight,
  type InsightInput,
} from "@/lib/api";

const emptyForm: InsightInput = {
  tier: "free",
  action: "BUY",
  stock: "",
  symbol: "",
  category: "Large Cap",
  timeframe: "Short Term",
  cmp: 0,
  target: 0,
  stopLoss: 0,
  rationale: "",
};

export default function Admin() {
  const { withAuth } = useAuth();
  const [form, setForm] = useState<InsightInput>(emptyForm);
  const [rows, setRows] = useState<AdminInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await withAuth((token) => listAllInsights(token));
      // Newest first — createdAt is an RFC3339 string, so lexical sort works.
      setRows([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock.trim() || !form.symbol.trim() || !form.rationale.trim()) {
      setError("Stock, symbol, and rationale are required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await withAuth((token) => createInsight(token, form));
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await withAuth((token) => publishInsight(token, id));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await withAuth((token) => archiveInsight(token, id));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive");
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-text)" }}>
        {label}
      </label>
      {children}
    </div>
  );

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none";
  const inputStyle = {
    background: "#ffffff",
    border: "1px solid rgba(11,42,85,0.18)",
    color: "var(--navy)",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--screen-bg)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--blue-accent)" }}>
          Admin
        </p>
        <h1
          className="text-2xl font-bold mb-1.5"
          style={{ fontFamily: "DM Serif Display, serif", color: "var(--navy)" }}
        >
          Publish an insight
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted-text)" }}>
          Drafts are only visible here until you hit Publish — customers never see a
          draft, regardless of what this page shows you.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-3 gap-4"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          {field(
            "Stock",
            <input
              className={inputClass}
              style={inputStyle}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              placeholder="Reliance Industries"
            />,
          )}
          {field(
            "Symbol",
            <input
              className={inputClass}
              style={inputStyle}
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
              placeholder="RELIANCE"
            />,
          )}
          {field(
            "Action",
            <select
              className={inputClass}
              style={inputStyle}
              value={form.action}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>,
          )}
          {field(
            "Category",
            <input
              className={inputClass}
              style={inputStyle}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Large Cap"
            />,
          )}
          {field(
            "Timeframe",
            <input
              className={inputClass}
              style={inputStyle}
              value={form.timeframe}
              onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
              placeholder="Short Term"
            />,
          )}
          {field(
            "Tier",
            <select
              className={inputClass}
              style={inputStyle}
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>,
          )}
          {field(
            "CMP (₹)",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.cmp || ""}
              onChange={(e) => setForm((f) => ({ ...f, cmp: Number(e.target.value) }))}
            />,
          )}
          {field(
            "Target (₹)",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.target || ""}
              onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))}
            />,
          )}
          {field(
            "Stop Loss (₹)",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.stopLoss || ""}
              onChange={(e) => setForm((f) => ({ ...f, stopLoss: Number(e.target.value) }))}
            />,
          )}

          <div className="col-span-2 sm:col-span-3">
            {field(
              "Rationale",
              <textarea
                className={inputClass}
                style={{ ...inputStyle, minHeight: "72px" }}
                value={form.rationale}
                onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
                placeholder="Breakout above 200-DMA with volume…"
              />,
            )}
          </div>

          {error && (
            <p className="col-span-2 sm:col-span-3 text-xs" style={{ color: "var(--loss)" }}>
              {error}
            </p>
          )}

          <div className="col-span-2 sm:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="btn-action px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save as draft"}
            </button>
          </div>
        </form>

        <h2 className="font-semibold text-base mb-3" style={{ color: "var(--navy)" }}>
          All insights
        </h2>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>
            Nothing yet — create a draft above.
          </p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl"
                style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: row.action === "BUY" ? "var(--buy-badge)" : "var(--sell-badge)",
                        color: "#ffffff",
                      }}
                    >
                      {row.action}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          row.status === "published"
                            ? "var(--gain-bg)"
                            : row.status === "archived"
                              ? "rgba(11,42,85,0.1)"
                              : "color-mix(in srgb, var(--navy-gold-soft) 16%, transparent)",
                        color:
                          row.status === "published"
                            ? "var(--gain)"
                            : row.status === "archived"
                              ? "var(--muted-text)"
                              : "var(--navy-gold-text)",
                      }}
                    >
                      {row.status}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--muted-text)" }}>
                      {row.tier}
                    </span>
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--navy)" }}>
                    {row.stock} <span style={{ color: "var(--muted-text)" }}>· {row.symbol}</span>
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    CMP ₹{row.cmp} · Tgt ₹{row.target} · SL ₹{row.stopLoss}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {row.status !== "published" && (
                    <button
                      onClick={() => handlePublish(row.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--buy-badge)", color: "#ffffff" }}
                    >
                      Publish
                    </button>
                  )}
                  {row.status === "published" && (
                    <button
                      onClick={() => handleArchive(row.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(11,42,85,0.08)", color: "var(--navy)" }}
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
