import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Cheese } from "@/data/cheeses";

export interface CartItem {
  cheese: Cheese;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (cheese: Cheese) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const cap = (cheese: Cheese, desired: number) => {
    const stock = cheese.stock;
    if (stock == null) return Math.max(1, desired);
    return Math.max(0, Math.min(desired, stock));
  };

  const add = (cheese: Cheese) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.cheese.id === cheese.id);
      const current = existing?.quantity ?? 0;
      const next = cap(cheese, current + 1);
      if (next === current) {
        toast.error(cheese.stock === 0 ? "Ce fromage est épuisé." : `Stock maximum atteint (${cheese.stock}).`);
        return prev;
      }
      if (existing) return prev.map((i) => i.cheese.id === cheese.id ? { ...i, quantity: next } : i);
      return [...prev, { cheese, quantity: next }];
    });
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.cheese.id !== id));
  const setQty = (id: string, qty: number) => {
    setItems((p) => {
      const item = p.find((i) => i.cheese.id === id);
      if (!item) return p;
      const next = cap(item.cheese, qty);
      if (next <= 0) return p.filter((i) => i.cheese.id !== id);
      if (qty > next) toast.error(`Stock limité à ${item.cheese.stock}.`);
      return p.map((i) => i.cheese.id === id ? { ...i, quantity: next } : i);
    });
  };
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.cheese.pricePerKg, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, total, open, setOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}