import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { addFamily, listFamily, myTransactions } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NAME_RE, RELATIONS } from "@/lib/constants";
import { toast } from "sonner";
import { TransactionList } from "@/components/TransactionList";

export const Route = createFileRoute("/customer/")({ component: CustomerHome });

function CustomerHome() {
  const { loading } = useRequireRole("customer", "/customer/login");
  const { token, user, signOut } = useSession();
  const [tab, setTab] = useState<"family" | "txns">("family");
  const [family, setFamily] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  // family form
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [otherRel, setOtherRel] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!token) return;
    const [f, t] = await Promise.all([listFamily({ data: { token } }), myTransactions({ data: { token } })]);
    setFamily(f.family); setTxns(t.transactions);
  }
  useEffect(() => { refresh(); }, [token]);

  async function add() {
    const n = name.trim();
    if (!NAME_RE.test(n)) return toast.error("Please enter a valid name (letters only).");
    if (!dob) return toast.error("Please enter date of birth.");
    const rel = relation === "Other" ? otherRel.trim() : relation;
    if (!rel) return toast.error("Please specify relation.");
    setBusy(true);
    try {
      await addFamily({ data: { token: token!, name: n, dob, relation: rel } });
      toast.success("Family member added.");
      setName(""); setDob(""); setRelation(RELATIONS[0]); setOtherRel("");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading || !user) return null;

  return (
    <PageShell title={`Welcome, ${user.name}`} subtitle={`${user.rationId}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab("family")} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab==="family"?"bg-foreground text-background":"bg-secondary"}`}>Family Details</button>
          <button onClick={() => setTab("txns")} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab==="txns"?"bg-foreground text-background":"bg-secondary"}`}>My Collections</button>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
      </div>

      {tab === "family" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Add Family Member</h2>
            <div className="mt-4 space-y-4">
              <div><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Anita" className="mt-1.5" /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={dob} onChange={(e)=>setDob(e.target.value)} className="mt-1.5" /></div>
              <div>
                <Label>Relation</Label>
                <select value={relation} onChange={(e)=>setRelation(e.target.value)} className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="" disabled>-- Select Relation --</option>
                  {RELATIONS.map(r => <option key={r}>{r}</option>)}
                </select>
                {relation === "Other" && <Input className="mt-2" placeholder="Please specify relation" value={otherRel} onChange={(e)=>setOtherRel(e.target.value)} />}
              </div>
              <Button className="w-full" onClick={add} disabled={busy}>{busy ? "Adding..." : "Add Member"}</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Family Members ({family.length})</h2>
            {family.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No family members yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">{family.map((f) => (
                <li key={f.id} className="py-3"><p className="font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.relation} · DOB: {f.dob}</p></li>
              ))}</ul>
            )}
          </div>
        </div>
      )}

      {tab === "txns" && <TransactionList transactions={txns} />}
    </PageShell>
  );
}
