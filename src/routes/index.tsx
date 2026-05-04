import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Truck, Users, MessageSquareWarning } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [{ title: "Public Distribution System" }, { name: "description", content: "Login portal for Admin, Distributors, Customers and the public." }] }),
});

const portals = [
  { to: "/admin/login", icon: Shield, title: "Admin Login", desc: "System administration & ID issuance", tone: "from-[oklch(0.42_0.18_265)] to-[oklch(0.55_0.14_145)]" },
  { to: "/distributor/login", icon: Truck, title: "Distributor Login", desc: "Record ration distribution", tone: "from-[oklch(0.42_0.18_265)] to-[oklch(0.6_0.18_240)]" },
  { to: "/customer/login", icon: Users, title: "Customer Login", desc: "View family & collections", tone: "from-[oklch(0.55_0.14_145)] to-[oklch(0.65_0.14_140)]" },
  { to: "/complaint", icon: MessageSquareWarning, title: "Public Complaint", desc: "File a complaint anonymously", tone: "from-[oklch(0.72_0.16_60)] to-[oklch(0.62_0.2_15)]" },
] as const;

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-6xl px-6 pt-12 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Government Portal</p>
        <h1 className="mt-3 text-5xl font-display font-semibold leading-[1.05] text-foreground sm:text-6xl">
          Public Distribution<br />
          <span className="bg-gradient-warm bg-clip-text text-transparent">System</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          A unified, secure portal connecting administrators, distributors, and customers — with a public channel for complaints.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {portals.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.tone}`} />
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.tone} text-white shadow-soft`}>
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              <span className="mt-5 inline-block text-xs font-medium uppercase tracking-wider text-primary opacity-70 transition-opacity group-hover:opacity-100">Enter →</span>
            </Link>
          ))}
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
