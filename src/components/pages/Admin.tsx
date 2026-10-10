"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listAllInsights,
  createInsight,
  publishInsight,
  archiveInsight,
  closeInsight,
  getPricing,
  updatePricing,
  listOverviews,
  createOverview,
  getWeeklyPDF,
  setWeeklyPDF,
  uploadMedia,
  type AdminInsight,
  type InsightInput,
  type Pricing,
  type Overview,
  type WeeklyPDF,
} from "@/lib/api";

// No Free tier left to choose (TD-054) — every logged-in user is "pro," so
// the RA is never asked to pick a tier anymore. Still sent on the request
// since the backend field exists, just fixed rather than form-driven.
const emptyForm: InsightInput = {
  tier: "pro",
  action: "BUY",
  instrumentType: "equity",
  stock: "",
  symbol: "",
  timeframe: "Short Term",
  entryPriceLow: 0,
  entryPriceHigh: 0,
  targets: [0],
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

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState("");

  // Daily Market Overview (TD-057)
  const [overviewText, setOverviewText] = useState("");
  const [overviewPhotoUrls, setOverviewPhotoUrls] = useState<string[]>([]);
  const [overviewUploading, setOverviewUploading] = useState(false);
  const [overviewSubmitting, setOverviewSubmitting] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [recentOverviews, setRecentOverviews] = useState<Overview[]>([]);

  // Weekly market outlook PDF (TD-058)
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfSummary, setPdfSummary] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfError, setPdfError] = useState("");

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

  const refreshPricing = async () => {
    try {
      const data = await getPricing();
      setPricing(data);
      setDiscountInput(String(data.discountPercent));
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : "Could not load pricing");
    }
  };

  const refreshOverviews = async () => {
    try {
      const data = await withAuth((token) => listOverviews(token));
      setRecentOverviews(data.slice(0, 5));
    } catch {
      // Non-critical preview list — the post form above still works either way.
    }
  };

  const refreshWeeklyPdf = async () => {
    try {
      const data = await withAuth((token) => getWeeklyPDF(token));
      setPdfTitle(data.title);
      setPdfSummary(data.summary);
      setPdfUrl(data.pdfUrl);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Could not load weekly PDF");
    }
  };

  useEffect(() => {
    refresh();
    refreshPricing();
    refreshOverviews();
    refreshWeeklyPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(discountInput);
    if (!Number.isFinite(pct) || pct < 25 || pct >= 100) {
      setPricingError("Enter a discount between 25 and 99");
      return;
    }
    setPricingError("");
    setPricingSaving(true);
    try {
      await withAuth((token) => updatePricing(token, pct));
      await refreshPricing();
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : "Could not save pricing");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleOverviewPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setOverviewUploading(true);
    setOverviewError("");
    try {
      const urls = await withAuth(async (token) => {
        const uploaded: string[] = [];
        for (const file of Array.from(files)) {
          uploaded.push(await uploadMedia(token, file, "overview-photo"));
        }
        return uploaded;
      });
      setOverviewPhotoUrls((prev) => [...prev, ...urls]);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setOverviewUploading(false);
      e.target.value = "";
    }
  };

  const handlePostOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overviewText.trim()) {
      setOverviewError("Write something first");
      return;
    }
    setOverviewError("");
    setOverviewSubmitting(true);
    try {
      await withAuth((token) => createOverview(token, overviewText.trim(), overviewPhotoUrls));
      setOverviewText("");
      setOverviewPhotoUrls([]);
      await refreshOverviews();
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Could not post overview");
    } finally {
      setOverviewSubmitting(false);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfUploading(true);
    setPdfError("");
    try {
      const url = await withAuth((token) => uploadMedia(token, file, "weekly-pdf"));
      setPdfUrl(url);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Could not upload PDF");
    } finally {
      setPdfUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveWeeklyPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfTitle.trim() || !pdfUrl) {
      setPdfError("Title and an uploaded PDF are required");
      return;
    }
    setPdfError("");
    setPdfSaving(true);
    try {
      await withAuth((token) => setWeeklyPDF(token, { title: pdfTitle.trim(), summary: pdfSummary.trim(), pdfUrl }));
      await refreshWeeklyPdf();
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Could not save weekly PDF");
    } finally {
      setPdfSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock.trim() || !form.symbol.trim() || !form.rationale.trim()) {
      setError("Stock, symbol, and rationale are required");
      return;
    }
    const targets = form.targets.filter((t) => t > 0);
    if (form.instrumentType === "equity" && targets.length !== 1) {
      setError("Equity calls need exactly one target");
      return;
    }
    if (form.instrumentType === "fno" && targets.length === 0) {
      setError("F&O calls need at least one target");
      return;
    }
    if (form.entryPriceLow <= 0 || form.entryPriceHigh <= 0 || form.entryPriceLow > form.entryPriceHigh) {
      setError("Enter a valid entry price range (low ≤ high, both positive)");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // F&O is intraday — timeframe doesn't apply, server force-clears it
      // too, but don't send a stale value left over from switching types.
      const timeframe = form.instrumentType === "fno" ? "" : form.timeframe;
      await withAuth((token) => createInsight(token, { ...form, targets, timeframe }));
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

  const handleClose = async (
    id: string,
    outcome: "target_hit" | "sl_hit",
    targetIndex?: number
  ) => {
    try {
      await withAuth((token) => closeInsight(token, id, outcome, targetIndex));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close trade");
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

        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
            Pricing discount
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            Changes take effect immediately, no deploy needed — use this for festive-season bumps.
          </p>
          <form onSubmit={handleSavePricing} className="flex flex-wrap items-end gap-4">
            {field(
              "Discount %",
              <input
                type="number"
                min={25}
                max={99}
                className={inputClass}
                style={{ ...inputStyle, maxWidth: "120px" }}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />,
            )}
            <button
              type="submit"
              disabled={pricingSaving}
              className="btn-action px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {pricingSaving ? "Saving…" : "Save"}
            </button>
            {pricingError && (
              <p className="text-xs" style={{ color: "var(--loss)" }}>
                {pricingError}
              </p>
            )}
          </form>
          {pricing && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {pricing.plans.map((p) => (
                <div key={p.id} className="rounded-xl p-3" style={{ background: "rgba(11,42,85,0.06)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--navy)" }}>
                    {p.label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    <span style={{ textDecoration: "line-through" }}>₹{p.anchorPrice}</span>
                    {" → "}
                    <span className="font-bold" style={{ color: "var(--gain)" }}>
                      ₹{p.discountedPrice}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
            Today&apos;s market overview
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            Posts immediately — shows on the customer Dashboard and the Blogs archive. No draft step.
          </p>
          <form onSubmit={handlePostOverview}>
            {field(
              "What happened in the market today",
              <textarea
                className={inputClass}
                style={{ ...inputStyle, minHeight: "90px" }}
                value={overviewText}
                onChange={(e) => setOverviewText(e.target.value)}
                placeholder="NIFTY held above 24,300 as IT and banking stocks led gains..."
              />,
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label
                className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: "rgba(11,42,85,0.08)", color: "var(--navy)" }}
              >
                {overviewUploading ? "Uploading…" : "+ Add photo(s)"}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  className="hidden"
                  onChange={handleOverviewPhotoSelect}
                  disabled={overviewUploading}
                />
              </label>
              {overviewPhotoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ))}
              <button
                type="submit"
                disabled={overviewSubmitting || overviewUploading}
                className="btn-action px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ml-auto"
              >
                {overviewSubmitting ? "Posting…" : "Post"}
              </button>
            </div>
            {overviewError && (
              <p className="text-xs mt-2" style={{ color: "var(--loss)" }}>
                {overviewError}
              </p>
            )}
          </form>

          {recentOverviews.length > 0 && (
            <div className="mt-5 pt-4 space-y-3" style={{ borderTop: "1px solid rgba(11,42,85,0.1)" }}>
              {recentOverviews.map((ov) => (
                <div key={ov.id} className="text-xs" style={{ color: "var(--muted-text)" }}>
                  <span style={{ color: "var(--navy)", fontWeight: 600 }}>
                    {new Date(ov.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>{" "}
                  — {ov.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
            Weekly market outlook PDF
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            Replaces what the Dashboard&apos;s &quot;Today&apos;s Update&quot; card links to.
          </p>
          <form onSubmit={handleSaveWeeklyPdf} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field(
              "Title",
              <input
                className={inputClass}
                style={inputStyle}
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="Market Pulse — 12 October 2026"
              />,
            )}
            {field(
              "Summary",
              <input
                className={inputClass}
                style={inputStyle}
                value={pdfSummary}
                onChange={(e) => setPdfSummary(e.target.value)}
                placeholder="This week's session recap and outlook"
              />,
            )}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <label
                className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ background: "rgba(11,42,85,0.08)", color: "var(--navy)" }}
              >
                {pdfUploading ? "Uploading…" : pdfUrl ? "Replace PDF" : "+ Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfFileSelect}
                  disabled={pdfUploading}
                />
              </label>
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "var(--blue-accent)" }}>
                  View current PDF →
                </a>
              )}
              <button
                type="submit"
                disabled={pdfSaving || pdfUploading}
                className="btn-action px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ml-auto"
              >
                {pdfSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {pdfError && (
              <p className="sm:col-span-2 text-xs" style={{ color: "var(--loss)" }}>
                {pdfError}
              </p>
            )}
          </form>
        </div>

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
            "Instrument Type",
            <select
              className={inputClass}
              style={inputStyle}
              value={form.instrumentType}
              onChange={(e) => {
                const instrumentType = e.target.value as "equity" | "fno";
                setForm((f) => ({
                  ...f,
                  instrumentType,
                  // Equity keeps just the first target; F&O pads out to 3
                  // slots (2 and 3 optional) without losing what's typed.
                  targets:
                    instrumentType === "equity"
                      ? [f.targets[0] ?? 0]
                      : [f.targets[0] ?? 0, f.targets[1] ?? 0, f.targets[2] ?? 0],
                  // F&O is intraday — no timeframe to pick; switching back
                  // to equity starts fresh rather than resurrecting a stale value.
                  timeframe: instrumentType === "fno" ? "" : f.timeframe,
                }));
              }}
            >
              <option value="equity">Equity</option>
              <option value="fno">F&amp;O</option>
            </select>,
          )}
          {form.instrumentType === "equity" &&
            field(
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
            "Entry Price Low (₹)",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.entryPriceLow || ""}
              onChange={(e) => setForm((f) => ({ ...f, entryPriceLow: Number(e.target.value) }))}
            />,
          )}
          {field(
            "Entry Price High (₹)",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.entryPriceHigh || ""}
              onChange={(e) => setForm((f) => ({ ...f, entryPriceHigh: Number(e.target.value) }))}
            />,
          )}
          {form.instrumentType === "equity" ? (
            field(
              "Target (₹)",
              <input
                type="number"
                className={inputClass}
                style={inputStyle}
                value={form.targets[0] || ""}
                onChange={(e) => setForm((f) => ({ ...f, targets: [Number(e.target.value)] }))}
              />,
            )
          ) : (
            <>
              {field(
                "Target 1 (₹)",
                <input
                  type="number"
                  className={inputClass}
                  style={inputStyle}
                  value={form.targets[0] || ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const targets = [...f.targets];
                      targets[0] = Number(e.target.value);
                      return { ...f, targets };
                    })
                  }
                />,
              )}
              {field(
                "Target 2 (₹) — optional",
                <input
                  type="number"
                  className={inputClass}
                  style={inputStyle}
                  value={form.targets[1] || ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const targets = [...f.targets];
                      targets[1] = Number(e.target.value);
                      return { ...f, targets };
                    })
                  }
                />,
              )}
              {field(
                "Target 3 (₹) — optional",
                <input
                  type="number"
                  className={inputClass}
                  style={inputStyle}
                  value={form.targets[2] || ""}
                  onChange={(e) =>
                    setForm((f) => {
                      const targets = [...f.targets];
                      targets[2] = Number(e.target.value);
                      return { ...f, targets };
                    })
                  }
                />,
              )}
            </>
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
            {rows.map((row) => {
              // Defensive: a row with a missing/null `targets` attribute
              // (e.g. a malformed or pre-migration row backfillLegacy
              // couldn't fully recover) must never crash the whole admin
              // list render — found 2026-10-10 via a real "Cannot read
              // properties of null (reading 'join')" crash in production.
              const targets = row.targets ?? [];
              return (
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
                      {row.tier} · {row.instrumentType === "fno" ? "F&O" : "Equity"}
                    </span>
                    {row.tradeStatus === "closed" && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{
                          background: row.outcome === "target_hit" ? "var(--gain-bg)" : "var(--loss-bg)",
                          color: row.outcome === "target_hit" ? "var(--gain)" : "var(--loss)",
                        }}
                      >
                        {row.outcome === "target_hit"
                          ? targets.length > 1
                            ? `Target ${(row.targetHitIndex ?? 0) + 1} Hit`
                            : "Target Hit"
                          : "SL Hit"}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--navy)" }}>
                    {row.stock} <span style={{ color: "var(--muted-text)" }}>· {row.symbol}</span>
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Entry ₹{row.entryPriceLow}-{row.entryPriceHigh} · Tgt ₹{targets.join(" / ")} · SL ₹{row.stopLoss}
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
                  {row.status === "published" && row.tradeStatus !== "closed" && (
                    <>
                      {targets.length > 1 ? (
                        targets.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => handleClose(row.id, "target_hit", i)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                          >
                            ✅ T{i + 1} Hit
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => handleClose(row.id, "target_hit")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                        >
                          ✅ Target Hit
                        </button>
                      )}
                      <button
                        onClick={() => handleClose(row.id, "sl_hit")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "var(--loss-bg)", color: "var(--loss)" }}
                      >
                        🛑 SL Hit
                      </button>
                    </>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
