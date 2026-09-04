import type { OrderPdfData } from "./order-pdf.server";

// Export CSV « comptabilité » : séparateur point-virgule, décimales à la
// française (virgule) et BOM UTF-8 — format attendu par la majorité des
// logiciels de facturation/comptabilité français (EBP, Sage, Ciel, Excel).

function esc(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

function num(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

const HEADERS = [
  "Numero_bon",
  "Date",
  "Heure",
  "Client_nom",
  "Client_societe",
  "Client_email",
  "Client_telephone",
  "Client_adresse",
  "Date_souhaitee",
  "Ligne",
  "Reference",
  "Designation",
  "Quantite",
  "Unite",
  "Pieces_par_colis",
  "Prix_unitaire_HT",
  "Total_ligne_HT",
  "Total_commande_HT",
  "Devise",
  "Notes",
];

export function buildOrderCsv(data: OrderPdfData): string {
  const isInvoice = data.docKind === "invoice";
  const ref = isInvoice
    ? data.invoiceNumber || `FA-${data.orderId.slice(0, 8).toUpperCase()}`
    : data.orderNumber || `BC-${data.orderId.slice(0, 8).toUpperCase()}`;
  const created = new Date(isInvoice ? (data.invoicedAt ?? data.createdAt) : data.createdAt);
  const date = created.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = created.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });


  const rows = data.items.map((item, idx) =>
    [
      ref,
      date,
      time,
      data.customerName,
      data.customerCompany ?? "",
      data.customerEmail ?? "",
      data.customerPhone,
      (data.customerAddress ?? "").replace(/\r?\n/g, ", "),
      data.pickupDate ?? "",
      idx + 1,
      "",
      item.cheeseName,
      num(item.quantity),
      item.unitLabel ?? "",
      item.piecesPerPack ?? "",
      num(item.unitPrice),
      num(Math.round((item.unitPrice * item.quantity + Number.EPSILON) * 100) / 100),
      num(data.totalEstimate),
      "EUR",
      data.notes ?? "",
    ]
      .map(esc)
      .join(";"),
  );

  return `\uFEFF${HEADERS.join(";")}\r\n${rows.join("\r\n")}\r\n`;
}

export function csvToBase64(csv: string): string {
  const bytes = new TextEncoder().encode(csv);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
