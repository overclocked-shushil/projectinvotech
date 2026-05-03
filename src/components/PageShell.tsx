import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
        } else {
          router.navigate({ to: fallback });
        }
      }}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}

export function PageShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <BackButton />
          <Link to="/" className="text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">PDS</Link>
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
