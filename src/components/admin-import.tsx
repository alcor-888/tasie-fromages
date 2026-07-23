import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearProductList, insertProductsChunk, type ImportRow } from "@/lib/import-products.functions";
import type { ListType } from "@/lib/products.functions";
import { toast } from "sonner";
import { extractInCellImages } from "@/lib/excel-images";

const EXPECTED_FIELDS = [
  "Ref", "Nom", "Type", "Fabriquant", "Ville", "Département",
  "Poids de la pièce", "Lait", "Fabrication", "Pâte", "Affinage",
  "Matière grasse", "Prix pièce ou Kg", "Prix article", "Nbre ou Poids",
  "Colisage", "Nombre ou poids réel", "Photo",
];

const REQUIRED_FIELDS = ["Nom", "Prix article"];
const PREVIEW_COLUMNS = ["Ref", "Nom", "Type", "Prix article", "Prix pièce ou Kg", "Photo"];

type Row = Record<string, string | number | undefined>;

const LIST_META: Record<ListType, { title: string; desc: string; queryKey: string }> = {
  all: {
    title: "Base de tous les produits",
    desc: "Fichier principal — remplace intégralement le catalogue général.",
    queryKey: "products-all",
  },
  curated: {
    title: "Prudutti corsi ROSE-CAMPO-DUI",
    desc: "Fichier pour la liste Corse mise en avant — remplace la sélection actuelle.",
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
  const clearList = useServerFn(clearProductList);
  const insertChunk = useServerFn(insertProductsChunk);
  const qc = useQueryClient();

  type Progress = {
    phase: "idle" | "clearing" | "inserting" | "done" | "error";
    total: number;
    processed: number;
    imported: number;
    failed: number;
    batchIndex: number;
    totalBatches: number;
    errors: string[];
  };
  const [progress, setProgress] = useState<Progress>({
    phase: "idle", total: 0, processed: 0, imported: 0, failed: 0, batchIndex: 0, totalBatches: 0, errors: [],
  });
  const isRunning = progress.phase === "clearing" || progress.phase === "inserting";

  function makeImportChunks(payload: ImportRow[]) {
    const chunks: ImportRow[][] = [];
    let current: ImportRow[] = [];
    let currentSize = 0;
    const MAX_ROWS = 25;
    const MAX_CHARS = 8_000_000;

    for (const row of payload) {
      const rowSize = JSON.stringify(row).length;
      if (current.length > 0 && (current.length >= MAX_ROWS || currentSize + rowSize > MAX_CHARS)) {
        chunks.push(current);
        current = [];
        currentSize = 0;
      }
      current.push(row);
      currentSize += rowSize;
    }

    if (current.length > 0) chunks.push(current);
    return chunks;
  }

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

  async function doImport() {
    const payload: ImportRow[] = rows.map((r) => {
      const fields: Record<string, string | number | undefined> = {};
      for (const k of Object.keys(r)) {
        const v = r[k];
        if (v === "" || v == null) continue;
        fields[k] = v;
      }
      return { fields };
    });
    const chunks = makeImportChunks(payload);
    const totalBatches = chunks.length;
    setProgress({
      phase: "clearing", total: payload.length, processed: 0, imported: 0, failed: 0,
      batchIndex: 0, totalBatches, errors: [],
    });
    try {
      await clearList({ data: { listType } });
    } catch (e) {
      const msg = (e as Error).message;
      setProgress((p) => ({ ...p, phase: "error", errors: [`Effacement : ${msg}`] }));
      toast.error(msg);
      return;
    }
    setProgress((p) => ({ ...p, phase: "inserting" }));
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    let startPosition = 0;
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const batchIndex = chunkIndex + 1;
      try {
        const res = await insertChunk({ data: { listType, startPosition, rows: chunk } });
        imported += res.inserted;
        failed += res.failed;
        if (res.error) errors.push(`Lot ${batchIndex}/${totalBatches} : ${res.error.slice(0, 200)}`);
      } catch (e) {
        failed += chunk.length;
        errors.push(`Lot ${batchIndex}/${totalBatches} : ${(e as Error).message.slice(0, 200)}`);
      }
      setProgress((p) => ({
        ...p,
        processed: Math.min(p.total, startPosition + chunk.length),
        imported,
        failed,
        batchIndex,
        errors,
      }));
      startPosition += chunk.length;
    }
    setProgress((p) => ({ ...p, phase: "done" }));
    qc.invalidateQueries({ queryKey: [meta.queryKey] });
    if (failed === 0) {
      toast.success(`${meta.title} : ${imported} ligne(s) importée(s)`);
      setRows([]); setHeaders([]); setFileName("");
    } else {
      toast.error(`${meta.title} : ${imported} importée(s), ${failed} en échec`);
    }
  }

  const unknownHeaders = headers.filter((h) => !EXPECTED_FIELDS.includes(h));
  const missingRequired = REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  const previewRows = rows.slice(0, 8);
  const photosCount = rows.filter((r) => {
    const v = r["Photo"];
    return typeof v === "string" && v.startsWith("data:image/");
  }).length;

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
          <div className="rounded-md border border-border bg-background p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-display text-base font-semibold">Vérification avant import</h4>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => { setRows([]); setHeaders([]); setFileName(""); }}
                disabled={isRunning}
              >
                Annuler / changer de fichier
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Stat label="Lignes détectées" value={rows.length} tone="primary" />
              <Stat label="Colonnes reconnues" value={headers.length - unknownHeaders.length} />
              <Stat label="Colonnes ignorées" value={unknownHeaders.length} tone={unknownHeaders.length ? "warn" : undefined} />
              <Stat label="Photos détectées" value={photosCount} />
            </div>

            {missingRequired.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <span>Colonnes obligatoires manquantes : {missingRequired.join(", ")}</span>
              </div>
            )}
            {unknownHeaders.length > 0 && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-amber-700">
                  {unknownHeaders.length} colonne(s) ignorée(s) — voir la liste
                </summary>
                <p className="mt-1 text-muted-foreground">{unknownHeaders.join(" · ")}</p>
              </details>
            )}

            <div className="mt-4 overflow-x-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50">
                  <tr>
                    {PREVIEW_COLUMNS.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {PREVIEW_COLUMNS.map((c) => {
                        const v = r[c];
                        if (c === "Photo" && typeof v === "string" && v.startsWith("data:image/")) {
                          return (
                            <td key={c} className="px-2 py-1.5">
                              <img src={v} alt="" className="h-10 w-10 rounded object-cover" />
                            </td>
                          );
                        }
                        const text = v == null ? "" : String(v);
                        return (
                          <td key={c} className="max-w-[180px] truncate px-2 py-1.5" title={text}>
                            {text || <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > previewRows.length && (
                <div className="border-t border-border bg-secondary/30 px-2 py-1 text-center text-[11px] text-muted-foreground">
                  … et {rows.length - previewRows.length} ligne(s) supplémentaire(s)
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button
                disabled={isRunning || missingRequired.length > 0}
                onClick={() => { void doImport(); }}
              >
                {isRunning ? "Import en cours…" : "Importer"}
              </Button>
            </div>
          </div>

          {progress.phase !== "idle" && (
            <ProgressPanel progress={progress} />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "primary" | "warn" }) {
  const color = tone === "primary" ? "text-primary" : tone === "warn" ? "text-amber-600" : "";
  return (
    <div className="rounded bg-secondary/40 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className={`font-display text-base font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ProgressPanel({ progress }: { progress: {
  phase: "idle" | "clearing" | "inserting" | "done" | "error";
  total: number; processed: number; imported: number; failed: number;
  batchIndex: number; totalBatches: number; errors: string[];
} }) {
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const phaseLabel =
    progress.phase === "clearing" ? "Effacement de l'ancienne liste…" :
    progress.phase === "inserting" ? `Import en cours — lot ${progress.batchIndex}/${progress.totalBatches}` :
    progress.phase === "done" ? (progress.failed === 0 ? "Import terminé ✓" : "Import terminé avec erreurs") :
    progress.phase === "error" ? "Import interrompu" : "";
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium">
          {(progress.phase === "clearing" || progress.phase === "inserting") && <Loader2 className="h-4 w-4 animate-spin" />}
          {progress.phase === "done" && progress.failed === 0 && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {(progress.phase === "error" || (progress.phase === "done" && progress.failed > 0)) && <AlertCircle className="h-4 w-4 text-destructive" />}
          <span>{phaseLabel}</span>
        </div>
        <span className="tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-secondary/50 p-2">
          <div className="text-muted-foreground">Traitées</div>
          <div className="font-display text-lg font-semibold tabular-nums">{progress.processed} / {progress.total}</div>
        </div>
        <div className="rounded bg-secondary/50 p-2">
          <div className="text-muted-foreground">Importées</div>
          <div className="font-display text-lg font-semibold tabular-nums text-primary">{progress.imported}</div>
        </div>
        <div className="rounded bg-secondary/50 p-2">
          <div className="text-muted-foreground">Échecs</div>
          <div className={`font-display text-lg font-semibold tabular-nums ${progress.failed > 0 ? "text-destructive" : ""}`}>{progress.failed}</div>
        </div>
      </div>
      {progress.errors.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-destructive">{progress.errors.length} erreur(s) — voir le détail</summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto rounded bg-destructive/5 p-2 text-destructive">
            {progress.errors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
          </ul>
        </details>
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