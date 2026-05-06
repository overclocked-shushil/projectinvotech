import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkComplaintEligibility, submitComplaint, trackComplaints } from "@/server/pds.functions";
import { NAME_RE } from "@/lib/constants";
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
    if (phone.trim().length < 8) return toast.error("Enter a valid phone number.");
    setBusy(true);
    try {
      const r = await checkComplaintEligibility({ data: { phone: phone.trim() } });
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
      await submitComplaint({ data: { name: n, phone: phone.trim(), branch: branch.trim(), reason: reason.trim() } });
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999999" className="mt-1.5" />
              <p className="mt-1.5 text-xs text-muted-foreground">We will verify this number against the registered customer database.</p>
            </div>
            <Button className="w-full" onClick={verifyPhone} disabled={busy}>{busy ? "Checking..." : "Continue"}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Filing as <span className="font-mono">{phone}</span>
            </div>
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5" /></div>
            <div><Label>Branch / Location</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g., Sector 12 PDS shop" className="mt-1.5" /></div>
            <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your complaint…" rows={5} className="mt-1.5" /></div>
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit Complaint"}</Button>
            <button onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground hover:text-foreground">← Use a different number</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
