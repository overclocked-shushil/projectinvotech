import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadTransactionPdf, type TxnPdf } from "@/lib/pdf";

export function TransactionList({ transactions }: { transactions: any[] }) {
  if (transactions.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>;
  }
  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-muted-foreground">#{t.id.slice(0, 8)}</p>
              <p className="mt-1 text-sm text-foreground">
                {new Date(t.date_received).toLocaleString()} · <span className="font-medium">{t.status}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Customer: {t.customer?.name} ({t.customer?.ration_id}) · Distributor: {t.distributor?.name}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => downloadTransactionPdf(t as TxnPdf)}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.items?.map((it: any, i: number) => (
              <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                {it.name} · {it.quantity} {it.unit}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
