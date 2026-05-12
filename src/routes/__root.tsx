import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { SessionProvider } from "@/lib/session";
import { LangProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Public Distribution System" },
      { name: "description", content: "Secure ration distribution portal for Admin, Distributors, and Customers." },
      { property: "og:title", content: "Public Distribution System" },
      { name: "twitter:title", content: "Public Distribution System" },
      { property: "og:description", content: "Secure ration distribution portal for Admin, Distributors, and Customers." },
      { name: "twitter:description", content: "Secure ration distribution portal for Admin, Distributors, and Customers." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/951d00c6-babf-45ce-8e53-af96761ece54" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/951d00c6-babf-45ce-8e53-af96761ece54" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <LangProvider>
      <SessionProvider>
        <Outlet />
        <Toaster />
      </SessionProvider>
    </LangProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

const themeBootstrap = `(function(){try{var t=localStorage.getItem('pds.theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
