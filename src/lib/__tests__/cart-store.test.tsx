import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "@/lib/cart-store";
import type { Cheese } from "@/data/cheeses";

function cheese(overrides: Partial<Cheese> & { id: string }): Cheese {
  return {
    name: "Produit",
    pricePerKg: 10,
    priceLabel: "10 €",
    unit: "/ pièce",
    emoji: "🧀",
    ...overrides,
  } as Cheese;
}

const banon = cheese({ id: "banon", name: "Banon AOP", pricePerKg: 36.96, colissage: 8 });
const tomme = cheese({ id: "tomme", name: "Ardalhou", pricePerKg: 20.7, colissage: 1 });

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("panier", () => {
  beforeEach(() => window.localStorage.clear());

  it("ajoute, cumule et compte les articles", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(banon));
    act(() => result.current.add(banon));
    act(() => result.current.add(tomme));
    expect(result.current.count).toBe(3);
    expect(result.current.items).toHaveLength(2);
  });

  it("facture toujours le prix du colis / de l'article", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(banon));
    act(() => result.current.setQty("banon", 2));
    act(() => result.current.add(tomme));
    expect(result.current.total).toBeCloseTo(36.96 * 2 + 20.7, 2);
  });

  it("retire une ligne quand la quantité tombe à zéro", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(banon));
    act(() => result.current.setQty("banon", 0));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("vide le panier et le stockage local", () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.add(banon));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    expect(JSON.parse(window.localStorage.getItem("la-cave-fromagere-cart") ?? "[]")).toEqual([]);
  });
});
