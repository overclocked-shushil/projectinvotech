import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Truck, Users, MessageSquareWarning } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLang, LanguageToggle, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({ meta: [{ title: "Public Distribution System" }, { name: "description", content: "Login portal for Admin, Distributors, Customers and the public." }] }),
});

type Lang = "en" | "hi" | "kn";
const LANG_KEY = "pds.lang";
const LANG_ORDER: Lang[] = ["en", "hi", "kn"];
const LANG_LABEL: Record<Lang, string> = { en: "EN", hi: "हिं", kn: "ಕನ್ನಡ" };

const T = {
  heading: { en: "Public Distribution System", hi: "सार्वजनिक वितरण प्रणाली", kn: "ಸಾರ್ವಜನಿಕ ವಿತರಣಾ ವ್ಯವಸ್ಥೆ" },
  sub: { en: "Manage ration distribution efficiently", hi: "राशन वितरण को कुशलतापूर्वक प्रबंधित करें", kn: "ರೇಷನ್ ವಿತರಣೆಯನ್ನು ಸಮರ್ಥವಾಗಿ ನಿರ್ವಹಿಸಿ" },
  govt: { en: "Government Portal", hi: "सरकारी पोर्टल", kn: "ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್" },
  enter: { en: "Enter →", hi: "प्रवेश करें →", kn: "ಪ್ರವೇಶಿಸಿ →" },
} as const;

const portals: { to: string; icon: any; key: "admin" | "distributor" | "customer" | "complaint"; tone: string }[] = [
  { to: "/admin/login", icon: Shield, key: "admin", tone: "from-[oklch(0.42_0.18_265)] to-[oklch(0.55_0.14_145)]" },
  { to: "/distributor/login", icon: Truck, key: "distributor", tone: "from-[oklch(0.42_0.18_265)] to-[oklch(0.6_0.18_240)]" },
  { to: "/customer/login", icon: Users, key: "customer", tone: "from-[oklch(0.55_0.14_145)] to-[oklch(0.65_0.14_140)]" },
  { to: "/complaint", icon: MessageSquareWarning, key: "complaint", tone: "from-[oklch(0.72_0.16_60)] to-[oklch(0.62_0.2_15)]" },
];

const CARD: Record<string, Record<Lang, { title: string; desc: string }>> = {
  admin: {
    en: { title: "Admin Login", desc: "System administration" },
    hi: { title: "व्यवस्थापक लॉगिन", desc: "सिस्टम प्रशासन" },
    kn: { title: "ನಿರ್ವಾಹಕ ಲಾಗಿನ್", desc: "ವ್ಯವಸ್ಥೆ ಆಡಳಿತ" },
  },
  distributor: {
    en: { title: "Distributor Login", desc: "Manage distributions" },
    hi: { title: "वितरक लॉगिन", desc: "वितरण प्रबंधित करें" },
    kn: { title: "ವಿತರಕ ಲಾಗಿನ್", desc: "ವಿತರಣೆ ನಿರ್ವಹಿಸಿ" },
  },
  customer: {
    en: { title: "Customer Login", desc: "Access your ration account" },
    hi: { title: "ग्राहक लॉगिन", desc: "अपना राशन खाता देखें" },
    kn: { title: "ಗ್ರಾಹಕ ಲಾಗಿನ್", desc: "ನಿಮ್ಮ ರೇಷನ್ ಖಾತೆ ತೆರೆಯಿರಿ" },
  },
  complaint: {
    en: { title: "Public Complaint", desc: "File your complaint here" },
    hi: { title: "सार्वजनिक शिकायत", desc: "यहाँ अपनी शिकायत दर्ज करें" },
    kn: { title: "ಸಾರ್ವಜನಿಕ ದೂರು", desc: "ನಿಮ್ಮ ದೂರನ್ನು ಇಲ್ಲಿ ದಾಖಲಿಸಿ" },
  },
};

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem(LANG_KEY)) as Lang | null;
    if (saved && LANG_ORDER.includes(saved)) setLang(saved);
  }, []);
  function cycle() {
    const idx = LANG_ORDER.indexOf(lang);
    const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-6 pt-6">
        <button
          onClick={cycle}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft transition-colors hover:bg-accent"
          aria-label="Change language"
          title={`Current: ${LANG_LABEL[lang]}`}
        >
          {LANG_ORDER.map((l, i) => (
            <span key={l} className={l === lang ? "text-primary" : "text-muted-foreground"}>
              {LANG_LABEL[l]}{i < LANG_ORDER.length - 1 ? " | " : ""}
            </span>
          ))}
        </button>
        <ThemeToggle />
      </div>
      <header className="mx-auto max-w-6xl px-6 pt-8 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{T.govt[lang]}</p>
        <h1 className="mt-3 text-5xl font-display font-semibold leading-[1.05] text-foreground sm:text-6xl">
          {T.heading[lang]}
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          {T.sub[lang]}
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {portals.map((p) => {
            const c = CARD[p.key][lang];
            return (
              <Link
                key={p.to}
                to={p.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.tone}`} />
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${p.tone} text-white shadow-soft`}>
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
                <span className="mt-5 inline-block text-xs font-medium uppercase tracking-wider text-primary opacity-70 transition-opacity group-hover:opacity-100">{T.enter[lang]}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
