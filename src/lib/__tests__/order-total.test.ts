import { describe, expect, it } from "vitest";
import { checkTotals, computeItemsTotal, roundMoney, MONEY_TOLERANCE } from "@/lib/order-total";

describe("totaux du bon de commande", () => {
  it("arrondit au centime", () => {
    expect(roundMoney(4.615)).toBe(4.62);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("additionne les lignes au prix colis/article", () => {
    const total = computeItemsTotal([
      { unitPrice: 36.96, quantity: 2 },
      { unitPrice: 20.7, quantity: 3 },
    ]);
    expect(total).toBe(roundMoney(36.96 * 2 + 20.7 * 3));
    expect(total).toBe(136.02);
  });

  it("valide un panier cohérent avec le bon de commande", () => {
    const lines = [
      { unitPrice: 36.96, quantity: 2 },
      { unitPrice: 4.55, quantity: 1 },
    ];
    const expected = computeItemsTotal(lines);
    const cartTotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const check = checkTotals(expected, cartTotal);
    expect(check.ok).toBe(true);
    expect(check.diff).toBeLessThanOrEqual(MONEY_TOLERANCE);
  });

  it("détecte une incohérence de total", () => {
    const check = checkTotals(100, 95.5);
    expect(check.ok).toBe(false);
    expect(check.diff).toBe(-4.5);
  });
});
