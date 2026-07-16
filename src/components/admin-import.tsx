import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importProducts, type ImportRow } from "@/lib/import-products.functions";
import type { ListType } from "@/lib/products.functions";
import { toast } from "sonner";
import { extractInCellImages } from "@/lib/excel-images";

const EXPECTED_FIELDS = [
  "Ref", "Nom", "Type", "Fabriquant", "Ville", "Département",
  "Poids de la pièce", "Lait", "Fabrication", "Pâte", "Affinage",
  "Matière grasse", "Prix pièce ou Kg", "Prix article", "Nbre ou Poids",
  "Colisage", "Nombre ou poids réel", "Photo",
];

type Row = Record<string, string | number | undefined>;

const LIST_META: Record<ListType, { title: string; desc: string; queryKey: string }> = {
  all: {
    title: "Base de tous les produits",
    desc: "Fichier principal — remplace intégralement le catalogue général.",
    queryKey: "products-all",
  },
  curated: {
    title: "Sélection du moment",
    desc: "Fichier pour la sélection mise en avant — remplace la sélection actuelle.",
    queryKey: "products-curated",
  },
  promotions: {
    title: "Produits en promotion",
    desc: "Fichier des promotions — remplace la liste des promotions.",
    queryKey: "products-promotions",
  },
};

function ImportZone({ listType }: { listType: ListType }) {
  const meta = LIST_META[listType];
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const send = useServerFn(importProducts);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { listType: ListType; rows: ImportRow[] }) => send({ data: payload }),
    onSuccess: (res) => {
      toast.success(`${meta.title} : ${res.created} ligne(s) importée(s)${res.failed ? `, ${res.failed} en échec` : ""}`);
      if (res.errors.length) console.warn("Import errors:", res.errors);
      qc.invalidateQueries({ queryKey: [meta.queryKey] });
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
        // Ligne d'en-tête = ligne 1 → première donnée ligne 2 (rowNumber)
        const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
        // Extraction des photos "dans la cellule" (Excel Rich Value)
        let images = new Map<number, string>();
        if (ext === "xlsx") {
          try {
            // Trouver l'index de la colonne "Photo"
            const headers = Object.keys(json[0] ?? {});
            const photoIdx = headers.findIndex((h) => /^photo$|^image$/i.test(h.trim()));
            // Colonne 1 = A. Par défaut R (col 18) sinon calcul depuis header.
            const colLetter =
              photoIdx >= 0 ? colIndexToLetter(photoIdx + 1) : "R";
            images = await extractInCellImages(buf, { targetColLetter: colLetter });
          } catch (e) {
            console.warn("Extraction images échouée", e);
          }
        }
        // Attacher l'image (data URL) à chaque ligne : row Excel = index+2 (header à la ligne 1)
        const enriched = json.map((row, i) => {
          const excelRow = i + 2;
          const dataUrl = images.get(excelRow);
          if (dataUrl) return { ...row, Photo: dataUrl };
          return row;
        });
        ingest(enriched);
        if (images.size > 0) {
          toast.success(`${images.size} photo(s) extraite(s) du fichier`);
        }
      } else {
        setError(`Format .${ext} non supporté. Utilisez .xlsx, .csv, .tsv, .ods ou .json`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function ingest(data: Row[]) {
    if (!data.length) { setError("Fichier vide"); return; }
    // Filtre les lignes vides
    const filtered = data.filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ""));
    if (!filtered.length) { setError("Aucune ligne exploitable"); return; }
    const hs = Array.from(new Set(filtered.flatMap((r) => Object.keys(r))));
    setHeaders(hs);
    setRows(filtered);
  }

function colIndexToLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
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
    mutation.mutate({ listType, rows: payload });
  }

  const unknownHeaders = headers.filter((h) => !EXPECTED_FIELDS.includes(h));

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h3 className="font-display text-xl font-semibold">{meta.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center">
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
        <p className="mt-2 text-xs text-muted-foreground">.xlsx · .csv · .tsv · .ods · .json (max 2000 lignes)</p>
        {fileName && <p className="mt-3 text-sm">{fileName}</p>}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /><span>{error}</span>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {rows.length} ligne(s) prêtes à importer
              {unknownHeaders.length > 0 && (
                <span className="text-amber-600">· {unknownHeaders.length} colonne(s) ignorée(s)</span>
              )}
            </div>
            <Button onClick={doImport} disabled={mutation.isPending}>
              {mutation.isPending ? "Import en cours…" : `Remplacer par ${rows.length} ligne(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminImport() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-2xl font-semibold">Import des 3 catalogues</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Un fichier Excel par liste. Chaque import remplace intégralement la liste correspondante.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Colonnes attendues</summary>
        <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground md:grid-cols-3">
          {EXPECTED_FIELDS.map((f) => <li key={f}>• {f}</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Les 3 fichiers utilisent les mêmes colonnes. Les colonnes non reconnues sont ignorées.
        </p>
      </details>

      <div className="grid gap-6 lg:grid-cols-3">
        <ImportZone listType="all" />
        <ImportZone listType="curated" />
        <ImportZone listType="promotions" />
      </div>
    </div>
  );
}