import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface OrderPdfData {
  orderId: string;
  orderNumber?: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerCompany?: string | null;
  customerAddress?: string | null;
  customerWebsite?: string | null;
  pickupDate?: string | null;
  notes?: string | null;
  totalEstimate: number;
  items: {
    cheeseName: string;
    quantity: number;
    unitPrice: number;
    unitLabel?: string | null;
    piecesPerPack?: number | null;
  }[];
}

// pdf-lib standard fonts encode WinAnsi (Latin-1). Replace anything outside it.
const WINANSI_EXTRA = "\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178";

function sanitize(input: string): string {
  return input
    .normalize("NFC")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 10 || code === 13) return " ";
      if (code >= 32 && code <= 126) return ch;
      if (code >= 160 && code <= 255) return ch;
      if (WINANSI_EXTRA.includes(ch)) return ch;
      const folded = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return /^[\x20-\x7e]$/.test(folded) ? folded : "?";
    })
    .join("");
}

function money(n: number) {
  return `${n.toFixed(2)} EUR`;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildOrderPdf(data: OrderPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const M = 48;
  const ink = rgb(0.12, 0.11, 0.1);
  const muted = rgb(0.42, 0.4, 0.37);
  const brand = rgb(0.36, 0.24, 0.12);
  const band = rgb(0.96, 0.95, 0.92);

  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;
  const width = A4[0] - M * 2;

  const newPage = () => {
    page = pdf.addPage(A4);
    y = A4[1] - M;
  };
  const ensure = (needed: number) => {
    if (y - needed < M + 40) newPage();
  };
  const text = (
    value: string,
    opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; y?: number } = {},
  ) => {
    page.drawText(sanitize(value), {
      x: opts.x ?? M,
      y: opts.y ?? y,
      size: opts.size ?? 10,
      font: opts.font ?? regular,
      color: opts.color ?? ink,
    });
  };

  // Header
  text("TASIE FROMAGES", { size: 20, font: bold, color: brand });
  y -= 18;
  text("Bon de commande", { size: 13, font: bold });
  y -= 16;
  const ref = data.orderNumber || `BC-${data.orderId.slice(0, 8).toUpperCase()}`;
  text(`Bon de commande n° ${ref}`, { size: 11, font: bold, color: brand });
  y -= 14;
  const created = new Date(data.createdAt);
  const dateStr = created.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const timeStr = created.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  text(`Émis le ${dateStr} à ${timeStr}`, { size: 9, color: muted });
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: M + width, y }, thickness: 1, color: brand });
  y -= 24;

  // Client block
  text("Client", { size: 11, font: bold, color: brand });
  y -= 15;

  const infoLines: string[] = [data.customerName];
  if (data.customerCompany) infoLines.push(data.customerCompany);
  infoLines.push(`Tél. : ${data.customerPhone}`);
  if (data.customerEmail) infoLines.push(`Email : ${data.customerEmail}`);
  if (data.customerWebsite) infoLines.push(`Site : ${data.customerWebsite}`);
  if (data.customerAddress) {
    infoLines.push("Adresse de livraison :");
    for (const raw of data.customerAddress.split(/\r?\n/)) {
      for (const line of wrap(raw, regular, 10, width)) infoLines.push(`  ${line}`);
    }
  }
  if (data.pickupDate) infoLines.push(`Date souhaitée : ${data.pickupDate}`);

  for (const line of infoLines) {
    ensure(14);
    text(line, { size: 10 });
    y -= 13;
  }
  y -= 12;

  // Items table
  const colQty = M + width - 250;
  const colUnit = M + width - 160;
  const colTotal = M + width;

  const drawHead = () => {
    page.drawRectangle({ x: M, y: y - 6, width, height: 20, color: band });
    text("Désignation", { size: 9, font: bold, y: y });
    text("Quantité", { size: 9, font: bold, x: colQty, y: y });
    const u = sanitize("Prix unitaire");
    page.drawText(u, { x: colUnit + 90 - bold.widthOfTextAtSize(u, 9), y, size: 9, font: bold, color: ink });
    const t = sanitize("Total");
    page.drawText(t, { x: colTotal - bold.widthOfTextAtSize(t, 9), y, size: 9, font: bold, color: ink });
    y -= 22;
  };

  ensure(60);
  drawHead();

  for (const item of data.items) {
    const nameLines = wrap(item.cheeseName, regular, 10, colQty - M - 12);
    const packLine = item.piecesPerPack
      ? `${item.piecesPerPack} piece(s) / colis - prix piece ${money(item.unitPrice)} - prix colis ${money(item.unitPrice * item.piecesPerPack)}`
      : null;
    const rowHeight = Math.max(nameLines.length * 12 + (packLine ? 12 : 0), 14) + 6;
    if (y - rowHeight < M + 60) {
      newPage();
      drawHead();
    }
    const top = y;
    nameLines.forEach((line, idx) => {
      text(line, { size: 10, y: top - idx * 12 });
    });
    if (packLine) {
      text(packLine, { size: 8, color: muted, y: top - nameLines.length * 12 });
    }
    const qty = `${item.quantity}${item.unitLabel ? ` ${sanitize(item.unitLabel)}` : ""}`;
    text(qty, { size: 10, x: colQty, y: top });
    const unit = sanitize(money(item.unitPrice));
    page.drawText(unit, { x: colUnit + 90 - regular.widthOfTextAtSize(unit, 10), y: top, size: 10, font: regular, color: ink });
    const lineTotal = sanitize(money(item.unitPrice * item.quantity));
    page.drawText(lineTotal, { x: colTotal - regular.widthOfTextAtSize(lineTotal, 10), y: top, size: 10, font: regular, color: ink });

    y = top - rowHeight;
    page.drawLine({
      start: { x: M, y: y + 8 },
      end: { x: M + width, y: y + 8 },
      thickness: 0.5,
      color: rgb(0.87, 0.85, 0.81),
    });
  }

  y -= 12;
  ensure(40);
  const totalLabel = "Estimation totale";
  const totalValue = sanitize(money(data.totalEstimate));
  page.drawText(sanitize(totalLabel), { x: colQty, y, size: 12, font: bold, color: brand });
  page.drawText(totalValue, { x: colTotal - bold.widthOfTextAtSize(totalValue, 12), y, size: 12, font: bold, color: brand });
  y -= 26;

  if (data.notes) {
    ensure(40);
    text("Notes", { size: 11, font: bold, color: brand });
    y -= 14;
    for (const raw of data.notes.split(/\r?\n/)) {
      for (const line of wrap(raw, regular, 10, width)) {
        ensure(14);
        text(line, { size: 10, color: muted });
        y -= 13;
      }
    }
  }

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    const footer = sanitize(
      `La Cave Tasie Fromages — Bon de commande n° ${ref} — page ${idx + 1}/${pages.length}`,
    );
    p.drawText(footer, { x: M, y: M - 18, size: 8, font: regular, color: muted });
  });

  return pdf.save();
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
