"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import type { PlanId } from "./PlanComparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  function handleOpenChange(open: boolean) {
    if (!open) {
      reset();
      onClose();
    }
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
    handleOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-sm">
        <DialogHeader>
          {!isPaid && (
            <Badge className="w-fit gap-1 bg-gold-100 text-gold-800 hover:bg-gold-100">
              <Zap className="size-3" />
              Free ideas offer ends today
            </Badge>
          )}
          <DialogTitle className="text-xl">
            {isPaid ? `Continue with ${plan}` : "Get 3 free trade ideas"}
          </DialogTitle>
          <DialogDescription>
            {isPaid
              ? "Verify your number to proceed to secure checkout."
              : "Enter your mobile number to start. No credit card needed."}
          </DialogDescription>
        </DialogHeader>

        {stage === "phone" && (
          <div className="flex flex-col gap-3">
            <div className="flex overflow-hidden rounded-lg border border-input">
              <span className="flex items-center bg-muted px-3 text-sm font-medium">+91</span>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value.replace(/[^0-9]/g, ""))}
                className="h-11 rounded-none border-0"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="gold" size="lg" className="w-full" onClick={sendOtp}>
              Send OTP
            </Button>
          </div>
        )}

        {stage === "otp" && (
          <div className="flex flex-col gap-3">
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.currentTarget.value.replace(/[^0-9]/g, ""))}
              className="h-11 text-center text-lg tracking-[0.3em]"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="navy" size="lg" className="w-full" onClick={verifyOtp}>
              Verify &amp; continue
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Enter the OTP sent to your phone
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/80">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
