"use client";

import { useState, useRef } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import { checkPhoneExists, confirmOtp, requestOtp } from "@/lib/api";

const OTP_LEN = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const { login: onLogin, navigate } = useAuth();
  const [step, setStep] = useState<"phone" | "signup" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [phoneNotFound, setPhoneNotFound] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const goToOtpStep = () => {
    setOtpSent(true);
    setStep("otp");
    setOtp(Array(OTP_LEN).fill(""));
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setPhoneNotFound(false);
    setLoading(true);
    try {
      const exists = await checkPhoneExists(phone);
      if (exists) {
        await requestOtp(phone);
        setIsSignup(false);
        goToOtpStep();
      } else {
        setPhoneNotFound(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify number");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestOtp(phone);
      setIsSignup(true);
      goToOtpStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      const next = [...otp];
      next[index] = "";
      setOtp(next);
      return;
    }
    const next = [...otp];
    for (let i = 0; i < digits.length && index + i < OTP_LEN; i++) {
      next[index + i] = digits[i];
    }
    setOtp(next);
    const focusAt = Math.min(index + digits.length, OTP_LEN - 1);
    otpRefs.current[focusAt]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpFocus = (index: number) => {
    otpRefs.current[index]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== OTP_LEN) {
      setError(`Enter the ${OTP_LEN}-digit OTP`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token, subscription, name } = await confirmOtp(
        phone,
        code,
        isSignup ? { firstName, lastName, email } : undefined,
      );
      onLogin("+91 " + phone, {
        token,
        subscription: subscription === "pro" ? "pro" : "free",
        name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setOtp(Array(OTP_LEN).fill(""));
    setError("");
    setLoading(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex">
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative overflow-hidden card-surface"
        style={{ background: "var(--card)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 20% 80%, var(--primary-08) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 20%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 52px), repeating-linear-gradient(90deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 52px)",
          }}
        />

        <button
          onClick={() => navigate("landing")}
          className="relative"
          aria-label="ShubhShree Knowledge Hub Pvt Ltd home"
        >
          <Logo height={96} />
        </button>

        <div className="relative">
          <h2
            className="text-3xl lg:text-4xl font-bold leading-snug mb-6"
            style={{ fontFamily: "DM Serif Display, serif", color: "#ffffff" }}
          >
            Invest with clarity.
            <br />
            <span style={{ color: "var(--primary)" }}>Learn with confidence.</span>
          </h2>
          <p className="text-sm leading-relaxed mb-10 max-w-sm" style={{ color: "#a8b8cc" }}>
            Research notes and courses designed for Indian investors — start free
            in under a minute.
          </p>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#ffffff" }}>
              “The research notes and courses made market concepts much easier to
              follow.”
            </p>
            <p className="text-xs" style={{ color: "#a8b8cc" }}>
              Arjun Patel · Mumbai
            </p>
          </div>
        </div>

        <p className="relative text-xs" style={{ color: "#a0aec0" }}>
          © 2026 Shubhshree Knowledge Hub Private Limited
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center px-5 py-8 sm:p-8 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-[22rem]">
          <button
            onClick={() => navigate("landing")}
            className="lg:hidden mb-5"
            aria-label="ShubhShree Knowledge Hub Pvt Ltd home"
          >
            <Logo height={72} />
          </button>
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Back to home
          </button>

          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="fade-in">
              <div className="mb-7">
                <h1
                  className="text-3xl sm:text-4xl font-bold mb-2 leading-tight"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    background:
                      "linear-gradient(90deg, var(--gold-from), var(--gold-shine))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "var(--gold)",
                  }}
                >
                  Welcome to ShubhShree
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Sign in or create an account with your mobile number
                </p>
              </div>

              <div className="mb-5">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Mobile Number
                </label>
                <div
                  className="flex items-center gap-0 rounded-xl overflow-hidden transition-all"
                  style={{
                    background: "var(--secondary)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "var(--border)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "var(--primary)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "var(--border)";
                  }}
                >
                  <div
                    className="px-4 py-3.5 text-sm font-mono flex-shrink-0"
                    style={{
                      color: "var(--muted-foreground)",
                      borderRight: "1px solid var(--border)",
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="98765 43210"
                    className="flex-1 bg-transparent py-3.5 px-4 outline-none text-sm"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="btn-action w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    Checking...
                  </>
                ) : (
                  "Continue →"
                )}
              </button>

              {phoneNotFound && (
                <p
                  className="text-sm text-center mt-4 fade-in"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Not registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNotFound(false);
                      setError("");
                      setStep("signup");
                    }}
                    className="font-medium hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Sign Up
                  </button>
                </p>
              )}

              <p
                className="text-xs text-center mt-4"
                style={{ color: "var(--muted-foreground)" }}
              >
                By continuing, you agree to our{" "}
                <a
                  href="/legal/terms"
                  className="hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/legal/privacy"
                  className="hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Privacy Policy
                </a>
              </p>
            </form>
          ) : step === "signup" ? (
            <form onSubmit={handleSignupSubmit} className="fade-in">
              <div className="mb-7">
                <h1
                  className="text-3xl sm:text-4xl font-bold mb-2 leading-tight"
                  style={{
                    fontFamily: "DM Serif Display, serif",
                    background:
                      "linear-gradient(90deg, var(--gold-from), var(--gold-shine))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "var(--gold)",
                  }}
                >
                  Create your account
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Tell us a bit about yourself to get started
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setError("");
                  }}
                  className="text-xs mt-1 hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  ← Use a different number
                </button>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Arjun"
                    className="w-full rounded-xl py-3.5 px-4 outline-none text-sm"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Patel"
                    className="w-full rounded-xl py-3.5 px-4 outline-none text-sm"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              </div>

              <div className="mb-5">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Mobile Number
                </label>
                <div
                  className="flex items-center gap-0 rounded-xl overflow-hidden transition-all"
                  style={{
                    background: "var(--secondary)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="px-4 py-3.5 text-sm font-mono flex-shrink-0"
                    style={{
                      color: "var(--muted-foreground)",
                      borderRight: "1px solid var(--border)",
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="98765 43210"
                    className="flex-1 bg-transparent py-3.5 px-4 outline-none text-sm"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  />
                </div>
              </div>

              <div className="mb-5">
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@example.com"
                  className="w-full rounded-xl py-3.5 px-4 outline-none text-sm"
                  style={{
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                {error && (
                  <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-action w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    Sending OTP...
                  </>
                ) : (
                  "Sign Up →"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="fade-in">
              <div className="mb-5">
                <h1
                  className="text-2xl font-bold mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  Verify your number
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {otpSent ? "OTP sent to " : "Enter the code sent to "}
                  <span
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    +91 {phone}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(isSignup ? "signup" : "phone");
                    setOtp(Array(OTP_LEN).fill(""));
                    setError("");
                    setPhoneNotFound(false);
                  }}
                  className="text-xs mt-1 hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Change number
                </button>
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--foreground)" }}
                >
                  Enter {OTP_LEN}-digit OTP
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2 max-w-[20rem] mx-auto">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      size={1}
                      value={digit}
                      aria-label={`OTP digit ${i + 1}`}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => {
                        handleOtpFocus(i);
                        e.currentTarget.style.borderWidth = "2px";
                        e.currentTarget.style.borderColor = "var(--primary)";
                      }}
                      onBlur={(e) => {
                        if (!otp[i]) {
                          e.currentTarget.style.borderWidth = "1.5px";
                          e.currentTarget.style.borderColor = "var(--border)";
                        }
                      }}
                      className="otp-digit h-12 w-10 sm:h-14 sm:w-12 shrink-0 text-center text-lg sm:text-xl font-bold rounded-xl outline-none transition-all"
                      style={{
                        background: "#ffffff",
                        borderWidth: digit ? "2px" : "1.5px",
                        borderStyle: "solid",
                        borderColor: digit ? "var(--primary)" : "var(--border)",
                        color: "#1e3a5f",
                        caretColor: "var(--primary)",
                        fontFamily: "JetBrains Mono, monospace",
                        boxShadow: "0 1px 2px rgba(30, 58, 95, 0.08)",
                      }}
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-xs mt-1.5 text-center" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < OTP_LEN}
                className="btn-action w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue →"
                )}
              </button>

              <p
                className="text-xs text-center mt-4"
                style={{ color: "var(--muted-foreground)" }}
              >
                Didn&apos;t receive OTP?{" "}
                <button
                  type="button"
                  onClick={resend}
                  className="hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Resend OTP
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
