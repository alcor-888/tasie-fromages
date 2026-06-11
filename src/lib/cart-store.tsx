import { createContext, useContext, useState, type ReactNode } from "react";
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

  const add = (cheese: Cheese) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.cheese.id === cheese.id);
      if (existing) return prev.map((i) => i.cheese.id === cheese.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { cheese, quantity: 1 }];
    });
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.cheese.id !== id));
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    setItems((p) => p.map((i) => i.cheese.id === id ? { ...i, quantity: qty } : i));
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