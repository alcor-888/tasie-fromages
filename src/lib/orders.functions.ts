import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  cheeseId: z.string().min(1).max(100),
  cheeseName: z.string().min(1).max(200),
  unitPrice: z.number().min(0).max(10000),
  unitLabel: z.string().max(50).optional(),
  quantity: z.number().min(0.1).max(999),
});

const orderSchema = z.object({
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
  .inputValidator((input) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const totalEstimate = data.items.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0,
    );

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
      })
      .select("id, created_at")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Order failed");

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      data.items.map((i) => ({
        order_id: order.id,
        cheese_id: i.cheeseId,
        cheese_name: i.cheeseName,
        unit_price: i.unitPrice,
        unit_label: i.unitLabel ?? null,
        quantity: i.quantity,
        line_total: i.unitPrice * i.quantity,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    try {
      const { notifyAdminsOfOrder } = await import("./orders.server");
      await notifyAdminsOfOrder({
        orderId: order.id,
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

    return { id: order.id, totalEstimate };
  });
