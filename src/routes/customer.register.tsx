import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerCustomer } from "@/server/pds.functions";
import { NAME_RE, RATION_ID_RE } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/register")({ component: Register });

function Register() {
  const nav = useNavigate();
  const [rationId, setRationId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const id = rationId.trim().toUpperCase();
    const n = name.trim();
    if (!RATION_ID_RE.test(id)) return toast.error("Invalid Ration Number (e.g., ABCD123456).");
    if (!NAME_RE.test(n)) return toast.error("Please enter a valid name (letters only).");
    if (phone.trim().length < 8) return toast.error("Enter a valid phone number with country code.");
    setLoading(true);
    try {
      await registerCustomer({ data: { rationId: id, name: n, phone: phone.trim() } });
      toast.success("Registration complete. Please log in.");
      nav({ to: "/customer/login" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <PageShell title="Customer Registration" subtitle="Create your customer account with your Ration Number.">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="space-y-4">
          <div>
            <Label>Ration Number</Label>
            <Input value={rationId} onChange={(e) => setRationId(e.target.value.toUpperCase())} placeholder="ABCD123456" maxLength={10} className="mt-1.5 font-mono tracking-widest" />
            <p className="mt-1.5 text-xs text-muted-foreground">Format: ABCD123456</p>
          </div>
          <div>
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Shushil Kumar" className="mt-1.5" />
          </div>
          <div>
            <Label>Phone (with country code)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919999999989" className="mt-1.5" />
          </div>
          <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
        </div>
      </div>
    </PageShell>
  );
}
