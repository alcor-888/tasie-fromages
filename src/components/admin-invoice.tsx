import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, Save, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveInvoiceAdjustments, getInvoiceDocument } from "@/lib/admin.functions";
import { roundMoney } from "@/lib/order-total";
import { formatEuro } from "@/data/cheeses";

export interface InvoiceItem {
  id: string;
  cheese_name: string;
  quantity: number;
  final_quantity?: number | null;
  unit_price: number;
  unit_label?: string | null;
}

export interface InvoiceOrder {
  id: string;
  invoice_number?: string | null;
  invoiced_at?: string | null;
  order_items?: InvoiceItem[] | null;
}

function download(base64: string, filename: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminInvoice({ order }: { order: InvoiceOrder }) {
  const items = useMemo(() => order.order_items ?? [], [order.order_items]);
  const save = useServerFn(saveInvoiceAdjustments);
  const getDoc = useServerFn(getInvoiceDocument);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.id, String(i.final_quantity ?? i.quantity)]),
    ),
  );

  const lines = items.map((i) => {
    const parsed = Number(String(values[i.id] ?? "").replace(",", "."));
    const finalQuantity = Number.isFinite(parsed) && parsed >= 0 ? parsed : Number(i.quantity);
    return { item: i, finalQuantity, lineTotal: roundMoney(Number(i.unit_price) * finalQuantity) };
  });
  const total = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));

  const saving = useMutation({
    mutationFn: () =>
      save({ data: { orderId: order.id, lines: lines.map((l) => ({ itemId: l.item.id, finalQuantity: l.finalQuantity })) } }),
    onSuccess: (res) => {
      toast.success(`Facture ${res.invoiceNumber} enregistrée (${formatEuro(res.total)})`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloading = useMutation({
    mutationFn: (format: "pdf" | "csv") => getDoc({ data: { orderId: order.id, format } }),
    onSuccess: (res) => download(res.base64, res.filename, res.mimeType),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!items.length) return null;

  return (
    <div className="mt-4 rounded-md border border-border bg-secondary/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="h-4 w-4" />
          Facture finale — ajustement au poids réel
          {order.invoice_number && (
            <span className="text-xs font-normal text-muted-foreground">
              · {order.invoice_number}
              {order.invoiced_at ? ` du ${new Date(order.invoiced_at).toLocaleDateString("fr-FR")}` : ""}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Masquer" : "Ouvrir"}
        </Button>
      </div>

      {open && (
        <>
          <ul className="mt-4 divide-y divide-border">
            {lines.map((l) => (
              <li key={l.item.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-[40%]">{l.item.cheese_name}</span>
                <span className="text-xs text-muted-foreground">
                  commandé : {Number(l.item.quantity)} {l.item.unit_label ?? ""} · {formatEuro(Number(l.item.unit_price))} / {l.item.unit_label ?? "article"}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    className="h-8 w-24"
                    value={values[l.item.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [l.item.id]: e.target.value }))}
                    aria-label={`Quantité réelle pour ${l.item.cheese_name}`}
                  />
                  <span className="w-24 text-right font-medium">{formatEuro(l.lineTotal)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-display text-lg font-semibold">Total facturé : {formatEuro(total)}</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => saving.mutate()} disabled={saving.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={downloading.isPending}
                onClick={() => downloading.mutate("pdf")}
              >
                <FileDown className="h-4 w-4" /> Facture PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={downloading.isPending}
                onClick={() => downloading.mutate("csv")}
              >
                <FileSpreadsheet className="h-4 w-4" /> Facture CSV
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Saisissez le poids ou la quantité réellement livrée. Enregistrez avant de télécharger : les documents
            reprennent le format du bon de commande (PDF et CSV comptable).
          </p>
        </>
      )}
    </div>
  );
}
