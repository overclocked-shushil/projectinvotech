import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { listFamily, myTransactions } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { TransactionList } from "@/components/TransactionList";

export const Route = createFileRoute("/customer/")({ component: CustomerHome });

function CustomerHome() {
  const { loading } = useRequireRole("customer", "/customer/login");
  const { token, user, signOut } = useSession();
  const [tab, setTab] = useState<"family" | "txns">("family");
  const [family, setFamily] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([listFamily({ data: { token } }), myTransactions({ data: { token } })])
      .then(([f, t]) => { setFamily(f.family); setTxns(t.transactions); });
  }, [token]);

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
    </PageShell>
  );
}
