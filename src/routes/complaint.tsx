import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitComplaint } from "@/server/pds.functions";
import { NAME_RE } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/complaint")({ component: Complaint });

function Complaint() {
  const nav = useNavigate();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!NAME_RE.test(n)) return toast.error("Please enter a valid name (letters only, e.g., Shushil).");
    if (phone.trim().length < 8) return toast.error("Enter a valid phone.");
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
    <PageShell title="Public Complaint" subtitle="File a complaint — it will be reviewed by an administrator.">
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
        {done ? (
          <div className="text-center">
            <p className="font-display text-2xl">Complaint Submitted</p>
            <p className="mt-2 text-sm text-muted-foreground">Thank you. Your complaint has been recorded.</p>
            <Button className="mt-6" onClick={() => nav({ to: "/" })}>Back to Home</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" className="mt-1.5" /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+919999999989" className="mt-1.5" /></div>
            <div><Label>Branch / Location</Label><Input value={branch} onChange={(e)=>setBranch(e.target.value)} placeholder="e.g., Sector 12 PDS shop" className="mt-1.5" /></div>
            <div><Label>Reason</Label><Textarea value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Describe your complaint…" rows={5} className="mt-1.5" /></div>
            <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Submitting..." : "Submit Complaint"}</Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
