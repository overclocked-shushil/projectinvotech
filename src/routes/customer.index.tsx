import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { listFamily, myTransactions, customerStock } from "@/lib/pds.functions";
import { Button } from "@/components/ui/button";
import { TransactionList } from "@/components/TransactionList";

export const Route = createFileRoute("/customer/")({ component: CustomerHome });

type Tab = "family" | "txns" | "stock";

type StockItem = { itemName: string; unit: string; available: number; assigned: number };
type StockData = { distributor: { name: string; rationId: string } | null; stocks: StockItem[] };

function stockLevel(available: number, assigned: number): { label: string; classes: string } {
  const ratio = assigned > 0 ? available / assigned : 0;
  if (available <= 0 || ratio < 0.15) return { label: "Critically low", classes: "bg-red-500" };
  if (ratio < 0.4) return { label: "Low", classes: "bg-yellow-500" };
  return { label: "Healthy", classes: "bg-green-500" };
}

function CustomerHome() {
  const { loading } = useRequireRole("customer", "/customer/login");
  const { token, user, signOut } = useSession();
  const [tab, setTab] = useState<Tab>("family");
  const [family, setFamily] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [stock, setStock] = useState<StockData | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([listFamily({ data: { token } }), myTransactions({ data: { token } })])
      .then(([f, t]) => { setFamily(f.family); setTxns(t.transactions); });
  }, [token]);

  const loadStock = useCallback(() => {
    if (!token) return;
    setStockLoading(true);
    customerStock({ data: { token } })
      .then((s) => setStock(s as StockData))
      .finally(() => setStockLoading(false));
  }, [token]);

  useEffect(() => {
    if (tab === "stock" && stock === null && !stockLoading) loadStock();
  }, [tab, stock, stockLoading, loadStock]);

  if (loading || !user) return null;

  const tabBtn = (id: Tab, label: string) => (
    <button onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab===id?"bg-foreground text-background":"bg-secondary"}`}>{label}</button>
  );

  return (
    <PageShell title={`Welcome, ${user.name}`} subtitle={`${user.rationId}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tabBtn("family", "Family Details")}
          {tabBtn("txns", "My Collections")}
          {tabBtn("stock", "Stock Status")}
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
      </div>

      {tab === "family" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Family Members ({family.length})</h2>
          {family.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No family members added. Please contact your Admin.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">{family.map((f) => (
              <li key={f.id} className="py-3"><p className="font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.relation} · DOB: {f.dob}</p></li>
            ))}</ul>
          )}
        </div>
      )}

      {tab === "txns" && <TransactionList transactions={txns} />}

      {tab === "stock" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {stock?.distributor ? (
                <>
                  <p className="font-display text-lg font-semibold">{stock.distributor.name}</p>
                  <p className="text-xs text-muted-foreground">Distributor · {stock.distributor.rationId}</p>
                </>
              ) : (
                <p className="font-display text-lg font-semibold">Stock Status</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={loadStock} disabled={stockLoading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${stockLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {stockLoading && stock === null ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Loading stock…</p>
          ) : !stock || stock.stocks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No stock data available yet. Stock appears here once your distributor has been assigned items.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stock.stocks.map((s) => {
                const level = stockLevel(s.available, s.assigned);
                return (
                  <div key={s.itemName} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{s.itemName}</p>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${level.classes}`} aria-hidden />
                        {level.label}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-display font-semibold">
                      {Math.max(0, s.available)} <span className="text-sm font-normal text-muted-foreground">{s.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">available</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
