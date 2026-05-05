import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { adminCreateId, adminList, adminCloseComplaint, adminAddFamily, adminUpdateFamily, adminDeleteFamily, adminListFamily, adminDeleteUser } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAME_RE, RATION_ID_RE, RELATIONS, maxDobString, isOldEnough, AGE_ERROR } from "@/lib/constants";
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
        <UsersTable users={data?.users ?? []} token={token!} />
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

function ComplaintsTab({ complaints, token, onChange }: { complaints: any[]; token: string; onChange: () => void }) {
  const [filter, setFilter] = useState<"All" | "Open" | "Resolved">("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = complaints.filter((c) => filter === "All" ? true : (c.status ?? "Open") === filter);
  const counts = {
    All: complaints.length,
    Open: complaints.filter((c) => (c.status ?? "Open") === "Open").length,
    Resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  async function close(id: string) {
    setBusyId(id);
    try {
      await adminCloseComplaint({ data: { token, complaintId: id } });
      toast.success("Complaint marked Resolved.");
      onChange();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["Open", "Resolved", "All"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No complaints.</p>}
      {visible.map((c) => {
        const status = c.status ?? "Open";
        const isResolved = status === "Resolved";
        return (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{c.name} <span className="text-xs text-muted-foreground">· {c.phone}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Branch: {c.branch}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isResolved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{status}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-2 text-sm">{c.reason}</p>
            {!isResolved && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => close(c.id)}>
                  {busyId === c.id ? "Closing..." : "Close Complaint"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UsersTable({ users, token }: { users: any[]; token: string }) {
  const [openCustomer, setOpenCustomer] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(u: any) {
    const label = u.role === "customer" ? "customer" : "distributor";
    if (!confirm(`Are you sure you want to delete this ${label}? This action cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await adminDeleteUser({ data: { token, userId: u.id } });
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted successfully.`);
      // refresh by reloading parent data
      window.dispatchEvent(new CustomEvent("admin:refresh"));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">Ration ID</th><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Phone</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-mono">{u.ration_id}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3 text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    {u.role === "customer" && (
                      <Button size="sm" variant="outline" onClick={() => setOpenCustomer(u)}>
                        Edit / Add Family Members
                      </Button>
                    )}
                    {u.role !== "admin" && (
                      <Button
                        size="sm"
                        disabled={busyId === u.id}
                        onClick={() => handleDelete(u)}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        {busyId === u.id ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openCustomer && (
        <FamilyDialog customer={openCustomer} token={token} onClose={() => setOpenCustomer(null)} />
      )}
    </>
  );
}

function FamilyDialog({ customer, token, onClose }: { customer: any; token: string; onClose: () => void }) {
  const [family, setFamily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [otherRel, setOtherRel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await adminListFamily({ data: { token, customerRationId: customer.ration_id } });
      setFamily(r.family);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  function resetForm() { setName(""); setDob(""); setRelation(RELATIONS[0]); setOtherRel(""); setEditingId(null); }

  async function save() {
    const n = name.trim();
    if (!NAME_RE.test(n)) return toast.error("Please enter a valid name.");
    if (!dob) return toast.error("Please enter date of birth.");
    if (!isOldEnough(dob)) return toast.error(AGE_ERROR);
    const rel = relation === "Other" ? otherRel.trim() : relation;
    if (!rel) return toast.error("Please specify relation.");
    setBusy(true);
    try {
      if (editingId) {
        await adminUpdateFamily({ data: { token, id: editingId, name: n, dob, relation: rel } });
        toast.success("Family member updated.");
      } else {
        await adminAddFamily({ data: { token, customerRationId: customer.ration_id, name: n, dob, relation: rel } });
        toast.success("Family member added.");
      }
      resetForm();
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startEdit(f: any) {
    setEditingId(f.id);
    setName(f.name);
    setDob(f.dob ?? "");
    if (RELATIONS.includes(f.relation)) { setRelation(f.relation); setOtherRel(""); }
    else { setRelation("Other"); setOtherRel(f.relation); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this family member?")) return;
    try { await adminDeleteFamily({ data: { token, id } }); toast.success("Removed."); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Family Members — {customer.name} ({customer.ration_id})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">{editingId ? "Edit Member" : "Add Member"}</h3>
            <div className="mt-3 space-y-3">
              <div><Label>Member Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1.5" /></div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} max={maxDobString()} onChange={(e)=>setDob(e.target.value)} className="mt-1.5" />
                {dob && !isOldEnough(dob) && <p className="mt-1 text-xs text-destructive">{AGE_ERROR}</p>}
              </div>
              <div>
                <Label>Relation</Label>
                <select value={relation} onChange={(e)=>setRelation(e.target.value)} className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                {relation === "Other" && <Input className="mt-2" placeholder="Please specify relation" value={otherRel} onChange={(e)=>setOtherRel(e.target.value)} />}
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={busy} className="flex-1">{busy ? "Saving..." : editingId ? "Update" : "Add"}</Button>
                {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Existing Members ({family.length})</h3>
            {loading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading...</p>
            ) : family.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No family members yet.</p>
            ) : (
              <ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto">
                {family.map((f) => (
                  <li key={f.id} className="flex items-start justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.relation} · DOB: {f.dob}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(f)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
