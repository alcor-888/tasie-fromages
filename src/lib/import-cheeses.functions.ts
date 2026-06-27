import { createServerFn } from "@tanstack/react-start";

const BASE_ID = "appJ8c6pgwqgy29H5";
const TABLE = "Feuil1";
const GATEWAY = "https://connector-gateway.lovable.dev/airtable";

export interface ImportRow {
  fields: Record<string, string | number | undefined>;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

export const importCheeses = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: ImportRow[] }) => {
    if (!data?.rows || !Array.isArray(data.rows)) throw new Error("rows required");
    if (data.rows.length === 0) throw new Error("Aucune ligne à importer");
    if (data.rows.length > 1000) throw new Error("Maximum 1000 lignes par import");
    return data;
  })
  .handler(async ({ data }): Promise<ImportResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const airtableKey = process.env.AIRTABLE_API_KEY;
    if (!lovableKey || !airtableKey) {
      throw new Error("Airtable n'est pas configuré.");
    }

    const result: ImportResult = { created: 0, failed: 0, errors: [] };

    // Airtable accepte 10 records par batch
    for (let i = 0; i < data.rows.length; i += 10) {
      const batch = data.rows.slice(i, i + 10);
      const url = `${GATEWAY}/v0/${BASE_ID}/${TABLE}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": airtableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: batch.map((r) => ({ fields: r.fields })),
          typecast: true,
        }),
      });
      if (!res.ok) {
        result.failed += batch.length;
        const txt = await res.text();
        result.errors.push(`Lot ${i / 10 + 1}: ${res.status} ${txt.slice(0, 200)}`);
      } else {
        result.created += batch.length;
      }
    }
    return result;
  });