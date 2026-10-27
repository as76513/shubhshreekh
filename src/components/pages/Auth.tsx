"use client";

import { useState, useRef } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";
import {
  checkPhoneExists,
  confirmOtp,
  continueAfterTrial,
  requestOtp,
  swapDevice,
  DeviceLimitError,
  TrialExpiredError,
  type DeviceInfo,
} from "@/lib/api";
import { isPlatformAuthenticatorAvailable, registerPasskey } from "@/lib/webauthn";
import { getDeviceId, getDeviceLabel } from "@/lib/device";

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
  const [showRequiredPopup, setShowRequiredPopup] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [continueToken, setContinueToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  // TD-054: set only when verify-otp rejects with device_limit_reached —
  // renders a "which device to log out" screen instead of the OTP form.
  const [deviceChoice, setDeviceChoice] = useState<{
    devices: DeviceInfo[];
    managementToken: string;
  } | null>(null);
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
    const firstOk = firstName.trim().length > 0;
    const lastOk = lastName.trim().length > 0;
    const phoneOk = phone.length === 10;
    const emailOk = EMAIL_RE.test(email.trim());
    if (!firstOk || !lastOk || !phoneOk || !emailOk) {
      setShowRequiredPopup(true);
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
    setTrialExpired(false);
    setContinueToken("");
    setLoading(true);
    try {
      const { token, subscription, name, userId, role } = await confirmOtp(
        phone,
        code,
        isSignup ? { firstName, lastName, email } : undefined,
        { deviceId: getDeviceId(), deviceLabel: getDeviceLabel() },
      );
      onLogin("+91 " + phone, {
        token,
        subscription: subscription === "pro" ? "pro" : "free",
        name,
        userId,
        role,
      });
      // Best-effort: register this device's biometric/PIN as a WebAuthn
      // credential so future opens can skip OTP (see lib/webauthn.ts). Not
      // awaited on the login redirect above — it shouldn't block getting
      // into the app, and silently does nothing if unsupported/declined.
      if (userId && (await isPlatformAuthenticatorAvailable())) {
        void registerPasskey(token);
      }
    } catch (err) {
      if (err instanceof DeviceLimitError) {
        setDeviceChoice({ devices: err.devices, managementToken: err.deviceManagementToken });
      } else if (err instanceof TrialExpiredError) {
        setTrialExpired(true);
        setContinueToken(err.continueToken);
      } else {
        setError(err instanceof Error ? err.message : "Incorrect or expired OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const finishLogin = (
    token: string,
    subscription: string,
    name: string | undefined,
    userId: string | undefined,
    role: string | undefined,
  ) => {
    onLogin("+91 " + phone, {
      token,
      subscription: subscription === "pro" ? "pro" : "free",
      name,
      userId,
      role,
    });
    if (userId && token) {
      void isPlatformAuthenticatorAvailable().then((ok) => {
        if (ok) void registerPasskey(token);
      });
    }
  };

  const handleContinueFree = async () => {
    if (!continueToken) return;
    setError("");
    setLoading(true);
    try {
      const { token, subscription, name, userId, role } = await continueAfterTrial(continueToken, {
        deviceId: getDeviceId(),
        deviceLabel: getDeviceLabel(),
      });
      finishLogin(token, subscription, name, userId, role);
    } catch (err) {
      if (err instanceof DeviceLimitError) {
        setTrialExpired(false);
        setDeviceChoice({ devices: err.devices, managementToken: err.deviceManagementToken });
      } else {
        setError(err instanceof Error ? err.message : "Could not continue");
      }
    } finally {
      setLoading(false);
    }
  };

  // TD-054: completes the login that triggered deviceChoice — OTP was
  // already confirmed, this just frees the slot the user picked and
  // finishes issuing a normal session, same as handleOtpSubmit's success path.
  const handleLogOutDevice = async (removeDeviceId: string) => {
    if (!deviceChoice) return;
    setError("");
    setLoading(true);
    try {
      const { token, subscription, name, userId, role } = await swapDevice(
        deviceChoice.managementToken,
        removeDeviceId,
        getDeviceId(),
        getDeviceLabel(),
      );
      onLogin("+91 " + phone, {
        token,
        subscription: subscription === "pro" ? "pro" : "free",
        name,
        userId,
        role,
      });
      // The server clears the shared WebAuthn credential on every swap
      // (one credential per account, not per device — see TECH_DEBT.md
      // TD-049), so this device needs to re-register, same as a fresh
      // OTP login does.
      if (userId && (await isPlatformAuthenticatorAvailable())) {
        void registerPasskey(token);
      }
      setDeviceChoice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch devices");
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
        className="hidden lg:flex flex-col justify-between w-[46%] px-12 py-14 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 18%, rgba(212,175,55,0.22) 0%, transparent 55%), linear-gradient(180deg, #071426 0%, #0b1c33 100%)",
        }}
      >
        <button
          onClick={() => navigate("landing")}
          className="relative self-start"
          aria-label="ShubhShree Knowledge Hub home"
        >
          <Logo height={72} withName onDark />
        </button>
        <div className="relative">
          <h2
            className="text-3xl font-bold leading-snug max-w-sm"
            style={{ fontFamily: "DM Serif Display, serif", color: "#f6e7b4" }}
          >
            The note is written. Read it before the bell.
          </h2>
          <p className="mt-4 text-sm leading-relaxed max-w-xs" style={{ color: "#c5d0de" }}>
            One session note, with the level and the reason. Sign in with the mobile number you already use.
          </p>
        </div>
        <p className="relative mt-10 text-xs" style={{ color: "#8ea0b5" }}>
          © 2026 Shubhshree Knowledge Hub Private Limited
        </p>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-start lg:justify-center px-5 py-8 sm:p-8 lg:p-14 overflow-y-auto"
        style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f4f7fb 40%)" }}
      >
        <div className="w-full max-w-[22rem]">
          <button
            onClick={() => navigate("landing")}
            className="lg:hidden mb-5 flex"
            aria-label="ShubhShree Knowledge Hub home"
          >
            <Logo height={48} withName />
          </button>
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Back to home
          </button>

          {deviceChoice ? (
            <div className="fade-in">
              <div className="mb-6">
                <h1
                  className="text-2xl font-bold mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  Too many devices
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Pro accounts can only be used on 2 devices at a time. Log out one
                  below to continue on this device.
                </p>
              </div>

              <div className="space-y-3 mb-4">
                {deviceChoice.devices.map((d) => (
                  <div
                    key={d.deviceId}
                    className="flex items-center justify-between gap-3 rounded-xl p-4"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                        {d.label || "Unknown device"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        Last active {new Date(d.lastActiveAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleLogOutDevice(d.deviceId)}
                      className="btn-action flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      Log out &amp; use this device
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-xs text-center mb-2" style={{ color: "#f87171" }}>
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setDeviceChoice(null);
                  setStep("phone");
                  setError("");
                }}
                className="text-xs hover:underline"
                style={{ color: "var(--primary)" }}
              >
                ← Use a different number
              </button>
            </div>
          ) : step === "phone" ? (
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
                    <span aria-hidden="true" style={{ color: "#f87171" }}> *</span>
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
                    <span aria-hidden="true" style={{ color: "#f87171" }}> *</span>
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
                  <span aria-hidden="true" style={{ color: "#f87171" }}> *</span>
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
                  <span aria-hidden="true" style={{ color: "#f87171" }}> *</span>
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
                    setTrialExpired(false);
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
                {trialExpired ? (
                  <div className="text-center mt-2">
                    <p className="text-xs" style={{ color: "#f87171" }}>
                      Your 7-day free trial has ended.
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      Upgrade to Pro keeps you in, at no charge, until payments are connected.
                    </p>
                    <button
                      type="button"
                      disabled={loading || !continueToken}
                      onClick={handleContinueFree}
                      className="text-xs font-medium hover:underline disabled:opacity-50"
                      style={{ color: "var(--primary)" }}
                    >
                      Upgrade to Pro
                    </button>
                    {error && (
                      <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  error && (
                    <p className="text-xs mt-1.5 text-center" style={{ color: "#f87171" }}>
                      {error}
                    </p>
                  )
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
      {showRequiredPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(11,42,85,0.45)" }}
          role="presentation"
          onClick={() => setShowRequiredPopup(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-required-title"
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="signup-required-title"
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Required fields
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
              First name, last name, mobile number and email are mandatory.
            </p>
            <button
              type="button"
              onClick={() => setShowRequiredPopup(false)}
              className="btn-action w-full py-3 rounded-xl font-semibold text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
