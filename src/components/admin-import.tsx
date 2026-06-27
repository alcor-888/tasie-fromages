import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importCheeses, type ImportRow } from "@/lib/import-cheeses.functions";
import { toast } from "sonner";

const EXPECTED_FIELDS = [
  "Libellé", "Origine", "Type de pate", "Type de lait", "Prix",
  "Poids ou pièce", "Poids", "Temps d'affinage", "Saveur", "Conseils",
  "Fabrication", "Saisonnalité", "Producteur", "Stock",
];

type Row = Record<string, string | number | undefined>;

export function AdminImport() {
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const send = useServerFn(importCheeses);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { rows: ImportRow[] }) => send({ data: payload }),
    onSuccess: (res) => {
      toast.success(`${res.created} ligne(s) importée(s)${res.failed ? `, ${res.failed} en échec` : ""}`);
      if (res.errors.length) console.warn("Import errors:", res.errors);
      qc.invalidateQueries({ queryKey: ["cheeses"] });
      setRows([]); setHeaders([]); setFileName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleFile(file: File) {
    setError("");
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    try {
      if (ext === "csv" || ext === "tsv") {
        const text = await file.text();
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, delimiter: ext === "tsv" ? "\t" : "" });
        ingest(parsed.data);
      } else if (ext === "json") {
        const text = await file.text();
        const data = JSON.parse(text);
        ingest(Array.isArray(data) ? data : data.records ?? data.rows ?? []);
      } else if (["xlsx", "xls", "ods"].includes(ext)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
        ingest(json);
      } else {
        setError(`Format .${ext} non supporté. Utilisez .xlsx, .csv, .tsv, .ods ou .json`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function ingest(data: Row[]) {
    if (!data.length) { setError("Fichier vide"); return; }
    const hs = Array.from(new Set(data.flatMap((r) => Object.keys(r))));
    setHeaders(hs);
    setRows(data);
  }

  function doImport() {
    const payload: ImportRow[] = rows.map((r) => {
      const fields: Record<string, string | number | undefined> = {};
      for (const k of Object.keys(r)) {
        const v = r[k];
        if (v === "" || v == null) continue;
        fields[k] = v;
      }
      return { fields };
    });
    mutation.mutate({ rows: payload });
  }

  const unknownHeaders = headers.filter((h) => !EXPECTED_FIELDS.includes(h));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl font-semibold">Importer un catalogue</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chargez un fichier Excel (.xlsx), CSV, TSV, ODS ou JSON. Les lignes seront ajoutées à votre base produits.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
        <label className="mt-4 inline-block cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.ods,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Upload className="h-4 w-4" /> Choisir un fichier
          </span>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">.xlsx · .csv · .tsv · .ods · .json (max 1000 lignes)</p>
        {fileName && <p className="mt-3 text-sm">{fileName}</p>}
      </div>

      <details className="rounded-lg border border-border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Colonnes attendues</summary>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground md:grid-cols-3">
          {EXPECTED_FIELDS.map((f) => <li key={f}>• {f}</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Les colonnes non reconnues seront ignorées par l'affichage public.
        </p>
      </details>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /><span>{error}</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {rows.length} ligne(s) prêtes à importer
              {unknownHeaders.length > 0 && (
                <span className="text-amber-600">· {unknownHeaders.length} colonne(s) non standard : {unknownHeaders.slice(0, 3).join(", ")}{unknownHeaders.length > 3 ? "…" : ""}</span>
              )}
            </div>
            <Button onClick={doImport} disabled={mutation.isPending}>
              {mutation.isPending ? "Import en cours…" : `Importer ${rows.length} ligne(s)`}
            </Button>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {headers.map((h) => <td key={h} className="px-3 py-2 align-top">{String(r[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="border-t border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Aperçu des 20 premières lignes sur {rows.length}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}