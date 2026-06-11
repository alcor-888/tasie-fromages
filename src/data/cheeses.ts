export type CheeseCategory = "Pâte molle" | "Pâte pressée" | "Pâte persillée" | "Chèvre" | "Frais";
export type Milk = "Vache" | "Brebis" | "Chèvre";

export interface Cheese {
  id: string;
  name: string;
  region: string;
  category: CheeseCategory;
  milk: Milk;
  pricePerKg: number;
  unit: string;
  age: string;
  description: string;
  emoji: string;
}

export const cheeses: Cheese[] = [
  { id: "comte-24", name: "Comté 24 mois", region: "Jura", category: "Pâte pressée", milk: "Vache", pricePerKg: 38, unit: "/ kg", age: "24 mois", description: "Affiné en cave humide, notes de noisette grillée et de beurre noisette.", emoji: "🧀" },
  { id: "brie-meaux", name: "Brie de Meaux AOP", region: "Île-de-France", category: "Pâte molle", milk: "Vache", pricePerKg: 28, unit: "/ kg", age: "8 semaines", description: "Croûte fleurie, cœur fondant, parfum de champignon frais.", emoji: "🥯" },
  { id: "roquefort", name: "Roquefort AOP", region: "Aveyron", category: "Pâte persillée", milk: "Brebis", pricePerKg: 42, unit: "/ kg", age: "5 mois", description: "Persillage généreux, puissant et crémeux, finale longue et iodée.", emoji: "🫐" },
  { id: "crottin", name: "Crottin de Chavignol", region: "Sancerre", category: "Chèvre", milk: "Chèvre", pricePerKg: 36, unit: "/ pièce 60g", age: "3 semaines", description: "Petit format affiné, pâte serrée, accents de noix et de foin.", emoji: "🐐" },
  { id: "reblochon", name: "Reblochon fermier", region: "Savoie", category: "Pâte pressée", milk: "Vache", pricePerKg: 32, unit: "/ kg", age: "6 semaines", description: "Lait cru de montagne, onctueux, parfums de cave et de pâturage.", emoji: "🏔️" },
  { id: "bleu-auvergne", name: "Bleu d'Auvergne", region: "Auvergne", category: "Pâte persillée", milk: "Vache", pricePerKg: 26, unit: "/ kg", age: "4 mois", description: "Pâte fondante, persillage soutenu, équilibre entre force et douceur.", emoji: "💙" },
  { id: "ossau", name: "Ossau-Iraty AOP", region: "Pyrénées", category: "Pâte pressée", milk: "Brebis", pricePerKg: 44, unit: "/ kg", age: "8 mois", description: "Brebis des estives, texture ferme, notes de lait cuit et d'herbes.", emoji: "🐑" },
  { id: "selles", name: "Selles-sur-Cher", region: "Loir-et-Cher", category: "Chèvre", milk: "Chèvre", pricePerKg: 40, unit: "/ pièce 150g", age: "3 semaines", description: "Cendré au charbon végétal, pâte fine, équilibre acidulé remarquable.", emoji: "🌑" },
  { id: "fromage-blanc", name: "Fromage blanc fermier", region: "Normandie", category: "Frais", milk: "Vache", pricePerKg: 12, unit: "/ pot 500g", age: "Frais", description: "Battu en faisselle, doux et soyeux, idéal salé ou sucré.", emoji: "🥛" },
  { id: "munster", name: "Munster fermier", region: "Vosges", category: "Pâte molle", milk: "Vache", pricePerKg: 30, unit: "/ kg", age: "5 semaines", description: "Croûte lavée orangée, puissance aromatique, pâte coulante.", emoji: "🔥" },
  { id: "chevre-frais", name: "Chèvre frais aux herbes", region: "Provence", category: "Frais", milk: "Chèvre", pricePerKg: 22, unit: "/ pièce 120g", age: "Frais", description: "Roulé d'herbes de Provence, frais et tendre, parfait sur pain grillé.", emoji: "🌿" },
  { id: "tomme", name: "Tomme de Savoie", region: "Savoie", category: "Pâte pressée", milk: "Vache", pricePerKg: 28, unit: "/ kg", age: "3 mois", description: "Croûte grise rustique, pâte souple, saveurs de cave et de sous-bois.", emoji: "⛰️" },
];

export const categories: CheeseCategory[] = ["Pâte molle", "Pâte pressée", "Pâte persillée", "Chèvre", "Frais"];
export const milks: Milk[] = ["Vache", "Brebis", "Chèvre"];