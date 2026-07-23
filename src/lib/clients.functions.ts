import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("role", "admin");
  if ((count ?? 0) === 0) throw new Error("Accès réservé aux administrateurs.");
}

const profileFields = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  deliveryAddress: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(255).optional().or(z.literal("")),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as string);
      roleMap.set(r.user_id, arr);
    });
    const { data: profiles } = await supabaseAdmin
      .from("client_profiles")
      .select("*");
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      roles: roleMap.get(u.id) ?? [],
      profile: profileMap.get(u.id) ?? null,
    }));
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    profileFields.extend({
      email: z.string().trim().email().max(255),
      password: z.string().min(6).max(72),
      activationKey: z.string().trim().min(3).max(80),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (uid) {
      const { error: pErr } = await supabaseAdmin.from("client_profiles").upsert({
        user_id: uid,
        activation_key: data.activationKey,
        activated: false,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        company: data.company || null,
        delivery_address: data.deliveryAddress || null,
        phone: data.phone || null,
        email: data.email,
        website: data.website || null,
      });
      if (pErr) throw new Error(pErr.message);
    }
    return { id: created.user?.id ?? "", email: created.user?.email ?? "" };
  });

export const updateClientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    profileFields.extend({
      userId: z.string().uuid(),
      activationKey: z.string().trim().min(3).max(80).optional(),
      resetActivation: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      first_name: string | null;
      last_name: string | null;
      company: string | null;
      delivery_address: string | null;
      phone: string | null;
      website: string | null;
      activation_key?: string;
      activated?: boolean;
      activated_at?: string | null;
    } = {
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      company: data.company || null,
      delivery_address: data.deliveryAddress || null,
      phone: data.phone || null,
      website: data.website || null,
    };
    if (data.activationKey) patch.activation_key = data.activationKey;
    if (data.resetActivation) { patch.activated = false; patch.activated_at = null; }
    const { error } = await supabaseAdmin
      .from("client_profiles")
      .update(patch)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkImportClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      rows: z.array(profileFields.extend({
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        activationKey: z.string().trim().min(3).max(80),
      })).min(1).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let created = 0; let updated = 0; const errors: string[] = [];
    for (const row of data.rows) {
      try {
        // Look up existing user by email
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === row.email.toLowerCase());
        let uid = existing?.id;
        if (!uid) {
          const { data: cr, error } = await supabaseAdmin.auth.admin.createUser({
            email: row.email, password: row.password, email_confirm: true,
          });
          if (error) throw error;
          uid = cr.user?.id!;
          created++;
        } else {
          await supabaseAdmin.auth.admin.updateUserById(uid, { password: row.password });
          updated++;
        }
        const { error: pErr } = await supabaseAdmin.from("client_profiles").upsert({
          user_id: uid,
          activation_key: row.activationKey,
          activated: false,
          first_name: row.firstName || null,
          last_name: row.lastName || null,
          company: row.company || null,
          delivery_address: row.deliveryAddress || null,
          phone: row.phone || null,
          email: row.email,
          website: row.website || null,
        });
        if (pErr) throw pErr;
      } catch (e) {
        errors.push(`${row.email} : ${(e as Error).message}`);
      }
    }
    return { created, updated, failed: errors.length, errors };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- End-user profile fns ---

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId as string,
      email: (context.claims as { email?: string })?.email ?? profile?.email ?? "",
      isAdmin,
      activated: profile?.activated ?? false,
      hasProfile: !!profile,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      company: profile?.company ?? "",
      deliveryAddress: profile?.delivery_address ?? "",
      phone: profile?.phone ?? "",
      website: profile?.website ?? "",
    };
  });

export const activateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("activation_key, activated")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!profile) throw new Error("Aucune fiche client trouvée pour votre compte. Contactez Rodolphe.");
    if (profile.activated) return { ok: true };
    if (profile.activation_key.trim() !== data.key.trim()) {
      throw new Error("Clé d'activation incorrecte.");
    }
    const { error } = await supabaseAdmin
      .from("client_profiles")
      .update({ activated: true, activated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });