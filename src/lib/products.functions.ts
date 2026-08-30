import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Cheese } from "@/data/cheeses";
import { getCheeseEmoji } from "@/data/cheeses";

export type ListType = "all" | "curated" | "promotions";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

interface Row {
  id: string;
  name: string;
  region: string | null;
  category: string | null;
  milk: string | null;
  price_label: string | null;
  price_per_kg: number | string | null;
  unit: string | null;
  weight: string | null;
  age: string | null;
  saveur: string | null;
  conseils: string | null;
  fabrication: string | null;
  season: string | null;
  producer: string | null;
  stock: number | null;
  ref: number | null;
  type_desc: string | null;
  fabriquant: string | null;
  ville: string | null;
  department: string | null;
  matiere_grasse: string | null;
  colissage: number | string | null;
  nombre_poids_reel: number | string | null;
  image_url: string | null;
  packaging_unit: string | null;
}

const PRODUCT_COLUMNS =
  "id,name,region,category,milk,price_label,price_per_kg,unit,weight,age,saveur,conseils,fabrication,season,producer,stock,position,ref,type_desc,fabriquant,ville,department,matiere_grasse,colissage,nombre_poids_reel,packaging_unit";

const PRODUCT_DETAIL_COLUMNS = `${PRODUCT_COLUMNS},image_url`;

function formatPercent(raw: string | null | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const s = String(raw).trim();
  if (s.includes("%")) return s;
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n)) return s;
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return `${Number(pct.toFixed(1))} %`;
}

function toCheese(r: Row): Cheese {
  const price = typeof r.price_per_kg === "number" ? r.price_per_kg : parseFloat(String(r.price_per_kg ?? "0")) || 0;
  const saveur = r.saveur ?? undefined;
  const conseils = r.conseils ?? undefined;
  const colissage = r.colissage == null ? undefined : Number(r.colissage) || undefined;
  const npr = r.nombre_poids_reel == null ? undefined : Number(r.nombre_poids_reel) || undefined;
  return {
    id: r.id,
    name: r.name,
    region: r.region ?? undefined,
    category: r.category ?? undefined,
    milk: r.milk ?? undefined,
    pricePerKg: price,
    priceLabel: r.price_label ?? `${price.toFixed(2)} €`,
    unit: r.unit ?? "/ pièce",
    weight: r.weight ?? undefined,
    age: r.age ?? undefined,
    description: r.type_desc ?? saveur ?? conseils,
    emoji: getCheeseEmoji(r.milk ?? undefined),
    fabrication: r.fabrication ?? undefined,
    saveur,
    season: r.season ?? undefined,
    producer: r.producer ?? r.fabriquant ?? undefined,
    conseils,
    stock: r.stock ?? undefined,
    ref: r.ref ?? undefined,
    typeDesc: r.type_desc ?? undefined,
    fabriquant: r.fabriquant ?? undefined,
    ville: r.ville ?? undefined,
    department: r.department ?? undefined,
    matiereGrasse: formatPercent(r.matiere_grasse),
    colissage,
    nombrePoidsReel: npr,
    imageUrl: r.image_url ?? undefined,
    imageSrcSet: (r as unknown as { image_srcset?: string }).image_srcset ?? undefined,
    packagingUnit: r.packaging_unit ?? undefined,
  };
}

async function signVariant(admin: { storage: { from: (b: string) => { createSignedUrl: (p: string, e: number, o?: { transform?: { width?: number; quality?: number; resize?: "cover" | "contain" | "fill" } }) => Promise<{ data: { signedUrl: string } | null; error: unknown }> } } }, path: string, width: number): Promise<string | null> {
  const { data, error } = await admin.storage
    .from("product-photos")
    .createSignedUrl(path, 60 * 60, {
      transform: { width, quality: 75, resize: "contain" },
    });
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Resolve an image reference into a base URL + optional srcset.
 * - Storage paths get signed transform URLs at 400 / 800 (list) or 1200 (detail).
 * - data: / https: URLs are returned as-is (no srcset possible).
 */
async function resolveImage(
  raw: string | null,
  variant: "list" | "detail" = "list",
): Promise<{ url: string | null; srcset?: string }> {
  if (!raw) return { url: null };
  if (/^(data:image\/|https?:\/\/)/i.test(raw)) return { url: raw };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const widths = variant === "detail" ? [800, 1200, 1600] : [300, 600, 900];
  const variants = await Promise.all(widths.map((w) => signVariant(supabaseAdmin, raw, w)));
  const pairs = widths
    .map((w, i) => (variants[i] ? { w, url: variants[i]! } : null))
    .filter((v): v is { w: number; url: string } => v !== null);

  if (pairs.length === 0) {
    // Transforms may be disabled — fall back to the plain signed URL.
    const { data } = await supabaseAdmin.storage
      .from("product-photos")
      .createSignedUrl(raw, 60 * 60);
    return { url: data?.signedUrl ?? null };
  }

  const base = pairs[Math.min(1, pairs.length - 1)].url; // mid width as default src
  const srcset = pairs.map((p) => `${p.url} ${p.w}w`).join(", ");
  return { url: base, srcset };
}

async function resolveImageUrl(raw: string | null): Promise<string | null> {
  const { url } = await resolveImage(raw, "list");
  return url;
}

const listSchema = z.object({ listType: z.enum(["all", "curated", "promotions"]) });

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { listType: ListType }) => listSchema.parse(i))
  .handler(async ({ data, context }): Promise<Cheese[]> => {
    const sb = context.supabase;
    const { data: rows, error } = await sb
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("list_type", data.listType)
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    const baseRows = (rows ?? []) as unknown as Row[];
    const { data: imageRows } = await sb
      .from("products")
      .select("id,image_url")
      .eq("list_type", data.listType)
      .not("image_url", "is", null)
      .not("image_url", "like", "data:%");

    const images = new Map<string, string>();
    const srcsets = new Map<string, string>();
    await Promise.all((imageRows ?? []).map(async (img) => {
      const row = img as { id: string; image_url: string | null };
      const { url, srcset } = await resolveImage(row.image_url, "list");
      if (url) images.set(row.id, url);
      if (srcset) srcsets.set(row.id, srcset);
    }));

    return baseRows.map((r) =>
      toCheese({
        ...r,
        image_url: images.get(r.id) ?? null,
        image_srcset: srcsets.get(r.id) ?? null,
      } as Row & { image_srcset: string | null }),
    );
  });

export const getProductById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<Cheese | null> => {
    const sb = context.supabase;
    const { data: row, error } = await sb
      .from("products")
      .select(PRODUCT_DETAIL_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { url, srcset } = await resolveImage((row as unknown as Row).image_url, "detail");
    return toCheese({
      ...(row as unknown as Row),
      image_url: url,
      image_srcset: srcset ?? null,
    } as Row & { image_srcset: string | null });
  });