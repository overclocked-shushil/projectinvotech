import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { lookupCustomer, recordCollection, sendCollectionOtp, myTransactions, myStock } from "@/lib/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RATION_ID_RE } from "@/lib/constants";
import { formatIndianMobile } from "@/lib/phone";
import { toast } from "sonner";
import { TransactionList } from "@/components/TransactionList";
import { downloadTransactionPdf } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/distributor/")({ component: DistHome });

type Entitlement = { name: string; quantity: number; unit: string };

function DistHome() {
  const { loading } = useRequireRole("distributor", "/distributor/login");
  const { token, user, signOut } = useSession();
  const [tab, setTab] = useState<"collect" | "stock" | "txns">("collect");
  const [rid, setRid] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [family, setFamily] = useState<any[]>([]);
  const [householdSize, setHouseholdSize] = useState(0);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [alreadyCollected, setAlreadyCollected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [txns, setTxns] = useState<any[]>([]);

  async function lookup() {
    const id = rid.trim().toUpperCase();
    if (!RATION_ID_RE.test(id)) return toast.error("Invalid Ration Number.");
    try {
      const r = await lookupCustomer({ data: { token: token!, rationId: id } });
      setCustomer(r.customer);
      setFamily(r.family);
      setHouseholdSize(r.householdSize);
      setEntitlements(r.entitlements);
      setAlreadyCollected(r.alreadyCollectedThisMonth);
    } catch (e) {
      setCustomer(null); setFamily([]); setEntitlements([]); setAlreadyCollected(false);
      toast.error((e as Error).message);
    }
  }

  async function submit() {
    if (!customer) return;
    if (alreadyCollected) {
      return toast.error("Ration already distributed to this customer for this month.");
    }
    const items = entitlements.filter((it) => it.quantity > 0);
    if (items.length === 0) return toast.error("No entitled items to distribute.");
    setBusy(true);
    try {
      const r = await recordCollection({
        data: { token: token!, customerRationId: customer.ration_id, items },
      });
      toast.success("Collection recorded. Stock updated.");
      downloadTransactionPdf({
        ...r.transaction,
        customer: { name: customer.name, ration_id: customer.ration_id },
        distributor: { name: user!.name, ration_id: user!.rationId },
      } as any);
      setCustomer(null); setRid(""); setFamily([]); setEntitlements([]); setAlreadyCollected(false);
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
        <div className="flex flex-wrap gap-2">
          {(["collect", "stock", "txns"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab===t?"bg-foreground text-background":"bg-secondary"}`}>
              {t === "collect" ? "Ration Collection" : t === "stock" ? "My Current Stock" : "My Transactions"}
            </button>
          ))}
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
                  <p className="text-xs text-muted-foreground">{customer.ration_id} · {formatIndianMobile(customer.phone)}</p>
                  <p className="mt-1 text-xs"><span className="font-semibold">Household size:</span> {householdSize} (head + {family.length} family member{family.length===1?"":"s"})</p>
                </div>
                {alreadyCollected && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    Ration already distributed to this customer for this month.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Entitled Quantity</h2>
            <p className="text-xs text-muted-foreground">Auto-calculated from family size — read-only.</p>
            {entitlements.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Look up a customer to view entitlements.</p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-2">Item</th><th className="p-2 text-right">Quantity</th><th className="p-2">Unit</th></tr>
                  </thead>
                  <tbody>
                    {entitlements.map((it) => (
                      <tr key={it.name} className="border-t border-border">
                        <td className="p-2">{it.name}</td>
                        <td className="p-2 text-right font-mono">{it.quantity}</td>
                        <td className="p-2 text-muted-foreground">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button onClick={submit} disabled={!customer || busy || alreadyCollected || entitlements.length===0} className="mt-6 w-full">
              {busy ? "Recording..." : "Record Distribution"}
            </Button>
          </div>
        </div>
      )}

      {tab === "stock" && <MyStockSection token={token!} />}

      {tab === "txns" && <TransactionList transactions={txns} />}
    </PageShell>
  );
}

function MyStockSection({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const r = await myStock({ data: { token } });
      setRows(r.stocks);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, [token]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dist-stocks")
      .on("postgres_changes", { event: "*", schema: "public", table: "distributor_stocks" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function colorFor(remaining: number, assigned: number) {
    if (assigned === 0) return "bg-gray-200 text-gray-700";
    const pct = (remaining / assigned) * 100;
    if (pct < 10) return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (pct <= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading stock...</p>;
  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No stock assigned yet. Please contact Admin.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="p-3">Item</th><th className="p-3 text-right">Assigned</th><th className="p-3 text-right">Distributed</th><th className="p-3 text-right">Remaining</th><th className="p-3">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const assigned = Number(s.assigned_qty);
            const distributed = Number(s.distributed_qty);
            const remaining = assigned - distributed;
            return (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.item_name}</td>
                <td className="p-3 text-right font-mono">{assigned} {s.unit}</td>
                <td className="p-3 text-right font-mono">{distributed} {s.unit}</td>
                <td className="p-3 text-right font-mono">{remaining} {s.unit}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colorFor(remaining, assigned)}`}>
                  {assigned === 0 ? "—" : remaining / assigned < 0.1 ? "Low" : remaining / assigned <= 0.5 ? "Medium" : "Healthy"}
                </span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
