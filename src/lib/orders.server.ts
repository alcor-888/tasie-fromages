// Server-only helper to notify admins of new orders.
// Primary delivery: Brevo (BREVO_API_KEY, sender = BREVO_SENDER_EMAIL or a
// validated sender of the Brevo account). Fallbacks: Lovable managed email,
// then Resend. The order always remains visible in the /admin dashboard.

const ADMIN_EMAILS = [
  "alaincorrente@gmail.com",
  "bardet.rodolphe@gmail.com",
];

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
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${escape(i.cheeseName)}</td>
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

export async function notifyAdminsOfOrder(payload: NotifyPayload) {
  console.log(`[orders] New order ${payload.orderId} for ${payload.customerName} — ${payload.totalEstimate.toFixed(2)}€`);

  const ref = orderRef(payload);
  const html = renderHtml(payload);
  const subject = `Bon de commande n° ${ref} — ${payload.customerName} (${payload.totalEstimate.toFixed(2)}€)`;

  // Build the PDF attachment (shared by Brevo and Resend fallbacks)
  let attachments: { filename: string; content: string }[] | undefined;
  try {
    const { buildOrderPdf, toBase64 } = await import("./order-pdf.server");
    const bytes = await buildOrderPdf({
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
    });
    attachments = [
      {
        filename: `bon-de-commande-${ref}.pdf`,
        content: toBase64(bytes),
      },
    ];
  } catch (e) {
    console.error("[orders] PDF generation failed:", e);
  }

  // Primary path: Brevo transactional email (sender must be a validated
  // sender in the Brevo account; override with BREVO_SENDER_EMAIL secret).
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  if (BREVO_API_KEY && LOVABLE_API_KEY) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || "bardet.rodolphe@gmail.com";
      const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: "Tasie Fromages", email: senderEmail },
          to: ADMIN_EMAILS.map((email) => ({ email })),
          replyTo: payload.customerEmail ? { email: payload.customerEmail } : undefined,
          subject,
          htmlContent: html,
          attachment: attachments?.map((a) => ({ name: a.filename, content: a.content })),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error(`[orders] Brevo send failed [${res.status}]: ${txt}`);
        throw new Error(`Brevo ${res.status}: ${txt}`);
      }
      console.log(`[orders] Brevo email sent for order ${ref}`);
      return;
    } catch (e) {
      console.error("[orders] Brevo send failed, trying fallbacks:", e);
    }
  } else {
    console.warn("[orders] Brevo not configured — skipping Brevo path.");
  }

  // Fallback: Lovable managed email (sender domain notify.tasie-fromages.fr)
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const templateData = {
      orderRef: ref,
      emittedAt: formatDateTime(payload.createdAt),
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      customerCompany: payload.customerCompany ?? null,
      customerAddress: payload.customerAddress ?? null,
      customerWebsite: payload.customerWebsite ?? null,
      notes: payload.notes,
      totalEstimate: payload.totalEstimate,
      items: payload.items.map((i) => ({
        name: i.cheeseName,
        quantity: i.quantity,
        unitLabel: i.unitLabel,
        lineTotal: i.unitPrice * i.quantity,
      })),
    };
    for (const admin of ADMIN_EMAILS) {
      await sendTemplateEmail("order-notification", admin, {
        templateData,
        idempotencyKey: `order-notification-${payload.orderId}-${admin}`,
        replyTo: payload.customerEmail || undefined,
      });
    }
    console.log(`[orders] Managed email sent for order ${ref}`);
    return;
  } catch (e) {
    console.error("[orders] Managed email send failed, falling back to Resend:", e);
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
    console.warn("[orders] Email notification skipped — no email provider configured.");
    return;
  }

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: "Tasie Fromages <onboarding@resend.dev>",
      to: ADMIN_EMAILS,
      reply_to: payload.customerEmail || undefined,
      subject,
      html,
      attachments,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
}
