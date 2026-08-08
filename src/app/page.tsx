"use client";

import { useEffect, useRef, useState } from "react";
import PlanComparison, { type PlanId } from "@/components/PlanComparison";
import SignupModal from "@/components/SignupModal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const modalOpenedRef = useRef(false);

  function openModal(plan?: PlanId) {
    modalOpenedRef.current = true;
    setSelectedPlan(plan ?? null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function scrollToPlans() {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (!modalOpenedRef.current) openModal();
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo">
            Shubh<span>Shreekh</span>
          </div>
          <button className="btn btn-navy" onClick={() => openModal()}>
            Start free
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="pill">● SEBI-registered research analyst</span>
            <h1>
              Clear <b>buy, sell &amp; hold</b> signals for Indian markets
            </h1>
            <p className="sub">
              {
                "Research-backed trade ideas with entry, target and stop-loss — in one tap. Start free, upgrade when you're ready."
              }
            </p>
            <span className="pill">⚡ Launch offer — free ideas end today</span>
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => openModal()}>
                Get 3 free trade ideas
              </button>
              <button className="btn btn-outline" onClick={scrollToPlans}>
                Compare plans
              </button>
            </div>
            <div className="trust-row">
              <div className="trust">
                <b>1L+</b> investors
              </div>
              <div className="trust">
                <b>4.8★</b> avg rating
              </div>
              <div className="trust">
                <b>SEBI</b> reg. model
              </div>
            </div>
          </div>
          <div className="hero-card">
            <h3>{"Today's top ideas"}</h3>
            <div className="idea">
              <div>
                <div className="nm">RELIANCE</div>
                <div className="tag">Buy · Target ₹1,540</div>
              </div>
              <div className="up">+4.2%</div>
            </div>
            <div className="idea">
              <div>
                <div className="nm">HDFCBANK</div>
                <div className="tag">Hold · Review</div>
              </div>
              <div className="up">+1.1%</div>
            </div>
            <div className="idea lock">
              <div>
                <div className="nm">TATAMOTORS</div>
                <div className="tag">Buy · Target ₹—</div>
              </div>
              <div className="up">+—%</div>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: "14px" }}
              onClick={() => openModal()}
            >
              Unlock all ideas
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="sec-label">Why ShubhShreekh</div>
          <h2 className="sec-title">Everything you need to invest with clarity</h2>
          <div className="feat-grid">
            <div className="feat">
              <h4>Research-backed ideas</h4>
              <p>Entry, target and stop-loss on every pick. Screened, then analyst-validated.</p>
            </div>
            <div className="feat">
              <h4>Buy / Sell / Hold</h4>
              <p>Instant ratings on the stocks you hold, updated as the market moves.</p>
            </div>
            <div className="feat">
              <h4>Live market data</h4>
              <p>Nifty, Sensex and sector insights streamed in real time on every screen.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="plans" id="plans">
        <div className="wrap">
          <div className="sec-label">Pricing</div>
          <h2 className="sec-title">Choose the plan that fits you</h2>
          <PlanComparison onSelectPlan={openModal} />
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="proof">
            <div className="stat">
              <b>1L+</b>
              <span>Investors</span>
            </div>
            <div className="stat">
              <b>4.8★</b>
              <span>Average rating</span>
            </div>
            <div className="stat">
              <b>2,000+</b>
              <span>Stocks rated</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: "8px" }}>
        <div className="wrap">
          <div className="sec-label">Testimonials</div>
          <h2 className="sec-title">Loved by investors</h2>
          <div className="tst-grid">
            <div className="tst">
              <div className="stars">★★★★★</div>
              <p className="q">
                {'"Clean signals, clear entry and exit. Made investing far less stressful for me."'}
              </p>
              <div className="who">
                <div className="av">RK</div>
                <div>
                  <div className="nm">Ravi K.</div>
                  <div className="rl">Software Engineer</div>
                </div>
              </div>
            </div>
            <div className="tst">
              <div className="stars">★★★★★</div>
              <p className="q">
                {'"The Pro plan pays for itself. Screeners alone are worth the price."'}
              </p>
              <div className="who">
                <div className="av">AM</div>
                <div>
                  <div className="nm">Amresh M.</div>
                  <div className="rl">Product Manager</div>
                </div>
              </div>
            </div>
            <div className="tst">
              <div className="stars">★★★★★</div>
              <p className="q">{'"Beautiful app, smooth experience. Everything in one place."'}</p>
              <div className="who">
                <div className="av">PK</div>
                <div>
                  <div className="nm">Prasanth K.</div>
                  <div className="rl">Bank Manager</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Stop guessing. Start growing.</h2>
          <p>Join today and get your first 3 trade ideas free.</p>
          <button className="btn btn-primary" onClick={() => openModal()}>
            Get started free
          </button>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="disc">
            <b style={{ color: "#E8D9AE" }}>Disclosures.</b> ShubhShreekh is a SEBI-registered
            Research Analyst (Reg. No. INHXXXXXXXXX). Investments in securities markets are
            subject to market risks; read all related documents carefully before investing.
            Registration granted by SEBI and certification from NISM in no way guarantee
            performance or returns. Past performance is not indicative of future results.
          </div>
          <div>© 2026 ShubhShreekh. SEBI-registered Research Analyst.</div>
        </div>
      </footer>

      <SignupModal isOpen={modalOpen} plan={selectedPlan} onClose={closeModal} />
    </>
  );
}
