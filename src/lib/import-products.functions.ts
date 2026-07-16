import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ImportRow {
  fields: Record<string, string | number | undefined | null>;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

const schema = z.object({
  listType: z.enum(["all", "curated", "promotions"]),
  rows: z
    .array(z.object({ fields: z.record(z.union([z.string(), z.number(), z.null()]).optional()) }))
    .min(1)
    .max(2000),
});

function s(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[^0-9,.\-]/g, "").replace(",", ".");
  const x = parseFloat(cleaned);
  return Number.isFinite(x) ? x : null;
}

function i(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = parseInt(String(v).replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(x) ? x : null;
}

function normalizeUnit(raw: string | null): string {
  if (!raw) return "/ pièce";
  return raw.toLowerCase().startsWith("kg") ? "/ kg" : "/ pièce";
}

/** Match a field with several possible header spellings (case/accent-insensitive). */
function pick(f: Record<string, unknown>, keys: string[]): unknown {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const map = new Map(Object.keys(f).map((k) => [norm(k), k]));
  for (const k of keys) {
    const hit = map.get(norm(k));
    if (hit != null) return f[hit];
  }
  return undefined;
}

export const importProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }): Promise<ImportResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Replace the list: delete existing rows for that list_type, then insert new ones.
    const del = await supabaseAdmin.from("products").delete().eq("list_type", data.listType);
    if (del.error) throw new Error(del.error.message);

    const rows = data.rows
      .map((r, idx) => {
        const f = r.fields ?? {};
        const name = s(pick(f, ["Nom", "Libellé", "Libelle", "Name"]));
        if (!name) return null;
        // "Prix article" = prix unitaire utilisé au panier (colonne N)
        const priceArticle = n(pick(f, ["Prix article", "Prix", "Price"])) ?? 0;
        const priceText = s(pick(f, ["Prix pièce ou Kg", "Prix piece ou Kg", "Prix texte", "Prix affiché"]));
        const priceTextNum = n(pick(f, ["Prix pièce ou Kg", "Prix piece ou Kg", "Prix texte", "Prix affiché"]));
        const packagingUnit = s(pick(f, ["Nbre ou Poids", "Nbre / Poids", "Unité", "Unite"]));
        const priceLabel = priceText
          ? (priceTextNum != null ? `${priceTextNum.toFixed(2)} €` : priceText)
          : `${priceArticle.toFixed(2)} €`;
        return {
          list_type: data.listType,
          position: idx,
          name,
          ref: i(pick(f, ["Ref", "Réf", "Reference"])),
          region: s(pick(f, ["Département", "Departement", "Origine", "Region", "Région"])),
          department: s(pick(f, ["Département", "Departement"])),
          ville: s(pick(f, ["Ville"])),
          category: s(pick(f, ["Pâte", "Pate", "Type de pate", "Catégorie", "Categorie"])),
          type_desc: s(pick(f, ["Type", "Description", "Type de fromage"])),
          milk: s(pick(f, ["Lait", "Type de lait", "Milk"])),
          price_label: priceLabel,
          price_per_kg: priceArticle,
          unit: normalizeUnit(packagingUnit),
          packaging_unit: packagingUnit,
          weight: s(pick(f, ["Poids de la pièce", "Poids de la piece", "Poids", "Weight"])),
          age: s(pick(f, ["Affinage", "Temps d'affinage", "Age"])),
          matiere_grasse: s(pick(f, ["Matière grasse", "Matiere grasse", "MG"])),
          fabrication: s(pick(f, ["Fabrication"])),
          fabriquant: s(pick(f, ["Fabriquant", "Fabricant", "Producteur", "Producer"])),
          producer: s(pick(f, ["Fabriquant", "Fabricant", "Producteur", "Producer"])),
          colissage: n(pick(f, ["Colisage", "Colissage"])),
          nombre_poids_reel: n(pick(f, ["Nombre ou poids réel", "Nombre ou poids reel", "Nombre/poids réel"])),
          image_url: s(pick(f, ["Photo", "Image", "Image URL"])),
          saveur: s(pick(f, ["Saveur", "Flavor"])),
          conseils: s(pick(f, ["Conseils", "Conseil", "Notes"])),
          season: s(pick(f, ["Saisonnalité", "Saisonnalite", "Saison"])),
          stock: i(pick(f, ["Stock", "Quantité", "Quantite"])),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const result: ImportResult = { created: 0, failed: 0, errors: [] };
    const BATCH = 50;
    for (let k = 0; k < rows.length; k += BATCH) {
      const chunk = rows.slice(k, k + BATCH);
      let attempt = 0;
      let lastErr: string | null = null;
      while (attempt < 3) {
        const ins = await supabaseAdmin.from("products").insert(chunk);
        if (!ins.error) { lastErr = null; break; }
        lastErr = ins.error.message;
        attempt++;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
      if (lastErr) {
        result.failed += chunk.length;
        result.errors.push(`Lot ${k}-${k + chunk.length}: ${lastErr.slice(0, 200)}`);
      } else {
        result.created += chunk.length;
      }
    }
    return result;
  });