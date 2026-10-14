"use client";

import { useEffect, useState } from "react";
import { listOverviews, type Overview } from "@/lib/api";

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

export default function Blogs() {
  const [overviews, setOverviews] = useState<Overview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listOverviews()
      .then((data) => {
        if (!cancelled) {
          setOverviews(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load updates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="blogs" className="py-20 scroll-mt-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--primary)" }}
          >
            Research
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: "DM Serif Display, serif", color: "var(--foreground)" }}
          >
            Blogs
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Daily market overviews from our Research Analyst, newest first.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            Loading…
          </p>
        )}
        {!loading && error && (
          <p className="text-sm text-center" style={{ color: "#f87171" }}>
            {error}
          </p>
        )}
        {!loading && !error && overviews.length === 0 && (
          <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
            No updates posted yet — check back soon.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {overviews.map((o) => (
            <article key={o.id} className="surface-card rounded-2xl p-5">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--primary)" }}
              >
                {fmtDate(o.publishedAt)}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                {o.text}
              </p>
              {o.photoUrls && o.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {o.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="w-24 h-24 rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
