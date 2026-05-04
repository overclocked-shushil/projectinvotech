import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { adminCreateId, adminList, adminCloseComplaint } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NAME_RE, RATION_ID_RE } from "@/lib/constants";
import { toast } from "sonner";
import { TransactionList } from "@/components/TransactionList";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const { loading } = useRequireRole("admin", "/admin/login");
  const { token, user, signOut } = useSession();
  const [data, setData] = useState<{ users: any[]; collections: any[]; complaints: any[] } | null>(null);
  const [tab, setTab] = useState<"create" | "users" | "txns" | "complaints">("create");

  // create form
  const [role, setRole] = useState<"distributor" | "customer">("distributor");
  const [rid, setRid] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!token) return;
    const r = await adminList({ data: { token } });
    setData(r);
  }
  useEffect(() => { if (token) refresh(); }, [token]);

  async function create() {
    const id = rid.trim().toUpperCase(); const n = name.trim();
    if (!RATION_ID_RE.test(id)) return toast.error("Invalid Ration Number.");
    if (!NAME_RE.test(n)) return toast.error("Invalid name.");
    if (phone.trim().length < 8) return toast.error("Invalid phone.");
    setBusy(true);
    try {
      await adminCreateId({ data: { token: token!, rationId: id, role, name: n, phone: phone.trim() } });
      toast.success(`${role} created: ${id}`);
      setRid(""); setName(""); setPhone("");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading || !user) return null;

  return (
    <PageShell title="Admin Panel" subtitle={`Signed in as ${user.name} (${user.rationId})`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(["create","users","txns","complaints"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab===t?"bg-foreground text-background":"bg-secondary text-secondary-foreground hover:bg-accent"}`}>
              {t === "create" ? "ID Creation" : t === "users" ? `Users (${data?.users.length ?? 0})` : t === "txns" ? "All Transactions" : `Complaints (${data?.complaints.length ?? 0})`}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
      </div>

      {tab === "create" && (
        <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Create New ID</h2>
          <p className="text-sm text-muted-foreground">Issue a Distributor or Customer Ration ID.</p>
          <div className="mt-4 space-y-4">
            <div>
              <Label>Role</Label>
              <div className="mt-1.5 flex gap-2">
                {(["distributor","customer"] as const).map((r) => (
                  <button key={r} onClick={() => setRole(r)} className={`rounded-lg border px-4 py-2 text-sm capitalize ${role===r?"border-primary bg-primary/10 text-primary font-medium":"border-border"}`}>{r}</button>
                ))}
              </div>
            </div>
            <div><Label>Ration Number</Label><Input value={rid} onChange={(e)=>setRid(e.target.value.toUpperCase())} placeholder="ABCD123456" maxLength={10} className="mt-1.5 font-mono tracking-widest" /></div>
            <div><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" className="mt-1.5" /></div>
            <div><Label>Phone (with country code)</Label><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+919999999989" className="mt-1.5" /></div>
            <Button onClick={create} disabled={busy} className="w-full">{busy ? "Creating..." : "Create ID"}</Button>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Ration ID</th><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Phone</th></tr>
            </thead>
            <tbody>
              {data?.users.map(u => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-mono">{u.ration_id}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3 text-muted-foreground">{u.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "txns" && <AdminAllTxns />}

      {tab === "complaints" && (
        <ComplaintsTab complaints={data?.complaints ?? []} token={token!} onChange={refresh} />
      )}
    </PageShell>
  );
}

function AdminAllTxns() {
  const { token } = useSession();
  const [txns, setTxns] = useState<any[]>([]);
  useEffect(() => {
    if (!token) return;
    adminList({ data: { token } }).then((r) => {
      // collections from adminList lacks joined names; fetch via my endpoint won't work for admin.
      // Build display rows with placeholder lookups from r.users
      const byId: Record<string, any> = {};
      r.users.forEach((u: any) => { byId[u.id] = u; });
      setTxns(r.collections.map((c: any) => ({
        ...c,
        customer: byId[c.customer_id] ? { name: byId[c.customer_id].name, ration_id: byId[c.customer_id].ration_id } : null,
        distributor: byId[c.distributor_id] ? { name: byId[c.distributor_id].name, ration_id: byId[c.distributor_id].ration_id } : null,
      })));
    });
  }, [token]);
  return <TransactionList transactions={txns} />;
}
