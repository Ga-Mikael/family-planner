// Auto-categorize groceries by keyword matching the French item name.
// Categories are listed in typical supermarket aisle order to make the
// list practical to follow while shopping.

export type GroceryCategory =
  | "fruits-legumes"
  | "viandes-poissons"
  | "frais"
  | "boulangerie"
  | "epicerie"
  | "sucre"
  | "boissons"
  | "hygiene"
  | "surgele"
  | "autres";

export interface CategoryMeta {
  id: GroceryCategory;
  label: string;
  icon: string; // emoji intentionnel (catégorie, pas icône structurelle)
  order: number;
}

export const GROCERY_CATEGORIES: CategoryMeta[] = [
  { id: "fruits-legumes",   label: "Fruits & légumes",    icon: "🥕", order: 1 },
  { id: "boulangerie",      label: "Boulangerie",         icon: "🥖", order: 2 },
  { id: "viandes-poissons", label: "Viandes & poissons",  icon: "🥩", order: 3 },
  { id: "frais",            label: "Frais",               icon: "🥛", order: 4 },
  { id: "epicerie",         label: "Épicerie",            icon: "🥫", order: 5 },
  { id: "sucre",            label: "Sucré & petit-déj",   icon: "🍫", order: 6 },
  { id: "boissons",         label: "Boissons",            icon: "🍷", order: 7 },
  { id: "surgele",          label: "Surgelés",            icon: "🧊", order: 8 },
  { id: "hygiene",          label: "Hygiène & maison",    icon: "🧼", order: 9 },
  { id: "autres",           label: "Autres",              icon: "📦", order: 99 },
];

// Lookup table — category ← lowercase keyword. First match wins (loop order).
const KEYWORDS: Array<[GroceryCategory, string[]]> = [
  ["fruits-legumes", [
    "pomme", "poire", "banane", "orange", "citron", "fraise", "framboise", "raisin",
    "kiwi", "ananas", "mangue", "avocat", "abricot", "peche", "pêche", "prune", "cerise",
    "tomate", "salade", "laitue", "carotte", "patate", "pomme de terre", "oignon", "ail",
    "echalote", "échalote", "courgette", "aubergine", "poivron", "concombre", "radis",
    "champignon", "brocoli", "chou", "épinard", "epinard", "haricot", "petit pois",
    "mais", "maïs", "betterave", "navet", "panais", "celeri", "céleri", "fenouil",
    "basilic", "menthe", "persil", "coriandre", "ciboulette", "herb", "thym", "romarin",
    "gingembre", "fruit", "légume", "legume",
  ]],
  ["boulangerie", [
    "pain", "baguette", "brioche", "viennois", "croissant", "pain au chocolat",
    "pain au lait", "biscotte", "tartine", "buns", "burger",
  ]],
  ["viandes-poissons", [
    "boeuf", "bœuf", "veau", "porc", "agneau", "mouton", "lapin", "poulet", "dinde",
    "canard", "caille", "steak", "côte", "cote", "rôti", "roti", "escalope", "saucisse",
    "saucisson", "merguez", "lardon", "jambon", "viande", "hach", "poisson", "saumon",
    "thon", "morue", "cabillaud", "colin", "sole", "truite", "sardine", "anchois",
    "crevette", "moule", "huitre", "huître", "calamar", "encornet",
  ]],
  ["frais", [
    "lait", "yaourt", "fromage", "comté", "comte", "gruyère", "gruyere", "emmental",
    "brie", "camembert", "chèvre", "chevre", "mozzarella", "parmesan", "feta",
    "beurre", "crème", "creme", "creme fraiche", "creme fraîche", "kefir", "kéfir",
    "petit suisse", "fromage blanc", "skyr", "compote", "œuf", "oeuf",
  ]],
  ["epicerie", [
    "pâte", "pate", "riz", "couscous", "semoule", "lentille", "haricot sec", "pois chiche",
    "quinoa", "boulgour", "huile", "vinaigre", "sel", "poivre", "sucre", "farine",
    "levure", "épice", "epice", "curry", "paprika", "moutarde", "ketchup", "mayonnaise",
    "sauce", "tomate concassée", "tomate pelée", "conserve", "boite", "boîte", "thon en boite",
    "soupe", "bouillon", "stock", "biscuit salé", "biscuit sale", "chips", "noix",
    "amande", "cacahuete", "cacahuète", "noisette",
  ]],
  ["sucre", [
    "chocolat", "biscuit", "gateau", "gâteau", "céréale", "cereale", "muesli",
    "confiture", "miel", "nutella", "bonbon", "barre", "kinder", "oreo", "lu",
    "madeleine", "petit beurre", "speculoos", "spéculoos", "tarte", "muffin",
  ]],
  ["boissons", [
    "eau", "soda", "coca", "fanta", "sprite", "schweppes", "ice tea", "ice-tea", "thé",
    "the", "café", "cafe", "tisane", "infusion", "jus", "smoothie", "vin", "bière", "biere",
    "champagne", "cidre", "rhum", "whisky", "vodka", "gin", "rosé", "rose", "blanc",
    "rouge", "sirop",
  ]],
  ["surgele", [
    "surgel", "glace", "sorbet", "frite", "épinard surgel", "epinard surgel", "pizza surgel",
    "nuggets",
  ]],
  ["hygiene", [
    "papier toilette", "pq", "essuie tout", "essuie-tout", "sopalin", "savon", "gel douche",
    "shampoing", "shampooing", "dentifrice", "brosse à dent", "brosse a dent", "déodorant",
    "deodorant", "lessive", "adoucissant", "javel", "produit vaisselle", "liquide vaisselle",
    "éponge", "eponge", "sac poubelle", "mouchoir", "coton", "couche", "tampon", "serviette",
    "cosmetique", "cosmétique", "crème solaire", "creme solaire",
  ]],
];

/** Returns the category id matching the first keyword found in `name`. */
export function categorize(name: string): GroceryCategory {
  const n = name.toLowerCase().trim();
  if (!n) return "autres";
  for (const [cat, keys] of KEYWORDS) {
    if (keys.some((k) => n.includes(k))) return cat;
  }
  return "autres";
}

/** Returns category metadata object. */
export function categoryMeta(id: GroceryCategory): CategoryMeta {
  return GROCERY_CATEGORIES.find((c) => c.id === id) ?? GROCERY_CATEGORIES[GROCERY_CATEGORIES.length - 1];
}
