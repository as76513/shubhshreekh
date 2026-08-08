"use client";

import { useState } from "react";
import type { PlanId } from "./PlanComparison";

type Stage = "phone" | "otp";

const PAID_PLANS: PlanId[] = ["Pro", "Premium"];

export default function SignupModal({
  isOpen,
  plan,
  onClose,
}: {
  isOpen: boolean;
  plan: PlanId | null;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPaid = plan !== null && PAID_PLANS.includes(plan);

  function reset() {
    setStage("phone");
    setPhone("");
    setOtp("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function sendOtp() {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit number");
      return;
    }
    setError(null);
    setStage("otp");
  }

  function verifyOtp() {
    if (otp.length < 4) {
      setError("Enter the OTP");
      return;
    }
    setError(null);
    if (isPaid) {
      alert(`Verified. In production this opens Razorpay checkout for the ${plan} plan.`);
    } else {
      alert("Verified. In production this creates a free account and lands you in the app.");
    }
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <button className="x" onClick={handleClose} aria-label="Close">
          ×
        </button>
        {!isPaid && <span className="pill">⚡ Free ideas offer ends today</span>}
        <h3>{isPaid ? `Continue with ${plan}` : "Get 3 free trade ideas"}</h3>
        <p className="m">
          {isPaid
            ? "Verify your number to proceed to secure checkout."
            : "Enter your mobile number to start. No credit card needed."}
        </p>

        {stage === "phone" && (
          <>
            <div className="field">
              <span className="cc">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            {error && <div className="field-error">{error}</div>}
            <button className="btn btn-primary" onClick={sendOtp}>
              Send OTP
            </button>
          </>
        )}

        {stage === "otp" && (
          <div>
            <div className="field" style={{ marginTop: "12px" }}>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                style={{ textAlign: "center", letterSpacing: "4px" }}
                value={otp}
                onChange={(e) => setOtp(e.currentTarget.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            {error && <div className="field-error">{error}</div>}
            <button className="btn btn-navy" onClick={verifyOtp}>
              Verify &amp; continue
            </button>
            <div className="otp-note">Enter the OTP sent to your phone</div>
          </div>
        )}

        <div className="mini">By continuing you agree to our Terms and Privacy Policy.</div>
      </div>
    </div>
  );
}
