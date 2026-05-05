import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { requestOtp, verifyOtp } from "@/server/pds.functions";
import { useSession } from "@/lib/session";
import { RATION_ID_RE } from "@/lib/constants";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Portal = "admin" | "distributor" | "customer";

const titles: Record<Portal, { title: string; subtitle: string; gradient: string; idLabel: string; idPlaceholder: string; hint: string }> = {
  admin: {
    title: "Admin Login", subtitle: "Restricted access for system administrators.", gradient: "bg-gradient-hero",
    idLabel: "Admin Unique ID", idPlaceholder: "Enter Admin Unique ID", hint: "Admin ID: ADMIN001",
  },
  distributor: {
    title: "Distributor Login", subtitle: "Sign in to record ration distribution.", gradient: "bg-gradient-hero",
    idLabel: "Distributor Unique ID", idPlaceholder: "Enter Distributor Unique ID", hint: "Format: ABCD123456",
  },
  customer: {
    title: "Customer Login", subtitle: "Sign in with your Customer ID.", gradient: "bg-gradient-warm",
    idLabel: "Customer ID", idPlaceholder: "Enter your Customer ID", hint: "Format: ABCD123456",
  },
};

export function LoginPanel({ portal }: { portal: Portal }) {
  const meta = titles[portal];
  const navigate = useNavigate();
  const { setSession } = useSession();
  

  const [step, setStep] = useState<"id" | "otp">("id");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (step !== "otp") return;
    tickRef.current = window.setInterval(() => {
      setNow(Date.now());
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [step]);

  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");

  async function sendOtp() {
    const value = identifier.trim().toUpperCase();
    if (!RATION_ID_RE.test(value)) {
      const msg = portal === "customer"
        ? "Invalid Customer ID. Please contact your Admin."
        : portal === "admin" ? "Please enter a valid Admin Unique ID."
        : "Please enter a valid Distributor Unique ID.";
      toast.error(msg); return;
    }
    setLoading(true);
    try {
      const r = await requestOtp({ data: { rationId: value, portal } });
      setMaskedPhone(r.maskedPhone);
      setExpiresAt(r.expiresAt);
      setResendIn(30);
      setStep("otp");
      if (r.devOtp) toast.info(`Dev OTP: ${r.devOtp}`, { duration: 8000 });
      else toast.success(`OTP sent to ${r.maskedPhone}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit OTP."); return; }
    setLoading(true);
    try {
      const r = await verifyOtp({
        data: { rationId: identifier.trim().toUpperCase(), portal, code },
      });
      setSession(r.token, { id: r.user.id, rationId: r.user.rationId, name: r.user.name, role: r.user.role, phone: r.user.phone });
      toast.success(`Welcome, ${r.user.name}`);
      navigate({ to: portal === "admin" ? "/admin" : portal === "distributor" ? "/distributor" : "/customer" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <div className={`mb-8 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white ${meta.gradient}`}>
          {portal} portal
        </div>
        <h1 className="text-3xl font-display font-semibold sm:text-4xl">{meta.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.subtitle}</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
          {step === "id" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rid">{meta.idLabel}</Label>
                <Input
                  id="rid"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                  placeholder={meta.idPlaceholder}
                  maxLength={10}
                  className="mt-1.5 font-mono tracking-widest"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{meta.hint}</p>
              </div>
              <Button className="w-full" onClick={sendOtp} disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
              {portal === "customer" && (
                <p className="text-center text-xs text-muted-foreground">
                  Don't have a Customer ID? Please contact your local Admin.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                OTP sent to <span className="font-mono">{maskedPhone}</span>
              </div>
              <div>
                <Label htmlFor="otp">6-digit OTP</Label>
                <Input
                  id="otp"
                  autoFocus
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="mt-1.5 text-center font-mono text-2xl tracking-[0.5em]"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={remainingMs === 0 ? "text-destructive" : "text-muted-foreground"}>
                    Expires in {mm}:{ss}
                  </span>
                  <button
                    onClick={() => { if (resendIn === 0) sendOtp(); }}
                    disabled={resendIn > 0 || loading}
                    className="font-medium text-primary disabled:opacity-50"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
              <Button className="w-full" onClick={verify} disabled={loading || remainingMs === 0}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <button onClick={() => setStep("id")} className="w-full text-xs text-muted-foreground hover:text-foreground">
                ← Use a different ID
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
