import { createServerFn } from "@tanstack/react-start";
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
    if (!(await isAdminUser(context.userId))) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) === 0) {
        await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      } else {
        throw new Error("Accès réservé aux administrateurs.");
      }
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

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "new" | "confirmed" | "ready" | "done" | "cancelled" }) => input)
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
