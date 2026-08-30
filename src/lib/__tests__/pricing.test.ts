import { describe, expect, it } from "vitest";
import {
  formatEuro,
  packPriceLabel,
  packSize,
  piecePrice,
  piecePriceLabel,
  type Cheese,
} from "@/data/cheeses";

/** Produit de référence : Banon, colis de 8 pièces à 36,96 € (4,62 € la pièce). */
const banon: Pick<Cheese, "pricePerKg" | "colissage"> = {
  pricePerKg: 36.96,
  colissage: 8,
};

/** Produit vendu à l'article (pas de regroupement). */
const article: Pick<Cheese, "pricePerKg" | "colissage"> = {
  pricePerKg: 20.7,
  colissage: 1,
};

const sansColissage: Pick<Cheese, "pricePerKg" | "colissage"> = {
  pricePerKg: 4.55,
};

describe("prix à la pièce et au colis", () => {
  it("divise le prix du colis par le nombre de pièces", () => {
    expect(piecePrice(banon)).toBeCloseTo(4.62, 2);
  });

  it("garde le prix de l'article quand il n'y a pas de colis multiple", () => {
    expect(piecePrice(article)).toBe(20.7);
    expect(piecePrice(sansColissage)).toBe(4.55);
  });

  it("n'expose une taille de colis que si elle regroupe plusieurs pièces", () => {
    expect(packSize(banon)).toBe(8);
    expect(packSize(article)).toBeNull();
    expect(packSize(sansColissage)).toBeNull();
  });

  it("formate les montants en euros à la française", () => {
    expect(formatEuro(4.62)).toBe("4,62 €");
    expect(formatEuro(36.9)).toBe("36,90 €");
  });

  it("affiche les libellés attendus sur les fiches produits", () => {
    expect(packPriceLabel(banon)).toBe("36,96 € / colis de 8 pièces");
    expect(piecePriceLabel(banon)).toBe("4,62 € / pièce");
    expect(packPriceLabel(article)).toBe("20,70 € / article");
    expect(piecePriceLabel(article)).toBe("20,70 € / pièce");
  });

  it("ne facture jamais le prix à la pièce à la place du prix du colis", () => {
    // Règle métier : le prix facturé est toujours pricePerKg (prix colis/article).
    expect(banon.pricePerKg).toBeGreaterThan(piecePrice(banon));
    expect(piecePrice(banon) * (banon.colissage ?? 1)).toBeCloseTo(banon.pricePerKg, 2);
  });
});
