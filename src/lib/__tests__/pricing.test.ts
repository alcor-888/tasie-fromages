import { describe, expect, it } from "vitest";
import {
  formatEuro,
  packPriceLabel,
  packQuantity,
  packQuantityLabel,
  packSize,
  unitPrice,
  unitPriceLabel,
  unitWord,
  type Cheese,
} from "@/data/cheeses";

type Info = Pick<Cheese, "pricePerKg" | "colissage" | "nombrePoidsReel" | "packagingUnit">;

/** Produit à la pièce : Banon, colis de 8 pièces à 36,96 € (4,62 € la pièce). */
const banon: Info = { pricePerKg: 36.96, colissage: 8, nombrePoidsReel: 8, packagingUnit: "Pièce" };

/** Produit au poids : Ardalhou, 3 kg à 20,70 €/kg soit 62,10 € le colis. */
const ardalhou: Info = { pricePerKg: 62.1, colissage: 1, nombrePoidsReel: 3, packagingUnit: "Kg" };

/** Produit vendu à l'article (une seule pièce). */
const article: Info = { pricePerKg: 4.55, colissage: 1, nombrePoidsReel: 1, packagingUnit: "Piéce" };

describe("prix unitaire (pièce ou kilo) et prix du colis", () => {
  it("distingue les produits au poids et à la pièce", () => {
    expect(unitWord(banon)).toBe("pièce");
    expect(unitWord(ardalhou)).toBe("kg");
    expect(unitWord(article)).toBe("pièce");
  });

  it("calcule la quantité du colis selon l'unité de vente", () => {
    expect(packQuantity(banon)).toBe(8);
    expect(packQuantity(ardalhou)).toBe(3);
    expect(packQuantity(article)).toBe(1);
    expect(packSize(article)).toBeNull();
  });

  it("divise le prix du colis par la quantité du colis", () => {
    expect(unitPrice(banon)).toBeCloseTo(4.62, 2);
    expect(unitPrice(ardalhou)).toBeCloseTo(20.7, 2);
    expect(unitPrice(article)).toBe(4.55);
  });

  it("formate les montants en euros à la française", () => {
    expect(formatEuro(4.62)).toBe("4,62 €");
    expect(formatEuro(36.9)).toBe("36,90 €");
  });

  it("affiche les libellés attendus", () => {
    expect(unitPriceLabel(banon)).toBe("4,62 € / pièce");
    expect(packQuantityLabel(banon)).toBe("8 pièces");
    expect(packPriceLabel(banon)).toBe("36,96 € / colis de 8 pièces");

    expect(unitPriceLabel(ardalhou)).toBe("20,70 € / kg");
    expect(packQuantityLabel(ardalhou)).toBe("3 kg");
    expect(packPriceLabel(ardalhou)).toBe("62,10 € / colis de 3 kg");

    expect(unitPriceLabel(article)).toBe("4,55 € / pièce");
    expect(packPriceLabel(article)).toBe("4,55 € / article");
  });

  it("ne facture jamais le prix unitaire à la place du prix du colis", () => {
    expect(unitPrice(banon) * packQuantity(banon)).toBeCloseTo(banon.pricePerKg, 2);
    expect(unitPrice(ardalhou) * packQuantity(ardalhou)).toBeCloseTo(ardalhou.pricePerKg, 2);
  });
});
