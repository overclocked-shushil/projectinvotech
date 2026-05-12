import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkComplaintEligibility, submitComplaint, trackComplaints } from "@/server/pds.functions";
import { NAME_RE } from "@/lib/constants";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidIndianMobile, toE164India, INDIAN_MOBILE_ERROR } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/complaint")({ component: Complaint });

function Complaint() {
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "form">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function verifyPhone() {
    if (!isValidIndianMobile(phone)) return toast.error(INDIAN_MOBILE_ERROR);
    setBusy(true);
    try {
      const r = await checkComplaintEligibility({ data: { phone: toE164India(phone) } });
      if (r.name) setName(r.name);
      setStep("form");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function submit() {
    const n = name.trim();
    if (!NAME_RE.test(n)) return toast.error("Please enter a valid name (letters only).");
    if (!branch.trim()) return toast.error("Branch is required.");
    if (reason.trim().length < 5) return toast.error("Please describe the reason.");
    setBusy(true);
    try {
      await submitComplaint({ data: { name: n, phone: toE164India(phone), branch: branch.trim(), reason: reason.trim() } });
      setDone(true);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <PageShell title="Public Complaint" subtitle="Only registered customers can file complaints.">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
        {done ? (
          <div className="text-center">
            <p className="font-display text-2xl">Complaint Submitted</p>
            <p className="mt-2 text-sm text-muted-foreground">Thank you. Your complaint has been recorded.</p>
            <Button className="mt-6" onClick={() => nav({ to: "/" })}>Back to Home</Button>
          </div>
        ) : step === "phone" ? (
          <div className="space-y-4">
            <div>
              <Label>Registered Phone Number</Label>
              <PhoneInput value={phone} onChange={setPhone} className="mt-1.5" />
              {phone && !isValidIndianMobile(phone) && <p className="mt-1 text-xs text-destructive">{INDIAN_MOBILE_ERROR}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground">We will verify this number against the registered customer database.</p>
            </div>
            <Button className="w-full" onClick={verifyPhone} disabled={busy || !isValidIndianMobile(phone)}>{busy ? "Checking..." : "Continue"}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Filing as <span className="font-mono">+91 {phone.slice(0,5)} {phone.slice(5)}</span>
            </div>
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5" /></div>
            <div><Label>Branch / Location</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g., Sector 12 PDS shop" className="mt-1.5" /></div>
            <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your complaint…" rows={5} className="mt-1.5" /></div>
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit Complaint"}</Button>
            <button onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground hover:text-foreground">← Use a different number</button>
          </div>
        )}
      </div>

      <TrackComplaintSection />
    </PageShell>
  );
}

function TrackComplaintSection() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  async function track() {
    if (!isValidIndianMobile(phone)) return toast.error(INDIAN_MOBILE_ERROR);
    if (!name.trim()) return toast.error("Enter your name.");
    setBusy(true);
    try {
      const r = await trackComplaints({ data: { phone: toE164India(phone), name: name.trim() } });
      setResults(r.complaints);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function badge(status: string) {
    if (status === "Resolved") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    if (status === "Under Review") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  function dot(status: string) {
    if (status === "Resolved") return "🟢";
    if (status === "Under Review") return "🔵";
    return "🟡";
  }

  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-xl font-semibold">Track Your Complaint</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enter your registered details to view complaint status.</p>
      <div className="mt-4 space-y-3">
        <div><Label>Phone Number</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" className="mt-1.5" /></div>
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5" /></div>
        <Button className="w-full" onClick={track} disabled={busy}>{busy ? "Tracking..." : "Track"}</Button>
      </div>
      {results !== null && (
        <div className="mt-5 space-y-2">
          {results.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No complaints found for this number.</p>
          ) : results.map((c) => {
            const status = c.status ?? "Open";
            return (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{c.reason}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${badge(status)}`}>{dot(status)} {status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Filed: {new Date(c.created_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
