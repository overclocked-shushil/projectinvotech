import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { useSession } from "@/lib/session";
import { adminCreateId, adminList, adminUpdateComplaintStatus, adminAddFamily, adminUpdateFamily, adminDeleteFamily, adminListFamily, adminDeleteUser, adminListStocks, adminSetStock, adminSendRegistrationOtp } from "@/server/pds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAME_RE, RATION_ID_RE, RELATIONS, maxDobString, isOldEnough, AGE_ERROR, ENTITLED_ITEMS, unitForItem } from "@/lib/constants";
import { PhoneInput } from "@/components/PhoneInput";
import { isValidIndianMobile, toE164India, formatIndianMobile, INDIAN_MOBILE_ERROR } from "@/lib/phone";
import { toast } from "sonner";
import { TransactionList } from "@/components/TransactionList";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const { loading } = useRequireRole("admin", "/admin/login");
  const { token, user, signOut } = useSession();
  const [data, setData] = useState<{ users: any[]; collections: any[]; complaints: any[] } | null>(null);
  const [tab, setTab] = useState<"create" | "users" | "stock" | "txns" | "complaints">("create");
  const [lowStockCount, setLowStockCount] = useState(0);

  // create form
  const [role, setRole] = useState<"distributor" | "customer">("distributor");
  const [rid, setRid] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // 10 digits, no prefix
  const [busy, setBusy] = useState(false);
  // OTP state for registration
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    if (!otpSent) return;
    const id = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [otpSent]);

  async function refresh() {
    if (!token) return;
    const r = await adminList({ data: { token } });
    setData(r);
  }
  useEffect(() => { if (token) refresh(); }, [token]);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("admin:refresh", h);
    return () => window.removeEventListener("admin:refresh", h);
  }, [token]);

  function resetCreateForm() {
    setRid(""); setName(""); setPhone("");
    setOtpSent(false); setOtpCode(""); setOtpExpiresAt(null); setResendIn(0);
  }

  async function sendRegistrationOtp() {
    if (!isValidIndianMobile(phone)) return toast.error(INDIAN_MOBILE_ERROR);
    setOtpBusy(true);
    try {
      const r = await adminSendRegistrationOtp({ data: { token: token!, phone: toE164India(phone) } });
      setOtpSent(true);
      setOtpExpiresAt(r.expiresAt);
      setResendIn(30);
      if (r.devOtp) toast.info(`Dev OTP: ${r.devOtp}`, { duration: 8000 });
      else toast.success(`OTP sent to ${r.maskedPhone}`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setOtpBusy(false); }
  }

  async function create() {
    const id = rid.trim().toUpperCase(); const n = name.trim();
    if (!RATION_ID_RE.test(id)) return toast.error("Invalid Ration Number.");
    if (!NAME_RE.test(n)) return toast.error("Invalid name.");
    if (!isValidIndianMobile(phone)) return toast.error(INDIAN_MOBILE_ERROR);
    if (!otpSent) return toast.error("Please send and verify OTP first.");
    if (!/^\d{6}$/.test(otpCode)) return toast.error("Enter the 6-digit OTP.");
    setBusy(true);
    try {
      await adminCreateId({ data: { token: token!, rationId: id, role, name: n, phone: toE164India(phone), otpCode } });
      toast.success(`${role} created: ${id}`);
      resetCreateForm();
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading || !user) return null;

  return (
    <PageShell title="Admin Panel" subtitle={`Signed in as ${user.name} (${user.rationId})`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(["create","users","stock","txns","complaints"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab===t?"bg-foreground text-background":"bg-secondary text-secondary-foreground hover:bg-accent"}`}>
              {t === "create" ? "ID Creation"
                : t === "users" ? `Users (${data?.users.length ?? 0})`
                : t === "stock" ? "Stock Management"
                : t === "txns" ? "All Transactions"
                : `Complaints (${data?.complaints.length ?? 0})`}
              {t === "stock" && lowStockCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{lowStockCount}</span>
              )}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>{useLang().t("signOut")}</Button>
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

      {tab === "stock" && (
        <StockManagement token={token!} distributors={(data?.users ?? []).filter((u: any) => u.role === "distributor")} onLowCountChange={setLowStockCount} />
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
  const STATUSES = ["Open", "Under Review", "Resolved"] as const;
  type Status = typeof STATUSES[number];
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = complaints.filter((c) => filter === "All" ? true : (c.status ?? "Open") === filter);
  const counts = {
    All: complaints.length,
    Open: complaints.filter((c) => (c.status ?? "Open") === "Open").length,
    "Under Review": complaints.filter((c) => c.status === "Under Review").length,
    Resolved: complaints.filter((c) => c.status === "Resolved").length,
  } as const;

  async function setStatus(id: string, status: Status) {
    setBusyId(id);
    try {
      await adminUpdateComplaintStatus({ data: { token, complaintId: id, status } });
      toast.success(`Status updated to ${status}.`);
      onChange();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }

  function badgeClass(status: Status) {
    if (status === "Resolved") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    if (status === "Under Review") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["Open", "Under Review", "Resolved", "All"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No complaints.</p>}
      {visible.map((c) => {
        const status = (c.status ?? "Open") as Status;
        return (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{c.name} <span className="text-xs text-muted-foreground">· {c.phone}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Branch: {c.branch}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(status)}`}>{status}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-2 text-sm">{c.reason}</p>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <label className="text-xs text-muted-foreground">Update status:</label>
              <select
                value={status}
                disabled={busyId === c.id}
                onChange={(e) => setStatus(c.id, e.target.value as Status)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
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

function StockManagement({
  token,
  distributors,
  onLowCountChange,
}: {
  token: string;
  distributors: any[];
  onLowCountChange: (n: number) => void;
}) {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDist, setSelectedDist] = useState<string>("");
  const [item, setItem] = useState<string>(ENTITLED_ITEMS[0].name);
  const [qty, setQty] = useState<string>("");
  const [mode, setMode] = useState<"set" | "add">("add");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const r = await adminListStocks({ data: { token } });
      setStocks(r.stocks);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, [token]);

  // Realtime: refresh when any stock row changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-stocks")
      .on("postgres_changes", { event: "*", schema: "public", table: "distributor_stocks" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const lowStock = useMemo(() =>
    stocks.filter((s) => {
      const a = Number(s.assigned_qty), d = Number(s.distributed_qty);
      return a > 0 && (a - d) / a < 0.1;
    }),
    [stocks]
  );

  useEffect(() => { onLowCountChange(lowStock.length); }, [lowStock.length]);

  async function save() {
    if (!selectedDist) return toast.error("Select a distributor.");
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return toast.error("Enter a valid quantity.");
    setBusy(true);
    try {
      await adminSetStock({
        data: { token, distributorId: selectedDist, itemName: item, unit: unitForItem(item), quantity: n, mode },
      });
      toast.success(mode === "set" ? "Stock set." : "Stock refilled.");
      setQty("");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function rowColor(remaining: number, assigned: number) {
    if (assigned === 0) return "";
    const pct = remaining / assigned;
    if (pct < 0.1) return "bg-red-50 dark:bg-red-950/30";
    if (pct <= 0.5) return "bg-yellow-50 dark:bg-yellow-950/30";
    return "";
  }

  return (
    <div className="space-y-6">
      {/* Low stock alerts banner */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <h3 className="font-semibold text-red-700 dark:text-red-300">⚠️ Low Stock Alerts ({lowStock.length})</h3>
          <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-200">
            {lowStock.map((s) => {
              const remaining = Number(s.assigned_qty) - Number(s.distributed_qty);
              return (
                <li key={s.id}>
                  {s.item_name} for Distributor {s.distributor?.name ?? "—"} ({s.distributor?.ration_id ?? "—"}) is below 10%. Only {remaining} {s.unit} remaining.
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Set / refill stock form */}
      <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Set / Refill Stock</h2>
        <p className="text-sm text-muted-foreground">Choose a distributor, an item, and add or overwrite their stock.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Distributor</Label>
            <select value={selectedDist} onChange={(e) => setSelectedDist(e.target.value)}
              className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select...</option>
              {distributors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.ration_id})</option>)}
            </select>
          </div>
          <div>
            <Label>Item</Label>
            <select value={item} onChange={(e) => setItem(e.target.value)}
              className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {ENTITLED_ITEMS.map((it) => <option key={it.name} value={it.name}>{it.name} ({unitForItem(it.name)})</option>)}
            </select>
          </div>
          <div>
            <Label>Quantity ({unitForItem(item)})</Label>
            <Input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Mode</Label>
            <div className="mt-1.5 flex gap-2">
              {(["add", "set"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-lg border px-4 py-2 text-sm capitalize ${mode===m?"border-primary bg-primary/10 text-primary font-medium":"border-border"}`}>
                  {m === "add" ? "Add to existing" : "Overwrite"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={save} disabled={busy} className="mt-5 w-full sm:w-auto">{busy ? "Saving..." : "Save Stock"}</Button>
      </div>

      {/* All stocks table */}
      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">All Distributor Stocks</h3>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : stocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No stocks recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Distributor</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-right">Assigned</th>
                  <th className="p-3 text-right">Distributed</th>
                  <th className="p-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const a = Number(s.assigned_qty), d = Number(s.distributed_qty);
                  const remaining = a - d;
                  return (
                    <tr key={s.id} className={`border-t border-border ${rowColor(remaining, a)}`}>
                      <td className="p-3">{s.distributor?.name ?? "—"} <span className="text-xs text-muted-foreground">({s.distributor?.ration_id ?? "—"})</span></td>
                      <td className="p-3 font-medium">{s.item_name}</td>
                      <td className="p-3 text-right font-mono">{a} {s.unit}</td>
                      <td className="p-3 text-right font-mono">{d} {s.unit}</td>
                      <td className="p-3 text-right font-mono">{remaining} {s.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
