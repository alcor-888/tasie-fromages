import presseImg from "@/assets/cat-presse.jpg";
import molleImg from "@/assets/cat-molle.jpg";
import persilleeImg from "@/assets/cat-persillee.jpg";
import chevreImg from "@/assets/cat-chevre.jpg";
import fraisImg from "@/assets/cat-frais.jpg";

export interface Cheese {
  id: string;
  name: string;
  region?: string;
  category?: string;
  milk?: string;
  pricePerKg: number;
  priceLabel: string;
  unit: string;
  weight?: string;
  age?: string;
  description?: string;
  emoji: string;
  fabrication?: string;
  saveur?: string;
  season?: string;
  producer?: string;
  conseils?: string;
  stock?: number;
  ref?: number;
  typeDesc?: string;
  fabriquant?: string;
  ville?: string;
  department?: string;
  matiereGrasse?: string;
  colissage?: number;
  nombrePoidsReel?: number;
  imageUrl?: string;
  imageSrcSet?: string;
  packagingUnit?: string;
}

const FALLBACK_IMG = presseImg;

/**
 * pricePerKg (colonne N des fichiers Excel) contient le PRIX DU COLIS (article).
 * Selon la colonne O ("Nbre ou Poids"), le produit est vendu à la pièce ou au kilo.
 * Le prix unitaire = prix du colis / quantité du colis (nb de pièces ou nb de kg).
 */
type PriceInfo = Pick<Cheese, "pricePerKg" | "colissage" | "nombrePoidsReel" | "packagingUnit">;

/** true si le produit est tarifé au poids (kg) plutôt qu'à la pièce. */
export function isWeightPriced(cheese: Pick<Cheese, "packagingUnit">): boolean {
  const u = (cheese.packagingUnit ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return u.startsWith("kg");
}

/** Mot de l'unité de vente : "kg" ou "pièce". */
export function unitWord(cheese: Pick<Cheese, "packagingUnit">): "kg" | "pièce" {
  return isWeightPriced(cheese) ? "kg" : "pièce";
}

function formatQty(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

/** Quantité contenue dans le colis / l'article (nombre de pièces ou nombre de kg). */
export function packQuantity(cheese: PriceInfo): number {
  const weight = isWeightPriced(cheese);
  const primary = weight ? cheese.nombrePoidsReel : cheese.colissage;
  const fallback = weight ? cheese.colissage : cheese.nombrePoidsReel;
  const q = primary ?? fallback ?? 1;
  return q > 0 ? q : 1;
}

/** Prix unitaire : au kilo ou à la pièce selon le produit. */
export function unitPrice(cheese: PriceInfo): number {
  return cheese.pricePerKg / packQuantity(cheese);
}

/** Alias historique : prix unitaire (pièce ou kg). */
export function piecePrice(cheese: PriceInfo): number {
  return unitPrice(cheese);
}

export function formatEuro(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} €`;
}

/** Quantité du colis, uniquement si le colis regroupe plusieurs unités. */
export function packSize(cheese: PriceInfo): number | null {
  const q = packQuantity(cheese);
  return q > 1 ? q : null;
}

/** Libellé de la quantité du colis, ex. "8 pièces" ou "3 kg". */
export function packQuantityLabel(cheese: PriceInfo): string | null {
  const q = packSize(cheese);
  if (!q) return null;
  return isWeightPriced(cheese) ? `${formatQty(q)} kg` : `${formatQty(q)} pièce${q > 1 ? "s" : ""}`;
}

/** Libellé du prix du colis / de l'article (prix facturé). */
export function packPriceLabel(cheese: PriceInfo): string {
  const q = packQuantityLabel(cheese);
  return q
    ? `${formatEuro(cheese.pricePerKg)} / colis de ${q}`
    : `${formatEuro(cheese.pricePerKg)} / article`;
}

/** Libellé du prix unitaire (à la pièce ou au kilo). */
export function unitPriceLabel(cheese: PriceInfo): string {
  return `${formatEuro(unitPrice(cheese))} / ${unitWord(cheese)}`;
}

/** Alias historique. */
export function piecePriceLabel(cheese: PriceInfo): string {
  return unitPriceLabel(cheese);
}


export function getCategoryImage(category?: string, milk?: string): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("persill")) return persilleeImg;
  if (c.includes("molle")) return molleImg;
  if (c.includes("press")) return presseImg;
  if (c.includes("frais")) return fraisImg;
  if (c.includes("chèvre") || c.includes("chevre")) return chevreImg;
  const m = (milk ?? "").toLowerCase();
  if (m.includes("chevre") || m.includes("chèvre")) return chevreImg;
  return FALLBACK_IMG;
}

export function getCheeseEmoji(milk?: string): string {
  const m = (milk ?? "").toLowerCase();
  if (m.includes("chevre") || m.includes("chèvre")) return "🐐";
  if (m.includes("brebis")) return "🐑";
  if (m.includes("vache")) return "🐄";
  if (m.includes("bufflonne")) return "🐃";
  return "🧀";
}