import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Cheese } from "@/data/cheeses";

const CART_STORAGE_KEY = "la-cave-fromagere-cart";

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((item) => item?.cheese?.id && item.quantity > 0));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const cap = (cheese: Cheese, desired: number) => {
    return Math.max(0, desired);
  };

  const add = (cheese: Cheese) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.cheese.id === cheese.id);
      const current = existing?.quantity ?? 0;
      const next = cap(cheese, current + 1);
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
      return p.map((i) => i.cheese.id === id ? { ...i, quantity: next } : i);
    });
  };
  const clear = () => {
    setItems([]);
    if (typeof window !== "undefined") window.localStorage.removeItem(CART_STORAGE_KEY);
  };
  const count = items.reduce((s, i) => s + i.quantity, 0);
  // Une quantité dans le panier correspond à un article ou à un colis complet.
  // pricePerKg contient le prix facturé de cet article/colis (colonne N).
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