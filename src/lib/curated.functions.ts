import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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

export type ListType = "promotion" | "selection";

export interface CuratedEntry {
  cheese_id: string;
  list_type: ListType;
  cheese_name: string | null;
}

export const listCurated = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("cheese_lists")
    .select("cheese_id, list_type, cheese_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CuratedEntry[];
});

export const addToList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { cheese_id: string; cheese_name: string; list_type: ListType }) => i)
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { error } = await context.supabase
      .from("cheese_lists")
      .upsert({ cheese_id: data.cheese_id, cheese_name: data.cheese_name, list_type: data.list_type });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { cheese_id: string; list_type: ListType }) => i)
  .handler(async ({ data, context }) => {
    if (!(await isAdminUser(context.userId))) throw new Error("Accès refusé.");
    const { error } = await context.supabase
      .from("cheese_lists")
      .delete()
      .eq("cheese_id", data.cheese_id)
      .eq("list_type", data.list_type);
    if (error) throw new Error(error.message);
    return { ok: true };
  });