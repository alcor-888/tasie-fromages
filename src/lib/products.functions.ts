import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Cheese } from "@/data/cheeses";
import { getCheeseEmoji } from "@/data/cheeses";

export type ListType = "all" | "curated" | "promotions";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

interface Row {
  id: string;
  name: string;
  region: string | null;
  category: string | null;
  milk: string | null;
  price_label: string | null;
  price_per_kg: number | string | null;
  unit: string | null;
  weight: string | null;
  age: string | null;
  saveur: string | null;
  conseils: string | null;
  fabrication: string | null;
  season: string | null;
  producer: string | null;
  stock: number | null;
}

function toCheese(r: Row): Cheese {
  const price = typeof r.price_per_kg === "number" ? r.price_per_kg : parseFloat(String(r.price_per_kg ?? "0")) || 0;
  const saveur = r.saveur ?? undefined;
  const conseils = r.conseils ?? undefined;
  return {
    id: r.id,
    name: r.name,
    region: r.region ?? undefined,
    category: r.category ?? undefined,
    milk: r.milk ?? undefined,
    pricePerKg: price,
    priceLabel: r.price_label ?? `${price.toFixed(2)} €`,
    unit: r.unit ?? "/ pièce",
    weight: r.weight ?? undefined,
    age: r.age ?? undefined,
    description: saveur ?? conseils,
    emoji: getCheeseEmoji(r.milk ?? undefined),
    fabrication: r.fabrication ?? undefined,
    saveur,
    season: r.season ?? undefined,
    producer: r.producer ?? undefined,
    conseils,
    stock: r.stock ?? undefined,
  };
}

const listSchema = z.object({ listType: z.enum(["all", "curated", "promotions"]) });

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((i: { listType: ListType }) => listSchema.parse(i))
  .handler(async ({ data }): Promise<Cheese[]> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("products")
      .select("id,name,region,category,milk,price_label,price_per_kg,unit,weight,age,saveur,conseils,fabrication,season,producer,stock,position")
      .eq("list_type", data.listType)
      .order("position", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => toCheese(r as unknown as Row));
  });