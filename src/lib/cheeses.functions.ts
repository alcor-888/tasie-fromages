import { createServerFn } from "@tanstack/react-start";
import type { Cheese } from "@/data/cheeses";
import { getCheeseEmoji } from "@/data/cheeses";

const BASE_ID = "appJ8c6pgwqgy29H5";
const TABLE = "Feuil1";
const GATEWAY = "https://connector-gateway.lovable.dev/airtable";

function parsePrice(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9,.\-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseStock(raw?: string): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseInt(String(raw).replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeUnit(raw?: string): string {
  if (!raw) return "/ pièce";
  const v = raw.toLowerCase();
  if (v.startsWith("kg")) return "/ kg";
  return "/ pièce";
}

function cleanText(raw?: string): string | undefined {
  if (raw == null) return undefined;
  const v = String(raw).trim();
  return v.length ? v : undefined;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

function mapRecord(rec: AirtableRecord): Cheese {
  const f = rec.fields;
  const milk = cleanText(f["Type de lait"] as string | undefined);
  const name = cleanText(f["Libellé"] as string | undefined) ?? "Sans nom";
  const unitRaw = cleanText(f["Poids ou pièce"] as string | undefined);
  const price = parsePrice(f["Prix"] as string | undefined);
  const saveur = cleanText(f["Saveur"] as string | undefined);
  const conseils = cleanText(f["Conseils"] as string | undefined);
  return {
    id: rec.id,
    name: name.replace(/\s{2,}/g, " "),
    region: cleanText(f["Origine"] as string | undefined),
    category: cleanText(f["Type de pate"] as string | undefined),
    milk,
    pricePerKg: price,
    priceLabel: cleanText(f["Prix"] as string | undefined) ?? `${price.toFixed(2)} €`,
    unit: normalizeUnit(unitRaw),
    weight: cleanText(f["Poids"] as string | undefined),
    age: cleanText(f["Temps d'affinage"] as string | undefined),
    description: saveur ?? conseils,
    emoji: getCheeseEmoji(milk),
    fabrication: cleanText(f["Fabrication"] as string | undefined),
    saveur,
    season: cleanText(f["Saisonnalité"] as string | undefined),
    producer: cleanText(f["Producteur"] as string | undefined),
    conseils,
    stock: parseStock(f["Stock"] as string | undefined),
  };
}

export const listCheeses = createServerFn({ method: "GET" }).handler(
  async (): Promise<Cheese[]> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!lovableKey || !airtableKey) {
      throw new Error("Airtable n'est pas configuré (clés manquantes).");
    }

    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const url = new URL(`${GATEWAY}/v0/${BASE_ID}/${TABLE}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": airtableKey,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Airtable ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
      records.push(...data.records);
      offset = data.offset;
    } while (offset);

    return records.map(mapRecord).filter((c) => c.name && c.name !== "Sans nom");
  },
);