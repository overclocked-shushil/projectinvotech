import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle, useLang } from "@/lib/i18n";

function dashboardRoot(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/distributor")) return "/distributor";
  if (pathname.startsWith("/customer")) return "/customer";
  return "/";
}

export function BackButton({ fallback }: { fallback?: string }) {
  const router = useRouter();
  const location = useLocation();
  const { t } = useLang();
  const root = fallback ?? dashboardRoot(location.pathname);
  const isAtRoot = location.pathname === root || location.pathname === root + "/";

  if (isAtRoot) return <span />;

  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.history.back();
          setTimeout(() => {
            const path = window.location.pathname;
            if (path === "/" || path.endsWith("/login")) {
              router.navigate({ to: root });
            }
          }, 50);
        } else {
          router.navigate({ to: root });
        }
      }}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label={t("back")}
    >
      <ArrowLeft className="h-4 w-4" />
      {t("back")}
    </button>
  );
}

export function PageShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <BackButton />
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">PDS</Link>
            <ThemeToggle />
          </div>
        </div>
        {title && (
          <header className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
