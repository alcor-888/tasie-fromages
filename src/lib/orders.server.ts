// Server-only helper to notify admins of new orders.
// This is the Brevo configuration validated on 30 August 2026. Keep order
// notifications on this single channel so a broken fallback cannot mask a
// failed Brevo delivery.

const ADMIN_EMAILS = [
  "alaincorrente@gmail.com",
  "bardet.rodolphe@gmail.com",
];

export const ORDER_EMAIL_CONFIG = {
  gatewayUrl: "https://connector-gateway.lovable.dev/brevo/smtp/email",
  sender: { name: "Tasie Fromages", email: "bardet.rodolphe@gmail.com" },
  recipients: ADMIN_EMAILS,
} as const;

interface NotifyPayload {
  orderId: string;
  orderNumber?: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerCompany?: string | null;
  customerAddress?: string | null;
  customerWebsite?: string | null;
  pickupDate: string | null;
  notes: string | null;
  totalEstimate: number;
  items: {
    cheeseName: string;
    quantity: number;
    unitPrice: number;
    unitLabel?: string;
    piecesPerPack?: number | null;
  }[];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function orderRef(p: NotifyPayload) {
  return p.orderNumber || `BC-${p.orderId.slice(0, 8).toUpperCase()}`;
}

function renderHtml(p: NotifyPayload) {
  const rows = p.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${escape(i.cheeseName)}${
          i.piecesPerPack && i.piecesPerPack > 1
            ? `<br/><span style="font-size:12px;color:#666">Prix ${/kg/i.test(i.unitLabel ?? "") ? "au kilo" : "à la pièce"} ${(i.unitPrice / i.piecesPerPack).toFixed(2)} € · ${escape(i.unitLabel ?? "")} · <strong>prix du colis ${i.unitPrice.toFixed(2)} €</strong></span>`
            : `<br/><span style="font-size:12px;color:#666"><strong>Prix à l'article ${i.unitPrice.toFixed(2)} €</strong></span>`
        }</td>

        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity} ${escape(i.unitLabel ?? "")}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${(i.unitPrice * i.quantity).toFixed(2)} €</td>
      </tr>`,
    )
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#222">
    <h2 style="font-family:Georgia,serif">Nouveau bon de commande</h2>
    <p style="margin:0 0 4px"><strong>N° ${escape(orderRef(p))}</strong></p>
    <p style="margin:0 0 12px;color:#666">Émis le ${escape(formatDateTime(p.createdAt))}</p>
    <p><strong>${escape(p.customerName)}</strong> · ${escape(p.customerPhone)}${p.customerEmail ? ` · ${escape(p.customerEmail)}` : ""}</p>
    ${p.customerCompany ? `<p><strong>Entreprise :</strong> ${escape(p.customerCompany)}</p>` : ""}
    ${p.customerAddress ? `<p><strong>Adresse de livraison :</strong><br/>${escape(p.customerAddress).replace(/\n/g, "<br/>")}</p>` : ""}
    ${p.customerWebsite ? `<p><strong>Site :</strong> ${escape(p.customerWebsite)}</p>` : ""}
    ${p.pickupDate ? `<p>Retrait souhaité le <strong>${escape(p.pickupDate)}</strong></p>` : ""}
    ${p.notes ? `<p><em>Notes :</em> ${escape(p.notes)}</p>` : ""}
    <table style="border-collapse:collapse;width:100%;margin-top:12px">
      <thead><tr style="background:#f6f4ef;text-align:left">
        <th style="padding:8px 10px">Fromage</th><th style="padding:8px 10px;text-align:center">Quantité</th><th style="padding:8px 10px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;font-size:18px;margin-top:12px"><strong>Estimation : ${p.totalEstimate.toFixed(2)} €</strong></p>
    <p style="font-size:12px;color:#666">Commande #${p.orderId} · reçue le ${new Date(p.createdAt).toLocaleString("fr-FR")}</p>
  </div>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

interface BrevoMessage {
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}

export async function sendBrevoOrderEmail(
  message: BrevoMessage,
  request: typeof fetch = fetch,
) {
  const connectionKey = process.env["BREVO_API_KEY"];
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (!connectionKey || !lovableApiKey) {
    throw new Error("La connexion Brevo de l’application est absente.");
  }

  const response = await request(ORDER_EMAIL_CONFIG.gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({
      sender: ORDER_EMAIL_CONFIG.sender,
      to: ORDER_EMAIL_CONFIG.recipients.map((email) => ({ email })),
      replyTo: message.replyTo ? { email: message.replyTo } : undefined,
      subject: message.subject,
      htmlContent: message.html,
      attachment: message.attachments?.map((item) => ({
        name: item.filename,
        content: item.content,
      })),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`[orders] Brevo send failed [${response.status}]: ${detail}`);
    throw new Error(`Brevo a refusé l’envoi (${response.status}) : ${detail}`);
  }
}

export async function notifyAdminsOfOrder(payload: NotifyPayload) {
  console.log(`[orders] New order ${payload.orderId} for ${payload.customerName} — ${payload.totalEstimate.toFixed(2)}€`);

  const ref = orderRef(payload);
  const html = renderHtml(payload);
  const subject = `Bon de commande n° ${ref} — ${payload.customerName} (${payload.totalEstimate.toFixed(2)}€)`;

  // Pièces jointes : PDF (lecture humaine) + CSV (import en facturation/compta)
  let attachments: { filename: string; content: string }[] | undefined;
  const pdfData = {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber ?? null,
    createdAt: payload.createdAt,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    customerEmail: payload.customerEmail,
    customerCompany: payload.customerCompany ?? null,
    customerAddress: payload.customerAddress ?? null,
    customerWebsite: payload.customerWebsite ?? null,
    pickupDate: payload.pickupDate,
    notes: payload.notes,
    totalEstimate: payload.totalEstimate,
    items: payload.items,
  };
  try {
    const { buildOrderPdf, toBase64 } = await import("./order-pdf.server");
    const bytes = await buildOrderPdf(pdfData);
    attachments = [
      {
        filename: `bon-de-commande-${ref}.pdf`,
        content: toBase64(bytes),
      },
    ];
  } catch (e) {
    console.error("[orders] PDF generation failed:", e);
  }
  try {
    const { buildOrderCsv, csvToBase64 } = await import("./order-csv.server");
    attachments = [
      ...(attachments ?? []),
      {
        filename: `bon-de-commande-${ref}.csv`,
        content: csvToBase64(buildOrderCsv(pdfData)),
      },
    ];
  } catch (e) {
    console.error("[orders] CSV generation failed:", e);
  }


  await sendBrevoOrderEmail({
    subject,
    html,
    replyTo: payload.customerEmail || undefined,
    attachments,
  });
  console.log(`[orders] Brevo email sent for order ${ref}`);
}
