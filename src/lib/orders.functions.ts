import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  cheeseId: z.string().min(1).max(100),
  cheeseName: z.string().min(1).max(200),
  unitPrice: z.number().min(0).max(10000),
  unitLabel: z.string().max(50).optional(),
  piecesPerPack: z.number().min(0).max(100000).optional(),
  quantity: z.number().min(0.1).max(999),
});

const orderSchema = z.object({
  clientTotal: z.number().min(0).max(1000000).optional(),
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z.string().trim().min(3).max(30),
  customerEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  customerCompany: z.string().trim().max(160).optional().or(z.literal("")),
  customerAddress: z.string().trim().max(500).optional().or(z.literal("")),
  customerWebsite: z.string().trim().max(255).optional().or(z.literal("")),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
  items: z.array(itemSchema).min(1).max(50),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { computeItemsTotal, checkTotals } = await import("./order-total");
    const totalEstimate = computeItemsTotal(data.items);

    // Contrôle de cohérence : le total du panier envoyé par le client doit
    // correspondre au total recalculé côté serveur.
    if (data.clientTotal != null) {
      const check = checkTotals(totalEstimate, data.clientTotal);
      if (!check.ok) {
        throw new Error(
          `Incohérence de total : panier ${check.actual.toFixed(2)}€ vs bon de commande ${check.expected.toFixed(2)}€ (écart ${check.diff.toFixed(2)}€). Commande non enregistrée.`,
        );
      }
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        customer_company: data.customerCompany || null,
        customer_address: data.customerAddress || null,
        customer_website: data.customerWebsite || null,
        pickup_date: data.pickupDate || null,
        notes: data.notes || null,
        total_estimate: totalEstimate,
        status: "new",
        user_id: context.userId,
      })
      .select("id, created_at, order_number")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Order failed");

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      data.items.map((i) => ({
        order_id: order.id,
        cheese_id: i.cheeseId,
        cheese_name: i.cheeseName,
        unit_price: i.unitPrice,
        unit_label: i.unitLabel ?? null,
        pieces_per_pack: i.piecesPerPack ?? null,
        quantity: i.quantity,
        line_total: Math.round((i.unitPrice * i.quantity + Number.EPSILON) * 100) / 100,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    try {
      const { notifyAdminsOfOrder } = await import("./orders.server");
      await notifyAdminsOfOrder({
        orderId: order.id,
        orderNumber: order.order_number,
        createdAt: order.created_at,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        customerCompany: data.customerCompany || null,
        customerAddress: data.customerAddress || null,
        customerWebsite: data.customerWebsite || null,
        pickupDate: data.pickupDate || null,
        notes: data.notes || null,
        totalEstimate,
        items: data.items,
      });
    } catch (e) {
      console.error("[orders] admin notification failed:", e);
    }

    return { id: order.id, orderNumber: order.order_number, createdAt: order.created_at, totalEstimate };
  });

export const getOrderPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, user_id, order_number, created_at, customer_name, customer_phone, customer_email, customer_company, customer_address, customer_website, pickup_date, notes, total_estimate, order_items(cheese_name, quantity, unit_price, unit_label, pieces_per_pack)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Commande introuvable.");

    // Seuls le client propriétaire de la commande et les administrateurs
    // peuvent télécharger le bon de commande.
    if (order.user_id !== context.userId) {
      const { assertAdmin } = await import("@/lib/admin-guard.server");
      await assertAdmin(context.userId);
    }



    const { buildOrderPdf, toBase64 } = await import("./order-pdf.server");
    const bytes = await buildOrderPdf({
      orderId: order.id,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      customerCompany: order.customer_company,
      customerAddress: order.customer_address,
      customerWebsite: order.customer_website,
      pickupDate: order.pickup_date,
      notes: order.notes,
      totalEstimate: Number(order.total_estimate ?? 0),
      items: (order.order_items ?? []).map((i) => ({
        cheeseName: i.cheese_name,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        unitLabel: i.unit_label,
        piecesPerPack: i.pieces_per_pack == null ? null : Number(i.pieces_per_pack),
      })),
    });

    return {
      filename: `bon-de-commande-${order.order_number ?? order.id.slice(0, 8)}.pdf`,
      base64: toBase64(bytes),
    };
  });
