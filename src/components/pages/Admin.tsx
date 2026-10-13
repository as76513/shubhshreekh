"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  listAllInsights,
  createInsight,
  publishInsight,
  archiveInsight,
  closeInsight,
  markTargetHit,
  getPricing,
  updatePricing,
  listOverviews,
  createOverview,
  getWeeklyPDF,
  setWeeklyPDF,
  uploadMedia,
  getSiteStats,
  updateSiteStats,
  getTestimonials,
  updateTestimonials,
  type AdminInsight,
  type InsightInput,
  type Pricing,
  type ScalpingIndex,
  type Overview,
  type WeeklyPDF,
  type SiteStats,
  type Testimonial,
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

// Lets the RA type the range the way they actually think of it ("320-330")
// in one box, instead of two separate Low/High number inputs — parsed into
// the entryPriceLow/entryPriceHigh the backend still stores and validates
// as two numbers (needed for the low<=high check and the returnsPct
// midpoint calculation). A bare single number ("320") is also accepted,
// treated as a zero-width range (low === high).
function parseEntryPriceRange(text: string): { low: number; high: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const low = Number(rangeMatch[1]);
    const high = Number(rangeMatch[2]);
    return low > 0 && high > 0 && low <= high ? { low, high } : null;
  }
  const singleMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) {
    const value = Number(singleMatch[1]);
    return value > 0 ? { low: value, high: value } : null;
  }
  return null;
}

const INDEX_LABEL: Record<ScalpingIndex, string> = {
  nifty: "Nifty",
  banknifty: "Bank Nifty",
  sensex: "Sensex",
};

function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function tradeTimeLines(row: AdminInsight): string[] {
  const lines: string[] = [];
  if (row.publishedAt) lines.push(`Published ${fmtDateTime(row.publishedAt)}`);
  const hits = row.targetHitAt ?? [];
  const multi = (row.targets?.length ?? 0) > 1;
  hits.forEach((at, i) => {
    if (!at || at === row.closedAt) return;
    lines.push(`${multi ? `T${i + 1} hit` : "Target hit"} ${fmtDateTime(at)}`);
  });
  if (row.tradeStatus === "closed" && row.closedAt) {
    lines.push(`${row.outcome === "sl_hit" ? "SL hit" : "Closed"} ${fmtDateTime(row.closedAt)}`);
  }
  return lines;
}

export default function Admin() {
  const { withAuth } = useAuth();
  const [form, setForm] = useState<InsightInput>(emptyForm);
  // What the RA actually types ("320-330"); form.entryPriceLow/High are
  // kept in sync via parseEntryPriceRange and are what's actually submitted.
  const [entryPriceRangeInput, setEntryPriceRangeInput] = useState("");
  const [rows, setRows] = useState<AdminInsight[]>([]);
  const [scalp, setScalp] = useState<{
    index: ScalpingIndex;
    strikePrice: number;
    entryPrice: number;
    exitPrice: number;
  }>({ index: "nifty", strikePrice: 0, entryPrice: 0, exitPrice: 0 });
  const [scalpSubmitting, setScalpSubmitting] = useState(false);
  const [scalpError, setScalpError] = useState("");
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

  // Site stats (Achievement strip) + testimonials — admin-configurable,
  // no-deploy landing page content.
  const [siteStatsInputs, setSiteStatsInputs] = useState<SiteStats>({
    learners: "",
    ideasShared: "",
    courses: "",
    avgRating: "",
  });
  const [siteStatsSaving, setSiteStatsSaving] = useState(false);
  const [siteStatsError, setSiteStatsError] = useState("");

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsSaving, setTestimonialsSaving] = useState(false);
  const [testimonialsError, setTestimonialsError] = useState("");
  const [newTestimonial, setNewTestimonial] = useState({ name: "", city: "", text: "", returns: "" });

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

  const refreshSiteStats = async () => {
    try {
      const data = await getSiteStats();
      setSiteStatsInputs(data);
    } catch (err) {
      setSiteStatsError(err instanceof Error ? err.message : "Could not load site stats");
    }
  };

  const refreshTestimonials = async () => {
    try {
      const data = await getTestimonials();
      setTestimonials(data);
    } catch (err) {
      setTestimonialsError(err instanceof Error ? err.message : "Could not load testimonials");
    }
  };

  useEffect(() => {
    refresh();
    refreshPricing();
    refreshOverviews();
    refreshWeeklyPdf();
    refreshSiteStats();
    refreshTestimonials();
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

  const handleSaveSiteStats = async (e: React.FormEvent) => {
    e.preventDefault();
    const { learners, ideasShared, courses, avgRating } = siteStatsInputs;
    if (!learners.trim() || !ideasShared.trim() || !courses.trim() || !avgRating.trim()) {
      setSiteStatsError("All four stats are required");
      return;
    }
    setSiteStatsError("");
    setSiteStatsSaving(true);
    try {
      await withAuth((token) => updateSiteStats(token, siteStatsInputs));
      await refreshSiteStats();
    } catch (err) {
      setSiteStatsError(err instanceof Error ? err.message : "Could not save site stats");
    } finally {
      setSiteStatsSaving(false);
    }
  };

  // Always sends the full replacement list — matches PATCH /admin/testimonials'
  // whole-list-replace semantics, not a merge/append on the backend.
  const saveTestimonials = async (next: Testimonial[]) => {
    setTestimonialsError("");
    setTestimonialsSaving(true);
    try {
      await withAuth((token) => updateTestimonials(token, next));
      setTestimonials(next);
    } catch (err) {
      setTestimonialsError(err instanceof Error ? err.message : "Could not save testimonials");
    } finally {
      setTestimonialsSaving(false);
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.name.trim() || !newTestimonial.city.trim() || !newTestimonial.text.trim()) {
      setTestimonialsError("Name, city, and text are required");
      return;
    }
    // Initials are server-derived (never trust the client, even the admin's
    // own browser) — sent blank here, backend fills the real value.
    await saveTestimonials([...testimonials, { ...newTestimonial, initials: "" }]);
    setNewTestimonial({ name: "", city: "", text: "", returns: "" });
    await refreshTestimonials();
  };

  const handleDeleteTestimonial = async (index: number) => {
    await saveTestimonials(testimonials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock.trim() || !form.symbol.trim()) {
      setError("Stock and symbol are required");
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
      setError("Enter a valid entry price, e.g. 320-330 (or a single value like 320)");
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
      setEntryPriceRangeInput("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create draft");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScalpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scalp.strikePrice <= 0 || scalp.entryPrice <= 0 || scalp.exitPrice <= 0) {
      setScalpError("Strike, entry, and exit must all be greater than zero");
      return;
    }
    setScalpError("");
    setScalpSubmitting(true);
    try {
      await withAuth((token) =>
        createInsight(token, {
          tier: "pro",
          action: "BUY",
          instrumentType: "scalping",
          stock: INDEX_LABEL[scalp.index],
          symbol: scalp.index.toUpperCase(),
          timeframe: "",
          entryPriceLow: scalp.entryPrice,
          entryPriceHigh: scalp.entryPrice,
          targets: [scalp.exitPrice],
          stopLoss: 0,
          rationale: "",
          index: scalp.index,
          strikePrice: scalp.strikePrice,
          entryPrice: scalp.entryPrice,
          exitPrice: scalp.exitPrice,
        }),
      );
      setScalp({ index: "nifty", strikePrice: 0, entryPrice: 0, exitPrice: 0 });
      await refresh();
    } catch (err) {
      setScalpError(err instanceof Error ? err.message : "Could not create scalping draft");
    } finally {
      setScalpSubmitting(false);
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

  // Non-terminal — a scaled F&O call can hit T1 and keep running, then
  // later hit T2 and/or T3 too. This just records progress; handleClose is
  // the separate, final action that actually ends the trade.
  const handleMarkTargetHit = async (id: string, targetIndex: number) => {
    try {
      await withAuth((token) => markTargetHit(token, id, targetIndex));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark target hit");
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
            "Entry Price (₹) — e.g. 320-330",
            <input
              className={inputClass}
              style={inputStyle}
              value={entryPriceRangeInput}
              placeholder="320-330"
              onChange={(e) => {
                const text = e.target.value;
                setEntryPriceRangeInput(text);
                const parsed = parseEntryPriceRange(text);
                setForm((f) => ({
                  ...f,
                  entryPriceLow: parsed?.low ?? 0,
                  entryPriceHigh: parsed?.high ?? 0,
                }));
              }}
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

        <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
          Scalping Trade
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--muted-text)" }}>
          Same as an insight: save a draft, then Publish. A published scalp shows on Today&apos;s Trade, in its own section under Equity and F&amp;O. One Target Hit closes it.
        </p>
        <form
          onSubmit={handleScalpSubmit}
          className="rounded-2xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          {field(
            "Index",
            <select
              className={inputClass}
              style={inputStyle}
              value={scalp.index}
              onChange={(e) => setScalp((s) => ({ ...s, index: e.target.value as ScalpingIndex }))}
            >
              <option value="nifty">Nifty</option>
              <option value="banknifty">Bank Nifty</option>
              <option value="sensex">Sensex</option>
            </select>,
          )}
          {field(
            "Strike price",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={scalp.strikePrice || ""}
              onChange={(e) => setScalp((s) => ({ ...s, strikePrice: Number(e.target.value) }))}
              placeholder="24500"
            />,
          )}
          {field(
            "Entry price",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={scalp.entryPrice || ""}
              onChange={(e) => setScalp((s) => ({ ...s, entryPrice: Number(e.target.value) }))}
              placeholder="120"
            />,
          )}
          {field(
            "Exit price",
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={scalp.exitPrice || ""}
              onChange={(e) => setScalp((s) => ({ ...s, exitPrice: Number(e.target.value) }))}
              placeholder="150"
            />,
          )}
          {scalpError && (
            <p className="col-span-2 sm:col-span-4 text-xs" style={{ color: "var(--loss)" }}>
              {scalpError}
            </p>
          )}
          <div className="col-span-2 sm:col-span-4">
            <button
              type="submit"
              disabled={scalpSubmitting}
              className="btn-action px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {scalpSubmitting ? "Saving…" : "Save as draft"}
            </button>
          </div>
        </form>

        {loading ? (
          <p className="text-sm mb-8" style={{ color: "var(--muted-text)" }}>
            Loading…
          </p>
        ) : rows.filter((r) => r.instrumentType === "scalping").length === 0 ? (
          <p className="text-sm mb-8" style={{ color: "var(--muted-text)" }}>
            No scalping trades yet.
          </p>
        ) : (
          <div className="space-y-2.5 mb-8">
            {rows
              .filter((r) => r.instrumentType === "scalping")
              .map((row) => {
                const times = tradeTimeLines(row);
                const exit = row.exitPrice || row.targets?.[0] || 0;
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
                          style={{ background: "var(--navy)", color: "#ffffff" }}
                        >
                          {INDEX_LABEL[row.index ?? "nifty"] ?? row.symbol}
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
                        {row.tradeStatus === "closed" && (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                            style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                          >
                            Target Hit
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>
                        Strike ₹{row.strikePrice?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                        Entry ₹{row.entryPriceLow} · Exit ₹{exit}
                      </p>
                      {times.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {times.map((line) => (
                            <p key={line} className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
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
                        <button
                          onClick={() => handleClose(row.id, "target_hit")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                        >
                          ✅ Target Hit
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
                );
              })}
          </div>
        )}


        <h2 className="font-semibold text-base mb-3" style={{ color: "var(--navy)" }}>
          All insights
        </h2>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>
            Loading…
          </p>
        ) : rows.filter((r) => r.instrumentType !== "scalping").length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-text)" }}>
            Nothing yet — create a draft above.
          </p>
        ) : (
          <div className="space-y-2.5">
            {rows
              .filter((r) => r.instrumentType !== "scalping")
              .map((row) => {
              // Defensive: a row with a missing/null `targets` attribute
              // (e.g. a malformed or pre-migration row backfillLegacy
              // couldn't fully recover) must never crash the whole admin
              // list render — found 2026-10-10 via a real "Cannot read
              // properties of null (reading 'join')" crash in production.
              const targets = row.targets ?? [];
              const hitAt = row.targetHitAt ?? [];
              const highestHit = hitAt.reduce((best, at, i) => (at ? i : best), -1);
              const times = tradeTimeLines(row);
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
                    {row.tradeStatus !== "closed" && targets.length > 1 && highestHit >= 0 && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                      >
                        Reached T{highestHit + 1} — still running
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--navy)" }}>
                    {row.stock} <span style={{ color: "var(--muted-text)" }}>· {row.symbol}</span>
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-text)" }}>
                    Entry ₹{row.entryPriceLow}-{row.entryPriceHigh} · Tgt ₹{targets.join(" / ")} · SL ₹{row.stopLoss}
                  </p>
                  {times.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {times.map((line) => (
                        <p key={line} className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
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
                        <>
                          {/* Non-terminal — just records progress. A scaled
                              F&O call can hit T1 and keep running, so this
                              never closes the trade by itself; it's the
                              separate "Close" button below that does. */}
                          {targets.map((_, i) => {
                            const reached = Boolean(hitAt[i]);
                            return (
                              <button
                                key={i}
                                onClick={() => handleMarkTargetHit(row.id, i)}
                                disabled={reached}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                                style={{
                                  background: reached ? "var(--gain)" : "rgba(11,42,85,0.08)",
                                  color: reached ? "#ffffff" : "var(--navy)",
                                }}
                                title={`Record that T${i + 1} was hit — the trade stays open`}
                              >
                                {reached ? "✓" : "Mark"} T{i + 1} Hit
                              </button>
                            );
                          })}
                          {/* Terminal — finalizes at whichever target was
                              last marked above (defaults to T1 if none
                              marked yet), e.g. "only T2 was hit, close now
                              so a later reversal can't turn it into a loss." */}
                          <button
                            onClick={() => handleClose(row.id, "target_hit")}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "var(--gain-bg)", color: "var(--gain)" }}
                            title="Close the trade now at the last target marked hit"
                          >
                            ✅ Close Trade
                          </button>
                        </>
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

        {/* Site content — stats strip + testimonials (admin-configurable, no deploy) */}
        <div
          className="rounded-2xl p-5 mb-8 mt-8"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
            Landing page stats
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            The Learners / Ideas shared / Courses / Avg rating strip on the landing page (and the Courses page&apos;s learner count).
          </p>
          <form onSubmit={handleSaveSiteStats} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {field(
              "Learners",
              <input
                className={inputClass}
                style={inputStyle}
                value={siteStatsInputs.learners}
                onChange={(e) => setSiteStatsInputs((s) => ({ ...s, learners: e.target.value }))}
                placeholder="50,000+"
              />,
            )}
            {field(
              "Ideas shared",
              <input
                className={inputClass}
                style={inputStyle}
                value={siteStatsInputs.ideasShared}
                onChange={(e) => setSiteStatsInputs((s) => ({ ...s, ideasShared: e.target.value }))}
                placeholder="2,400+"
              />,
            )}
            {field(
              "Courses",
              <input
                className={inputClass}
                style={inputStyle}
                value={siteStatsInputs.courses}
                onChange={(e) => setSiteStatsInputs((s) => ({ ...s, courses: e.target.value }))}
                placeholder="45+"
              />,
            )}
            {field(
              "Avg rating",
              <input
                className={inputClass}
                style={inputStyle}
                value={siteStatsInputs.avgRating}
                onChange={(e) => setSiteStatsInputs((s) => ({ ...s, avgRating: e.target.value }))}
                placeholder="4.8★"
              />,
            )}
            <div className="col-span-2 sm:col-span-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={siteStatsSaving}
                className="btn-action px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {siteStatsSaving ? "Saving…" : "Save"}
              </button>
              {siteStatsError && (
                <p className="text-xs" style={{ color: "var(--loss)" }}>
                  {siteStatsError}
                </p>
              )}
            </div>
          </form>
        </div>

        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "var(--card-bg)", border: "1px solid rgba(29,78,216,0.15)" }}
        >
          <h2 className="font-semibold text-base mb-1" style={{ color: "var(--navy)" }}>
            Testimonials
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--muted-text)" }}>
            Shown in &quot;What investors say&quot; on the landing page. Initials are generated
            automatically from the name.
          </p>

          {testimonials.length > 0 && (
            <div className="space-y-2 mb-4">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-xl p-3"
                  style={{ background: "rgba(11,42,85,0.06)" }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>
                      {t.name} · {t.city}{" "}
                      {t.returns && <span style={{ color: "var(--gain)" }}>({t.returns})</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                      {t.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTestimonial(i)}
                    disabled={testimonialsSaving}
                    className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "var(--loss-bg)", color: "var(--loss)" }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddTestimonial} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {field(
              "Name",
              <input
                className={inputClass}
                style={inputStyle}
                value={newTestimonial.name}
                onChange={(e) => setNewTestimonial((t) => ({ ...t, name: e.target.value }))}
                placeholder="Arjun Patel"
              />,
            )}
            {field(
              "City",
              <input
                className={inputClass}
                style={inputStyle}
                value={newTestimonial.city}
                onChange={(e) => setNewTestimonial((t) => ({ ...t, city: e.target.value }))}
                placeholder="Mumbai"
              />,
            )}
            {field(
              "Returns (optional)",
              <input
                className={inputClass}
                style={inputStyle}
                value={newTestimonial.returns}
                onChange={(e) => setNewTestimonial((t) => ({ ...t, returns: e.target.value }))}
                placeholder="+32%"
              />,
            )}
            <div />
            <div className="col-span-2 sm:col-span-4">
              {field(
                "Testimonial text",
                <textarea
                  className={inputClass}
                  style={{ ...inputStyle, minHeight: "70px" }}
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial((t) => ({ ...t, text: e.target.value }))}
                  placeholder="The research notes have completely transformed my portfolio..."
                />,
              )}
            </div>
            <div className="col-span-2 sm:col-span-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={testimonialsSaving}
                className="btn-action px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {testimonialsSaving ? "Saving…" : "+ Add testimonial"}
              </button>
              {testimonialsError && (
                <p className="text-xs" style={{ color: "var(--loss)" }}>
                  {testimonialsError}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
