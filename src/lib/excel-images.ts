import JSZip from "jszip";

/**
 * Extrait les images "dans la cellule" (Rich Value / IMAGE) d'un .xlsx.
 * Retourne une map rowNumber (1-based, ligne de la feuille) -> data URL base64.
 * Cible la colonne "Photo" (colonne R = 18) par défaut.
 */
export async function extractInCellImages(
  buffer: ArrayBuffer,
  opts: { sheetIndex?: number; targetColLetter?: string } = {},
): Promise<Map<number, string>> {
  const { sheetIndex = 0, targetColLetter = "R" } = opts;
  const map = new Map<number, string>();
  try {
    const zip = await JSZip.loadAsync(buffer);
    const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) return map;
    const sheetXml = await sheetFile.async("string");

    // Rich Value plumbing
    const metadataXml = await zip.file("xl/metadata.xml")?.async("string");
    const rvXml = await zip.file("xl/richData/rdrichvalue.xml")?.async("string");
    const relXml = await zip.file("xl/richData/richValueRel.xml")?.async("string");
    const relsXml = await zip.file("xl/richData/_rels/richValueRel.xml.rels")?.async("string");
    if (!metadataXml || !rvXml || !relXml || !relsXml) return map;

    // metadata.xml: futureMetadata XLRICHVALUE bk[] -> rvb i="N"
    const rvbIdx: number[] = [];
    const rvbRe = /<xlrd:rvb\s+i="(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = rvbRe.exec(metadataXml))) rvbIdx.push(parseInt(m[1], 10));

    // rdrichvalue.xml: rv[] -> first <v> is rel index (0-based)
    const rvRelIndex: number[] = [];
    const rvBlockRe = /<rv\b[^>]*>([\s\S]*?)<\/rv>/g;
    while ((m = rvBlockRe.exec(rvXml))) {
      const firstV = /<v>(\d+)<\/v>/.exec(m[1]);
      rvRelIndex.push(firstV ? parseInt(firstV[1], 10) : -1);
    }

    // richValueRel.xml: ordered list of rId
    const relIds: string[] = [];
    const relRe = /<rel\s+r:id="([^"]+)"/g;
    while ((m = relRe.exec(relXml))) relIds.push(m[1]);

    // rels: rId -> Target
    const rIdToTarget = new Map<string, string>();
    const relsRe = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    while ((m = relsRe.exec(relsXml))) rIdToTarget.set(m[1], m[2]);

    // Parse sheet for cells in target column with vm attr
    const cellRe = new RegExp(
      `<c\\s+r="${targetColLetter}(\\d+)"[^>]*\\svm="(\\d+)"[^>]*>`,
      "g",
    );
    const rowsWithImage: Array<{ row: number; vm: number }> = [];
    while ((m = cellRe.exec(sheetXml))) {
      rowsWithImage.push({ row: parseInt(m[1], 10), vm: parseInt(m[2], 10) });
    }

    // Resolve each row's image, load bytes, base64
    const mediaCache = new Map<string, string>();
    for (const { row, vm } of rowsWithImage) {
      const blockIdx = vm - 1; // 1-based
      const rvIdx = rvbIdx[blockIdx];
      if (rvIdx == null) continue;
      const relIdx = rvRelIndex[rvIdx];
      if (relIdx == null || relIdx < 0) continue;
      const rId = relIds[relIdx];
      if (!rId) continue;
      const target = rIdToTarget.get(rId);
      if (!target) continue;
      // target like "../media/image1.jpeg" -> "xl/media/image1.jpeg"
      const normalized = target.replace(/^\.\.\//, "xl/");
      let dataUrl = mediaCache.get(normalized);
      if (!dataUrl) {
        const file = zip.file(normalized);
        if (!file) continue;
        const bytes = await file.async("uint8array");
        const ext = normalized.split(".").pop()?.toLowerCase() ?? "jpeg";
        const mime =
          ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        // base64 encode in chunks (avoid stack overflow on large files)
        let bin = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        dataUrl = `data:${mime};base64,${btoa(bin)}`;
        mediaCache.set(normalized, dataUrl);
      }
      map.set(row, dataUrl);
    }
  } catch (e) {
    console.warn("extractInCellImages failed", e);
  }
  return map;
}