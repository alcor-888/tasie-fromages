import presseImg from "@/assets/cat-presse.jpg";
import molleImg from "@/assets/cat-molle.jpg";
import persilleeImg from "@/assets/cat-persillee.jpg";
import chevreImg from "@/assets/cat-chevre.jpg";
import fraisImg from "@/assets/cat-frais.jpg";

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
  rind: string;
  texture: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  tastingNotes: string[];
  pairings: { wines: string[]; breads: string[]; accompaniments: string[] };
  story: string;
  producer: string;
  rawMilk: boolean;
}

export const categoryImage: Record<CheeseCategory, string> = {
  "Pâte pressée": presseImg,
  "Pâte molle": molleImg,
  "Pâte persillée": persilleeImg,
  "Chèvre": chevreImg,
  "Frais": fraisImg,
};

export const cheeses: Cheese[] = [
  { id: "comte-24", name: "Comté 24 mois", region: "Jura", category: "Pâte pressée", milk: "Vache", pricePerKg: 38, unit: "/ kg", age: "24 mois", description: "Affiné en cave humide, notes de noisette grillée et de beurre noisette.", emoji: "🧀",
    rind: "Naturelle, brossée", texture: "Ferme, fondante en bouche, cristaux de tyrosine", intensity: 4,
    tastingNotes: ["Noisette grillée", "Beurre noisette", "Fruits secs", "Bouillon long en bouche"],
    pairings: { wines: ["Vin jaune du Jura", "Savagnin", "Champagne blanc de blancs"], breads: ["Pain de seigle", "Pain aux noix"], accompaniments: ["Noix", "Confiture de cerise noire", "Jambon de Bayonne"] },
    story: "Issu de lait cru de vaches Montbéliardes nourries au foin, le Comté est affiné lentement sur planches d'épicéa. Plus l'affinage est long, plus les arômes se concentrent.",
    producer: "Fruitière des Lacs, Jura", rawMilk: true },
  { id: "brie-meaux", name: "Brie de Meaux AOP", region: "Île-de-France", category: "Pâte molle", milk: "Vache", pricePerKg: 28, unit: "/ kg", age: "8 semaines", description: "Croûte fleurie, cœur fondant, parfum de champignon frais.", emoji: "🥯",
    rind: "Fleurie, blanche duveteuse", texture: "Crémeuse, onctueuse à cœur", intensity: 3,
    tastingNotes: ["Champignon de Paris", "Crème fraîche", "Légère pointe d'amande"],
    pairings: { wines: ["Champagne brut", "Bourgogne rouge léger", "Cidre fermier"], breads: ["Baguette tradition", "Pain de campagne"], accompaniments: ["Raisin", "Miel d'acacia", "Poire"] },
    story: "Le « roi des fromages », couronné au Congrès de Vienne en 1814. Affiné 8 semaines minimum sur paille de seigle.",
    producer: "Fermes de la Brie", rawMilk: true },
  { id: "roquefort", name: "Roquefort AOP", region: "Aveyron", category: "Pâte persillée", milk: "Brebis", pricePerKg: 42, unit: "/ kg", age: "5 mois", description: "Persillage généreux, puissant et crémeux, finale longue et iodée.", emoji: "🫐",
    rind: "Sans croûte, papier d'aluminium", texture: "Crémeuse, persillée, fondante", intensity: 5,
    tastingNotes: ["Iodé", "Beurré", "Pointe poivrée", "Final long et persistant"],
    pairings: { wines: ["Sauternes", "Porto vintage", "Banyuls"], breads: ["Pain aux noix", "Pain aux figues"], accompaniments: ["Poire mûre", "Noix", "Miel de châtaignier"] },
    story: "Affiné dans les caves naturelles de Roquefort-sur-Soulzon depuis le Moyen Âge, ensemencé au Penicillium roqueforti issu de pain de seigle.",
    producer: "Caves de Roquefort", rawMilk: true },
  { id: "crottin", name: "Crottin de Chavignol", region: "Sancerre", category: "Chèvre", milk: "Chèvre", pricePerKg: 36, unit: "/ pièce 60g", age: "3 semaines", description: "Petit format affiné, pâte serrée, accents de noix et de foin.", emoji: "🐐",
    rind: "Naturelle, légèrement bleutée", texture: "Serrée, friable selon affinage", intensity: 3,
    tastingNotes: ["Noisette fraîche", "Foin sec", "Légère acidité caprine"],
    pairings: { wines: ["Sancerre blanc", "Pouilly-Fumé", "Crémant de Loire"], breads: ["Pain de campagne grillé"], accompaniments: ["Salade de mâche", "Miel", "Noix"] },
    story: "Petit format emblématique du Berry, AOP depuis 1976. Excellent jeune, frais et acidulé, ou affiné jusqu'à devenir sec et puissant.",
    producer: "Élevage Chavignol", rawMilk: true },
  { id: "reblochon", name: "Reblochon fermier", region: "Savoie", category: "Pâte pressée", milk: "Vache", pricePerKg: 32, unit: "/ kg", age: "6 semaines", description: "Lait cru de montagne, onctueux, parfums de cave et de pâturage.", emoji: "🏔️",
    rind: "Lavée, jaune orangé", texture: "Souple, onctueuse, fondante", intensity: 3,
    tastingNotes: ["Crème fraîche", "Pâturage d'altitude", "Noisette douce"],
    pairings: { wines: ["Apremont", "Roussette de Savoie", "Mondeuse"], breads: ["Pain de campagne", "Pain au levain"], accompaniments: ["Pommes de terre (tartiflette)", "Charcuterie de Savoie"] },
    story: "Né de la « rebloche » : seconde traite cachée aux propriétaires. Aujourd'hui AOP, fabriqué deux fois par jour à la ferme.",
    producer: "GAEC des Aravis", rawMilk: true },
  { id: "bleu-auvergne", name: "Bleu d'Auvergne", region: "Auvergne", category: "Pâte persillée", milk: "Vache", pricePerKg: 26, unit: "/ kg", age: "4 mois", description: "Pâte fondante, persillage soutenu, équilibre entre force et douceur.", emoji: "💙",
    rind: "Naturelle, fine", texture: "Crémeuse, persillée", intensity: 4,
    tastingNotes: ["Beurre", "Pointe métallique", "Champignon"],
    pairings: { wines: ["Côtes d'Auvergne rouge", "Maury", "Porto tawny"], breads: ["Pain aux céréales", "Pain aux raisins"], accompaniments: ["Poire", "Endive", "Noix"] },
    story: "Issu du Massif Central, AOP depuis 1975. Piqué à l'aiguille pour développer son persillage caractéristique.",
    producer: "Laiterie du Livradois", rawMilk: false },
  { id: "ossau", name: "Ossau-Iraty AOP", region: "Pyrénées", category: "Pâte pressée", milk: "Brebis", pricePerKg: 44, unit: "/ kg", age: "8 mois", description: "Brebis des estives, texture ferme, notes de lait cuit et d'herbes.", emoji: "🐑",
    rind: "Naturelle, brossée jaune-orangée", texture: "Ferme, dense, fondante", intensity: 3,
    tastingNotes: ["Lait cuit", "Herbes des estives", "Noisette", "Légère pointe sucrée"],
    pairings: { wines: ["Jurançon sec", "Irouléguy rouge", "Madiran"], breads: ["Pain basque", "Pain au maïs"], accompaniments: ["Confiture de cerises noires d'Itxassou", "Jambon de Bayonne"] },
    story: "Fromage de brebis Manech, transhumant dans les estives basques et béarnaises. AOP commune à l'Ossau (Béarn) et l'Iraty (Pays basque).",
    producer: "Bergerie Ardi-Gasna", rawMilk: true },
  { id: "selles", name: "Selles-sur-Cher", region: "Loir-et-Cher", category: "Chèvre", milk: "Chèvre", pricePerKg: 40, unit: "/ pièce 150g", age: "3 semaines", description: "Cendré au charbon végétal, pâte fine, équilibre acidulé remarquable.", emoji: "🌑",
    rind: "Cendrée au charbon végétal", texture: "Fine, fondante, légèrement crayeuse", intensity: 2,
    tastingNotes: ["Noisette douce", "Légère acidité", "Pointe minérale"],
    pairings: { wines: ["Sauvignon de Touraine", "Cheverny blanc"], breads: ["Pain au levain", "Tartine grillée"], accompaniments: ["Salade", "Miel", "Pomme verte"] },
    story: "AOP depuis 1975, c'est le premier fromage de chèvre français à avoir obtenu une AOC. Le cendrage régule l'humidité.",
    producer: "Chèvrerie du Cher", rawMilk: true },
  { id: "fromage-blanc", name: "Fromage blanc fermier", region: "Normandie", category: "Frais", milk: "Vache", pricePerKg: 12, unit: "/ pot 500g", age: "Frais", description: "Battu en faisselle, doux et soyeux, idéal salé ou sucré.", emoji: "🥛",
    rind: "Aucune", texture: "Crémeuse, lisse, onctueuse", intensity: 1,
    tastingNotes: ["Lait frais", "Légère acidité douce"],
    pairings: { wines: ["Cidre brut normand"], breads: ["Pain de mie grillé", "Brioche"], accompaniments: ["Confiture", "Miel", "Fruits rouges", "Échalote-ciboulette"] },
    story: "Fabriqué à la ferme avec du lait de vaches normandes, égoutté lentement pour préserver sa texture aérienne.",
    producer: "Ferme du Bocage", rawMilk: false },
  { id: "munster", name: "Munster fermier", region: "Vosges", category: "Pâte molle", milk: "Vache", pricePerKg: 30, unit: "/ kg", age: "5 semaines", description: "Croûte lavée orangée, puissance aromatique, pâte coulante.", emoji: "🔥",
    rind: "Lavée à la saumure, orangée", texture: "Coulante, fondante", intensity: 5,
    tastingNotes: ["Puissant", "Étable", "Beurré", "Pointe épicée au cumin"],
    pairings: { wines: ["Gewurztraminer vendanges tardives", "Pinot gris d'Alsace"], breads: ["Pain au cumin", "Pain de seigle"], accompaniments: ["Cumin", "Pommes de terre vapeur"] },
    story: "Fromage des moines irlandais installés dans la vallée de Munster au VIIe siècle. Sa croûte lavée concentre les arômes puissants.",
    producer: "Marcairie des Vosges", rawMilk: true },
  { id: "chevre-frais", name: "Chèvre frais aux herbes", region: "Provence", category: "Frais", milk: "Chèvre", pricePerKg: 22, unit: "/ pièce 120g", age: "Frais", description: "Roulé d'herbes de Provence, frais et tendre, parfait sur pain grillé.", emoji: "🌿",
    rind: "Roulé dans les herbes de Provence", texture: "Fraîche, mousseuse, tendre", intensity: 2,
    tastingNotes: ["Thym", "Romarin", "Sarriette", "Lait de chèvre frais"],
    pairings: { wines: ["Rosé de Provence", "Bandol blanc"], breads: ["Fougasse", "Pain aux olives"], accompaniments: ["Tomate confite", "Huile d'olive", "Salade de roquette"] },
    story: "Frais du jour, façonné à la main et roulé dans un mélange d'herbes séchées sur les coteaux provençaux.",
    producer: "Bergerie du Lubéron", rawMilk: false },
  { id: "tomme", name: "Tomme de Savoie", region: "Savoie", category: "Pâte pressée", milk: "Vache", pricePerKg: 28, unit: "/ kg", age: "3 mois", description: "Croûte grise rustique, pâte souple, saveurs de cave et de sous-bois.", emoji: "⛰️",
    rind: "Naturelle, grise tourmentée", texture: "Souple, fondante, légèrement élastique", intensity: 2,
    tastingNotes: ["Cave humide", "Sous-bois", "Noisette douce"],
    pairings: { wines: ["Apremont", "Chignin-Bergeron", "Mondeuse légère"], breads: ["Pain de seigle", "Pain de campagne"], accompaniments: ["Pomme", "Charcuterie savoyarde"] },
    story: "Fromage de garde des paysans savoyards, fabriqué à partir du lait écrémé après le prélèvement de la crème pour le beurre.",
    producer: "Coopérative du Beaufortain", rawMilk: true },
];

export const categories: CheeseCategory[] = ["Pâte molle", "Pâte pressée", "Pâte persillée", "Chèvre", "Frais"];
export const milks: Milk[] = ["Vache", "Brebis", "Chèvre"];