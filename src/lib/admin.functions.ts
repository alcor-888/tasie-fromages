import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdminUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "admin");
  return (count ?? 0) > 0;
}

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Aucun auto-octroi du rôle admin : le rôle doit exister en base.
    if (!(await isAdminUser(context.userId))) {
      throw new Error("Accès réservé aux administrateurs.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, customer_phone, customer_email, pickup_date, notes, total_estimate, status, created_at, order_items(cheese_name, quantity, unit_price, unit_label, line_total)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return orders ?? [];
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("order_items").delete().eq("order_id", data.id);
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "confirmed", "ready", "done", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Facture finale : ajustement de chaque ligne au poids réel constaté, puis
// génération des mêmes documents que le bon de commande (PDF + CSV comptable).
// ---------------------------------------------------------------------------

const invoiceInput = z.object({
  orderId: z.string().uuid(),
  lines: z
    .array(z.object({ itemId: z.string().uuid(), finalQuantity: z.number().min(0).max(9999) }))
    .min(1)
    .max(100),
});

async function loadInvoicePayload(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, invoice_number, invoiced_at, invoice_total, created_at, customer_name, customer_phone, customer_email, customer_company, customer_address, customer_website, pickup_date, notes, total_estimate, order_items(id, cheese_name, quantity, final_quantity, unit_price, unit_label, pieces_per_pack)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Commande introuvable.");

  const o = order as unknown as {
    id: string;
    order_number: string | null;
    invoice_number: string | null;
    invoiced_at: string | null;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    customer_company: string | null;
    customer_address: string | null;
    customer_website: string | null;
    pickup_date: string | null;
    notes: string | null;
    total_estimate: number;
    order_items: {
      id: string;
      cheese_name: string;
      quantity: number;
      final_quantity: number | null;
      unit_price: number;
      unit_label: string | null;
      pieces_per_pack: number | null;
    }[];
  };

  const { roundMoney, computeItemsTotal } = await import("./order-total");
  const items = (o.order_items ?? []).map((i) => {
    const billed = i.final_quantity == null ? Number(i.quantity) : Number(i.final_quantity);
    return {
      cheeseName: i.cheese_name,
      quantity: roundMoney(billed),
      orderedQuantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      unitLabel: i.unit_label,
      piecesPerPack: i.pieces_per_pack == null ? null : Number(i.pieces_per_pack),
    };
  });

  return {
    docKind: "invoice" as const,
    orderId: o.id,
    orderNumber: o.order_number,
    invoiceNumber: o.invoice_number,
    invoicedAt: o.invoiced_at,
    createdAt: o.created_at,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    customerCompany: o.customer_company,
    customerAddress: o.customer_address,
    customerWebsite: o.customer_website,
    pickupDate: o.pickup_date,
    notes: o.notes,
    totalEstimate: computeItemsTotal(items),
    items,
  };
}

/** Enregistre les quantités réelles et attribue (une seule fois) un n° de facture. */
export const saveInvoiceAdjustments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => invoiceInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { roundMoney } = await import("./order-total");

    const { data: existing, error: readErr } = await supabaseAdmin
      .from("order_items")
      .select("id, order_id, unit_price")
      .eq("order_id", data.orderId);
    if (readErr) throw new Error(readErr.message);
    const byId = new Map((existing ?? []).map((i) => [i.id, i]));

    for (const line of data.lines) {
      if (!byId.has(line.itemId)) throw new Error("Ligne de commande inconnue.");
      const item = byId.get(line.itemId)!;
      const { error } = await supabaseAdmin
        .from("order_items")
        .update({
          final_quantity: line.finalQuantity,
          line_total: roundMoney(Number(item.unit_price) * line.finalQuantity),
        } as never)
        .eq("id", line.itemId);
      if (error) throw new Error(error.message);
    }

    const payload = await loadInvoicePayload(data.orderId);
    let invoiceNumber = payload.invoiceNumber;
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      const { data: seq, error: seqErr } = await supabaseAdmin.rpc("nextval" as never, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as never);
      void seqErr;
      const counter = (seq as unknown as number) ?? null;
      invoiceNumber = `FA-${year}-${String(counter ?? Date.now() % 100000).padStart(5, "0")}`;
    }

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        invoice_number: invoiceNumber,
        invoiced_at: new Date().toISOString(),
        invoice_total: payload.totalEstimate,
      } as never)
      .eq("id", data.orderId);
    if (updErr) throw new Error(updErr.message);

    return { invoiceNumber, total: payload.totalEstimate };
  });

/** Renvoie la facture finale en PDF ou en CSV comptable (base64). */
export const getInvoiceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ orderId: z.string().uuid(), format: z.enum(["pdf", "csv"]).default("pdf") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const payload = await loadInvoicePayload(data.orderId);
    const ref = payload.invoiceNumber || `FA-${payload.orderId.slice(0, 8).toUpperCase()}`;
    const base = `facture-${ref}`;

    if (data.format === "csv") {
      const { buildOrderCsv, csvToBase64 } = await import("./order-csv.server");
      return {
        filename: `${base}.csv`,
        mimeType: "text/csv;charset=utf-8",
        base64: csvToBase64(buildOrderCsv(payload)),
      };
    }
    const { buildOrderPdf, toBase64 } = await import("./order-pdf.server");
    return {
      filename: `${base}.pdf`,
      mimeType: "application/pdf",
      base64: toBase64(await buildOrderPdf(payload)),
    };
  });
