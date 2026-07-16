// Server-only helper to notify admins of new orders.
// Email delivery is wired to Resend when RESEND_API_KEY is present in the
// project secrets; otherwise the order is just logged to the server console
// and remains visible in the /admin dashboard.

const ADMIN_EMAILS = [
  "alaincorrente@gmail.com",
  "bardet.rodolphe@gmail.com",
];

interface NotifyPayload {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  pickupDate: string | null;
  notes: string | null;
  totalEstimate: number;
  items: {
    cheeseName: string;
    quantity: number;
    unitPrice: number;
    unitLabel?: string;
  }[];
}

function renderHtml(p: NotifyPayload) {
  const rows = p.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${escape(i.cheeseName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${i.quantity} ${escape(i.unitLabel ?? "")}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${(i.unitPrice * i.quantity).toFixed(2)} €</td>
      </tr>`,
    )
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;color:#222">
    <h2 style="font-family:Georgia,serif">Nouveau bon de commande</h2>
    <p><strong>${escape(p.customerName)}</strong> · ${escape(p.customerPhone)}${p.customerEmail ? ` · ${escape(p.customerEmail)}` : ""}</p>
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

export async function notifyAdminsOfOrder(payload: NotifyPayload) {
  console.log(`[orders] New order ${payload.orderId} for ${payload.customerName} — ${payload.totalEstimate.toFixed(2)}€`);

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    console.warn("[orders] Email notification skipped — RESEND not configured.");
    return;
  }

  const html = renderHtml(payload);
  const subject = `Nouvelle commande — ${payload.customerName} (${payload.totalEstimate.toFixed(2)}€)`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "La Cave Tasie Fromages <onboarding@resend.dev>",
      to: ADMIN_EMAILS,
      reply_to: payload.customerEmail || undefined,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
}
