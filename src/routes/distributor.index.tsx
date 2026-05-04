import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { lookupCustomer, recordCollection, myTransactions } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RATION_ID_RE, RATION_ITEMS, unitForItem } from "@/lib/constants";
import { toast } from "sonner";
import { TransactionList } from "@/components/TransactionList";
import { Plus, X } from "lucide-react";
import { downloadTransactionPdf } from "@/lib/pdf";

export const Route = createFileRoute("/distributor/")({ component: DistHome });

type Item = { name: string; otherName?: string; quantity: string; unit: string };

function DistHome() {
  const { loading } = useRequireRole("distributor", "/distributor/login");
  const { token, user, signOut } = useSession();
  const [tab, setTab] = useState<"collect" | "txns">("collect");
  const [rid, setRid] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [family, setFamily] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([{ name: "Rice", quantity: "", unit: unitForItem("Rice") }]);
  const [busy, setBusy] = useState(false);
  const [txns, setTxns] = useState<any[]>([]);

  async function lookup() {
    const id = rid.trim().toUpperCase();
    if (!RATION_ID_RE.test(id)) return toast.error("Invalid Ration Number.");
    try {
      const r = await lookupCustomer({ data: { token: token!, rationId: id } });
      setCustomer(r.customer); setFamily(r.family);
    } catch (e) { setCustomer(null); setFamily([]); toast.error((e as Error).message); }
  }

  async function submit() {
    if (!customer) return;
    const cleaned = items.map(i => ({
      name: i.name === "Other" ? (i.otherName ?? "").trim() : i.name,
      quantity: Number(i.quantity), unit: i.unit.trim(),
    }));
    for (const it of cleaned) {
      if (!it.name) return toast.error("Please specify item name.");
      if (!it.quantity || it.quantity <= 0) return toast.error("Enter valid quantity.");
      if (!it.unit) return toast.error("Enter unit.");
    }
    setBusy(true);
    try {
      const r = await recordCollection({ data: { token: token!, customerRationId: customer.ration_id, items: cleaned } });
      toast.success("Collection recorded.");
      // Auto-download receipt
      downloadTransactionPdf({
        ...r.transaction,
        customer: { name: customer.name, ration_id: customer.ration_id },
        distributor: { name: user!.name, ration_id: user!.rationId },
      } as any);
      setItems([{ name: "Rice", quantity: "", unit: unitForItem("Rice") }]);
      setCustomer(null); setRid(""); setFamily([]);
      loadTxns();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function loadTxns() {
    if (!token) return;
    const r = await myTransactions({ data: { token } });
    setTxns(r.transactions);
  }
  useEffect(() => { loadTxns(); }, [token]);

  if (loading || !user) return null;

  return (
    <PageShell title="Distributor Panel" subtitle={`Signed in as ${user.name} (${user.rationId})`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab("collect")} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab==="collect"?"bg-foreground text-background":"bg-secondary"}`}>Ration Collection</button>
          <button onClick={() => setTab("txns")} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab==="txns"?"bg-foreground text-background":"bg-secondary"}`}>My Transactions</button>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
      </div>

      {tab === "collect" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Find Customer</h2>
            <div className="mt-4 flex gap-2">
              <Input value={rid} onChange={(e)=>setRid(e.target.value.toUpperCase())} placeholder="ABCD123456" maxLength={10} className="font-mono tracking-widest" />
              <Button onClick={lookup}>Lookup</Button>
            </div>
            {customer && (
              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.ration_id} · {customer.phone ?? "—"}</p>
                </div>
                {family.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Family ({family.length})</p>
                    <ul className="mt-2 space-y-1 text-sm">{family.map((f) => (<li key={f.id}>{f.name} <span className="text-muted-foreground">· {f.relation}</span></li>))}</ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Items</h2>
            <div className="mt-4 space-y-3">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select
                    className="col-span-6 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={it.name}
                    onChange={(e) => {
                      const c = [...items];
                      c[i].name = e.target.value;
                      c[i].unit = unitForItem(e.target.value);
                      setItems(c);
                    }}
                  >
                    {RATION_ITEMS.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
                  </select>
                  <Input className="col-span-4" type="number" step="0.01" placeholder="Qty" value={it.quantity} onChange={(e) => { const c = [...items]; c[i].quantity = e.target.value; setItems(c); }} />
                  <div className="col-span-1 flex items-center justify-center rounded-md bg-muted px-2 text-sm font-medium text-muted-foreground">{it.unit}</div>
                  <button className="col-span-1 text-muted-foreground hover:text-destructive" onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={items.length === 1}><X className="h-4 w-4 mx-auto" /></button>
                  {it.name === "Other" && (
                    <Input className="col-span-12" placeholder="Please specify item" value={it.otherName ?? ""} onChange={(e) => { const c = [...items]; c[i].otherName = e.target.value; setItems(c); }} />
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: "Rice", quantity: "", unit: unitForItem("Rice") }])}><Plus className="mr-1 h-4 w-4" /> Add item</Button>
            </div>
            <Button onClick={submit} disabled={!customer || busy} className="mt-6 w-full">{busy ? "Recording..." : "Record Collection"}</Button>
          </div>
        </div>
      )}

      {tab === "txns" && <TransactionList transactions={txns} />}
    </PageShell>
  );
}
