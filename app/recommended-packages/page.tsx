"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy, X } from "lucide-react";
import StepProgressBar from "@/components/StepProgressBar";
import BudgetTracker from "@/components/BudgetTracker";

type EventDetails = {
  selectedOccasion: string;
  guests: number;
  kids: number;
  uninvited: number;
  budget: number;
  selectedStyle: string;
  dietaryPreference?: string;
  platePreference?: string;
};

type RecipeItem = {
  id: string;
  name: string;
  image: string;
  timeMinutes: number;
};

type RecipeIngredient = {
  name: string;
  grams?: number;
  productName?: string;
  packGrams?: number;
  productPacks?: number;
};

type RecipeMapping = {
  recipeName: string;
  sourceUrl: string;
  servings: number;
  ingredients: RecipeIngredient[];
  unmappedIngredients: string[];
};

type ProductItem = {
  id: string;
  name: string;
  image: string;
  price: number;
};

type RecommendedProduct = {
  name: string;
  image: string;
  quantity: number;
  why: string;
  alternative?: string;
};

type RecommendedRecipe = {
  id: string;
  name: string;
  image: string;
  ingredientProducts: string[];
  unmappedIngredients: string[];
};

type RecommendedPackage = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  serves: number;
  perPerson: number;
  portionPreview: string;
  priceTier: "Value" | "Balanced" | "Premium";
  badge: string | null;
  image: string;
  bgColor: string;
  products: RecommendedProduct[];
  recipes: RecommendedRecipe[];
  servingNote: string;
};

const parseCsvRow = (row: string): string[] => {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (inQuotes && row[index + 1] === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
};

const parseCsvRecords = (csvText: string): Record<string, string>[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvRow(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ? values[index].replace(/^['"]|['"]$/g, "") : "";
    });

    return record;
  });
};

const readCsvRecords = async (path: string): Promise<Record<string, string>[]> => {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status}).`);
  }
  const text = await response.text();
  return parseCsvRecords(text);
};

const parsePriceValue = (value: string): number | null => {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^0-9,.-]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const calculateMedian = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
  }

  return sorted[middleIndex];
};

const estimateProductPrice = (name: string, knownPrices: number[]): number => {
  const normalized = normalizeName(name);
  const keywordBuckets: Array<[RegExp, [number, number]]> = [
    [/wors|sosatie|sausages|lekker|bekkies|skilpadjies/, [12, 60]],
    [/ribs|rib/, [30, 180]],
    [/steak|chops|loin|rump|fillet|minute|kassler|gammon|silverside|trotter|belly/, [25, 220]],
    [/mince|goulash|stew|neck|armadillo|pork|beef/, [15, 180]],
    [/sauce|mayo|mustard|tomato|chillinaise|secret|burger|prego/, [5, 35]],
    [/eisbein|rashers|shank|bacon|cheese|chilli|honey|creamy|marinated/, [10, 140]],
  ];

  const selectedBucket = keywordBuckets.find(([pattern]) => pattern.test(normalized));

  const candidatePrices = selectedBucket
    ? knownPrices.filter((price) => {
        const [min, max] = selectedBucket[1];
        return price >= min && price <= max;
      })
    : knownPrices;

  const sourcePrices = candidatePrices.length > 0 ? candidatePrices : knownPrices;
  if (sourcePrices.length === 0) {
    return 0;
  }

  return Number(calculateMedian(sourcePrices).toFixed(2));
};

const getProductCatalog = async (): Promise<ProductItem[]> => {
  const dataFiles = [
    "/data/eskort-products.csv",
    "/data/eskort-extras-1.csv",
    "/data/eskort-extras-2.csv",
  ];

  const fileResults = await Promise.all(dataFiles.map((filePath) => readCsvRecords(filePath)));
  const priceRows = await readCsvRecords("/data/eskort-prices.csv");

  const knownPrices = priceRows
    .map((row) => parsePriceValue(row["PriceIncVat"] || row["price"] || row["Price"] || ""))
    .filter((price): price is number => price !== null);

  const uniqueNames = new Set<string>();

  return fileResults
    .flat()
    .map((row, index) => {
      const name = row.data || row.name || row["Product Name"] || "";
      const image = row.image || row["Image URL"] || row["image url"] || "";

      if (!name || !image || uniqueNames.has(name)) {
        return null;
      }

      uniqueNames.add(name);

      return {
        id: `${row.web_scraper_order || index}-${name}`,
        name,
        image,
        price: estimateProductPrice(name, knownPrices),
      };
    })
    .filter((item): item is ProductItem => item !== null);
};

const getRecipes = async (): Promise<RecipeItem[]> => {
  const rows = await readCsvRecords("/data/recipes_data_true.csv");
  return rows
    .map((row, index) => {
      const name = row.recipe_name?.trim() ?? "";
      const image = row.image?.trim() ?? "";
      const timeMinutes = Number.parseInt(row.time ?? "", 10);
      if (!name || !image || !Number.isFinite(timeMinutes)) return null;
      return {
        id: row.web_scraper_order || `${index}-${name}`,
        name,
        image,
        timeMinutes,
      };
    })
    .filter((recipe): recipe is RecipeItem => recipe !== null);
};

const getRecipeMappings = async (): Promise<RecipeMapping[]> => {
  const response = await fetch("/data/recipe-product-mapping.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load recipe-product mapping (${response.status}).`);
  }
  const mappings: unknown = await response.json();
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new Error("Recipe-product mapping data is empty or invalid.");
  }
  return mappings as RecipeMapping[];
};

type MappedRecipeIngredient = {
  source: RecipeIngredient & { productName: string; packGrams: number };
  product: ProductItem;
};

type RecipeMatch = {
  recipe: RecipeItem;
  mapping: RecipeMapping;
  ingredients: MappedRecipeIngredient[];
  unmappedIngredients: string[];
  category: string;
  score: number;
};

const getRecipeCategory = (name: string): string => {
  if (/ribs?/i.test(name)) return "ribs";
  if (/chops?/i.test(name)) return "chops";
  if (/espetada|kebab|sosatie/i.test(name)) return "skewers";
  if (/eisbein/i.test(name)) return "eisbein";
  return "other";
};

const buildRecommendedPackages = (
  products: ProductItem[],
  recipes: RecipeItem[],
  mappings: RecipeMapping[],
  event: EventDetails | null
): RecommendedPackage[] => {
  if (!products.length || !recipes.length || !mappings.length) return [];

  const totalPeople = Math.max(1, (event?.guests ?? 8) + (event?.kids ?? 0) + (event?.uninvited ?? 0));
  const adultEquivalentGuests = Math.max(
    1,
    (event?.guests ?? 8) + (event?.uninvited ?? 0) + (event?.kids ?? 0) * 0.55
  );
  const budget = event?.budget || 2500;
  const dietaryPreference = normalizeName(`${event?.dietaryPreference ?? ""} ${event?.platePreference ?? ""}`);
  const excludesMeat = /\b(vegan|vegetarian|plant based|pescatarian)\b/.test(dietaryPreference);
  const requiresCertification = /\b(halal|kosher)\b/.test(dietaryPreference);
  if (excludesMeat || requiresCertification) return [];

  const occasionOrder: Record<string, string[]> = {
    "family-braai": ["chops", "ribs", "skewers", "rashers", "eisbein"],
    "friends-get-together": ["ribs", "skewers", "rashers", "chops", "eisbein"],
    "game-day": ["ribs", "rashers", "chops", "skewers", "eisbein"],
    birthday: ["skewers", "ribs", "chops", "rashers", "eisbein"],
    wedding: ["skewers", "ribs", "chops", "eisbein"],
    corporate: ["skewers", "chops", "ribs", "rashers"],
  };
  const styleOrder: Record<string, string[]> = {
    classic: ["chops", "ribs", "skewers", "rashers", "eisbein"],
    "shisa-nyama": ["skewers", "ribs", "chops", "rashers"],
    potjie: ["eisbein", "ribs", "chops"],
    "gas-braai": ["rashers", "skewers", "chops", "ribs"],
  };
  const occasion = occasionOrder[event?.selectedOccasion ?? "family-braai"] ?? occasionOrder["family-braai"];
  const style = styleOrder[event?.selectedStyle ?? "classic"] ?? styleOrder.classic;
  const mappingsByName = new Map(mappings.map((mapping) => [normalizeName(mapping.recipeName), mapping]));
  const matches = recipes
    .map((recipe) => {
      const mapping = mappingsByName.get(normalizeName(recipe.name));
      if (!mapping) return null;

      const unmappedIngredients = [...mapping.unmappedIngredients];
      const ingredients = mapping.ingredients.flatMap((source) => {
        const productName = source.productName;
        const packGrams = source.packGrams;
        const productPacks = source.productPacks;
        if (!productName || ((!packGrams || packGrams <= 0) && (!productPacks || productPacks <= 0))) {
          unmappedIngredients.push(source.name);
          return [];
        }
        const product = products.find((candidate) =>
          normalizeName(candidate.name) === normalizeName(productName)
        );
        if (!product || product.price <= 0) {
          unmappedIngredients.push(source.name);
          return [];
        }
        return [{
          source: { ...source, productName, packGrams: packGrams ?? 0, productPacks: productPacks ?? 0 },
          product,
        }];
      });

      if (ingredients.length === 0) return null;
      return {
        recipe,
        mapping,
        ingredients,
        unmappedIngredients,
        category: getRecipeCategory(recipe.name),
        score: 0,
      };
    })
    .filter((match): match is RecipeMatch => match !== null)
    .filter((match) => {
      if (/\b(no pork|pork free|pork-free)\b/.test(dietaryPreference)) {
        return !/pork|ribs|eisbein|wors|rashers|bacon|sosatie/i.test(
          `${match.recipe.name} ${match.ingredients.map((ingredient) => ingredient.source.name).join(" ")}`
        );
      }
      return true;
    })
    .map((match) => ({
      ...match,
      score:
        Math.max(0, 12 - (style.indexOf(match.category) < 0 ? 8 : style.indexOf(match.category) * 2)) +
        Math.max(0, 8 - (occasion.indexOf(match.category) < 0 ? 6 : occasion.indexOf(match.category))) +
        (match.recipe.timeMinutes <= 45 && event?.selectedStyle === "gas-braai" ? 3 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.ingredients[0].product.price - right.ingredients[0].product.price);

  if (!matches.length) return [];

  const combinations: RecipeMatch[][] = [];
  const rankedMatches = matches;
  for (let first = 0; first < rankedMatches.length; first += 1) {
    combinations.push([rankedMatches[first]]);
    for (let second = first + 1; second < rankedMatches.length; second += 1) {
      combinations.push([rankedMatches[first], rankedMatches[second]]);
    }
  }

  const candidates = combinations.flatMap((combination, index) => {
    const quantities = new Map<string, { product: ProductItem; quantity: number; grams: number; recipes: string[] }>();
    combination.forEach((match) => {
      match.ingredients.forEach(({ source, product }) => {
        const packGrams = source.packGrams ?? 0;
        const scaledQuantity = source.grams && packGrams > 0
          ? source.grams / match.mapping.servings * adultEquivalentGuests / combination.length / packGrams
          : (source.productPacks ?? 0) * adultEquivalentGuests / match.mapping.servings / combination.length;
        const quantity = Math.max(1, Math.ceil(scaledQuantity));
        const existing = quantities.get(product.id);
        if (existing) {
          existing.quantity += quantity;
          existing.recipes.push(match.recipe.name);
        } else {
          quantities.set(product.id, { product, quantity, grams: packGrams, recipes: [match.recipe.name] });
        }
      });
    });

    const selected = Array.from(quantities.values());
    const price = Number(selected.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2));
    if (price > budget || price <= 0) return [];

    const totalGrams = selected.reduce((sum, item) => sum + item.grams * item.quantity, 0);
    const eventScore = combination.reduce((sum, match) => sum + match.score, 0);
    const budgetScore = 30 - Math.abs(price / budget - 0.82) * 30;
    const portionFitScore = -Math.abs(totalGrams / adultEquivalentGuests - 375) / 5;
    const recipeDisplay: RecommendedRecipe[] = combination.map((match) => ({
      id: match.recipe.id,
      name: match.recipe.name,
      image: match.recipe.image,
      ingredientProducts: match.ingredients.map((ingredient) => ingredient.product.name),
      unmappedIngredients: match.unmappedIngredients,
    }));

    return [{
      id: `recipe-package-${index}-${combination.map((match) => match.recipe.id).join("-")}`,
      name: combination.length === 1
        ? combination[0].recipe.name
        : `${combination.length}-recipe menu`,
      tagline: `Recipes selected for your ${event?.selectedOccasion?.replace(/-/g, " ") ?? "braai"}, scaled for ${totalPeople} guests.`,
      price,
      serves: totalPeople,
      perPerson: Math.round(price / totalPeople),
      portionPreview: totalGrams > 0
        ? `About ${Math.round(totalGrams / adultEquivalentGuests)} g of weighed products per adult-equivalent guest, plus unit-based recipe items.`
        : `Recipe portions scaled to ${totalPeople} guests from the published serving count.`,
      priceTier: "Balanced" as const,
      badge: null,
      image: combination[0].recipe.image,
      bgColor: "#1a2a1a",
      products: selected.map((item) => ({
        name: item.product.name,
        image: item.product.image,
        quantity: item.quantity,
        why: `Mapped recipe ingredient for ${item.recipes.join(", ")}.`,
      })),
      recipes: recipeDisplay,
      servingNote: "Package quantities include only recipe ingredients that match an Eskort product in the existing catalog. Other recipe ingredients are not included.",
      score: eventScore + budgetScore + portionFitScore,
    }];
  });

  const distinctCandidates = candidates
    .sort((left, right) => right.score - left.score || left.price - right.price)
    .filter((candidate, index, all) => all.findIndex((other) =>
      other.recipes.map((recipe) => recipe.id).sort().join("|") === candidate.recipes.map((recipe) => recipe.id).sort().join("|")
    ) === index);

  type Candidate = (typeof distinctCandidates)[number];
  let bestSelection: Candidate[] = [];
  let bestSelectionScore = Number.NEGATIVE_INFINITY;

  const selectDistinctPackages = (
    recipeIndex: number,
    selected: Candidate[],
    usedRecipeIds: Set<string>,
    usedPrices: Set<string>,
    score: number
  ) => {
    if (recipeIndex >= rankedMatches.length) {
      const coveredRecipes = usedRecipeIds.size;
      const bestCoveredRecipes = bestSelection.reduce(
        (count, candidate) => count + candidate.recipes.length,
        0
      );
      if (
        selected.length > bestSelection.length ||
        (selected.length === bestSelection.length && coveredRecipes > bestCoveredRecipes) ||
        (selected.length === bestSelection.length &&
          coveredRecipes === bestCoveredRecipes &&
          score > bestSelectionScore)
      ) {
        bestSelection = [...selected];
        bestSelectionScore = score;
      }
      return;
    }

    const currentRecipeId = rankedMatches[recipeIndex].recipe.id;
    if (usedRecipeIds.has(currentRecipeId)) {
      selectDistinctPackages(recipeIndex + 1, selected, usedRecipeIds, usedPrices, score);
      return;
    }

    selectDistinctPackages(recipeIndex + 1, selected, usedRecipeIds, usedPrices, score);

    distinctCandidates.forEach((candidate) => {
      const candidateRecipeIds = candidate.recipes.map((recipe) => recipe.id);
      const firstRecipeIndex = rankedMatches.findIndex((match) => match.recipe.id === candidateRecipeIds[0]);
      const priceKey = candidate.price.toFixed(2);
      if (
        firstRecipeIndex !== recipeIndex ||
        usedPrices.has(priceKey) ||
        candidateRecipeIds.some((recipeId) => usedRecipeIds.has(recipeId))
      ) {
        return;
      }

      const nextRecipeIds = new Set(usedRecipeIds);
      candidateRecipeIds.forEach((recipeId) => nextRecipeIds.add(recipeId));
      const nextPrices = new Set(usedPrices);
      nextPrices.add(priceKey);
      selectDistinctPackages(
        recipeIndex + 1,
        [...selected, candidate],
        nextRecipeIds,
        nextPrices,
        score + candidate.score
      );
    });
  };

  selectDistinctPackages(0, [], new Set<string>(), new Set<string>(), 0);
  const uniqueCandidates = bestSelection
    .sort((left, right) => right.score - left.score || left.price - right.price)
    .slice(0, 4);

  const prices = uniqueCandidates.map((candidate) => candidate.price).sort((left, right) => left - right);
  const lowPriceCutoff = prices[Math.floor((prices.length - 1) / 3)] ?? 0;
  const highPriceCutoff = prices[Math.ceil(((prices.length - 1) * 2) / 3)] ?? 0;
  const usedNames = new Set<string>();

  return uniqueCandidates.map(({ score: _score, ...candidate }, index) => {
    const name = index === 0 ? `Top Pick - ${candidate.name}` : candidate.name;
    const uniqueName = usedNames.has(normalizeName(name)) ? `${name} ${index + 1}` : name;
    usedNames.add(normalizeName(uniqueName));
    return {
      ...candidate,
      name: uniqueName,
      badge: `${Math.round((1 - candidate.price / budget) * 100)}% under budget`,
      priceTier: lowPriceCutoff === highPriceCutoff
        ? "Balanced"
        : candidate.price <= lowPriceCutoff
          ? "Value"
          : candidate.price >= highPriceCutoff
            ? "Premium"
            : "Balanced",
    };
  });
};

export default function RecommendedPackagesPage() {
  const router = useRouter();
  const [detailsPackageId, setDetailsPackageId] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [recipeMappings, setRecipeMappings] = useState<RecipeMapping[]>([]);
  const [recommendationError, setRecommendationError] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("eskort-braai-event");
    if (saved) {
      try {
        setEventDetails(JSON.parse(saved) as EventDetails);
      } catch {
        setEventDetails(null);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      const [items, availableRecipes, mappings] = await Promise.all([
        getProductCatalog(),
        getRecipes(),
        getRecipeMappings(),
      ]);
      if (isMounted) {
        setProducts(items);
        setRecipes(availableRecipes);
        setRecipeMappings(mappings);
      }
    };

    void loadCatalog().catch((error: unknown) => {
      if (isMounted) {
        setRecommendationError(
          error instanceof Error ? error.message : "Could not load recipe recommendations."
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const packages = useMemo(
    () => buildRecommendedPackages(products, recipes, recipeMappings, eventDetails),
    [products, recipes, recipeMappings, eventDetails]
  );
  const detailsPackage = packages.find((pkg) => pkg.id === detailsPackageId);

  useEffect(() => {
    if (!detailsPackageId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsPackageId(null);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailsPackageId]);

  const visiblePackages = packages.slice(0, visibleCount);
  const hasMorePackages = visibleCount < packages.length;

  const totalGuests = eventDetails
    ? Math.max(1, eventDetails.guests + eventDetails.uninvited + eventDetails.kids)
    : 8;
  const displayedGuestCount = eventDetails
    ? Math.max(1, eventDetails.guests + eventDetails.uninvited + eventDetails.kids)
    : 8;

  const budget = eventDetails?.budget || 2500;
  const cart = packages.length > 0
    ? packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length
    : 0;

  const handleStart = (pkgId: string) => {
    const selectedPackage = packages.find((pkg) => pkg.id === pkgId);
    if (!selectedPackage) {
      return;
    }

    const matchedProducts = selectedPackage.products
      .map((recommendedProduct) => {
        const match = products.find((product) => {
          const candidateName = normalizeName(recommendedProduct.name);
          const productName = normalizeName(product.name);

          return productName.includes(candidateName) || candidateName.includes(productName);
        });

        return {
          id: match?.id ?? `package-${recommendedProduct.name}`,
          name: match?.name ?? recommendedProduct.name,
          image: match?.image ?? "",
          price: match?.price ?? 0,
          quantity: recommendedProduct.quantity,
        };
      })
      .filter((product) => product.name);

    const total = Number(
      matchedProducts.reduce((sum, product) => sum + product.price * product.quantity, 0).toFixed(2)
    );

    const basketPayload = {
      packageId: pkgId,
      packageName: selectedPackage.name,
      total,
      products: matchedProducts.length > 0 ? matchedProducts : selectedPackage.products.map((product) => ({
        id: `package-${product.name}`,
        name: product.name,
        image: "",
        price: 0,
        quantity: product.quantity,
      })),
    };

    localStorage.setItem("eskort-selected-package", JSON.stringify(basketPayload));
    router.push(`/build-my-braai?package=${pkgId}`);
  };

  const handleBuildYourOwn = () => {
    localStorage.removeItem("eskort-selected-package");
  };

  return (
    <div className="min-h-screen bg-eskort-cream-light">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          href="/event-details"
          className="inline-flex items-center gap-1 text-eskort-red text-sm font-semibold mb-4 hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <StepProgressBar currentStep={2} totalSteps={3} />

        <div className="mb-2">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest">
            {eventDetails ? "Based on your event" : "Most Hosts"}
          </p>
          <h1 className="font-display text-6xl md:text-7xl text-eskort-red leading-none tracking-wide">
            START HERE
          </h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          {eventDetails ? (
            <>
              <strong className="text-eskort-black">{totalGuests} guests</strong> · R{budget.toLocaleString()} budget ·
              {" "}R{Math.round(budget / displayedGuestCount).toLocaleString()}/person · {eventDetails.selectedStyle}
            </>
          ) : (
            <>
              Popular, editable braai baskets matched to <strong className="text-eskort-black">8 guests</strong> · R2 500 budget ·
              R313/person
            </>
          )}
        </p>

        <BudgetTracker budget={budget} spent={Math.round(cart)} />
        <p className="mb-6 text-xs text-gray-500">
          Recipe quantities are scaled from the published servings. Product prices are estimates because the price feed is not linked to individual product SKUs; ingredients without a matching Eskort product are omitted and flagged.
        </p>

        {recommendationError ? (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            {recommendationError}
          </div>
        ) : products.length > 0 && recipes.length > 0 && packages.length === 0 ? (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            No package could be built within this budget using the current product selection and price estimates. Try increasing the budget, reducing the guest count, or building your own braai.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 items-stretch">
            {visiblePackages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="relative h-40 bg-gray-200 shrink-0">
                {pkg.badge && (
                  <div className="absolute left-3 top-3 bg-[#d52027] text-white text-[10px] font-bold rounded px-2 py-1 uppercase tracking-wide">
                    {pkg.badge}
                  </div>
                )}
                <img
                  src={pkg.image}
                  alt={pkg.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-3">
                <h3
                  className="h-10 shrink-0 overflow-hidden font-bold text-sm leading-snug text-[#1a1a1a] break-words"
                  style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                >
                  {pkg.name}
                </h3>
                <p
                  className="mt-1 h-8 shrink-0 overflow-hidden text-[10px] leading-snug text-gray-500 break-words"
                  style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                >
                  {pkg.tagline}
                </p>

                <div className="mt-3 flex shrink-0 items-center justify-between gap-2">
                  <div className={`min-w-0 font-bold text-base ${pkg.priceTier === "Premium" ? "text-[#1a1a1a]" : pkg.priceTier === "Value" ? "text-green-700" : "text-[#d52027]"}`}>
                    R{pkg.price.toFixed(2)}
                    <span className={`ml-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] uppercase ${pkg.priceTier === "Premium" ? "bg-[#1a1a1a] text-white" : pkg.priceTier === "Value" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {pkg.priceTier}
                    </span>
                  </div>
                  <span className="shrink-0 text-right text-gray-500 text-[10px]">
                    serves {pkg.serves}
                  </span>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 items-start">
                  <p
                    className="max-h-12 overflow-hidden text-xs leading-relaxed text-gray-600"
                    style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                  >
                    {pkg.recipes.length} recipe{pkg.recipes.length === 1 ? "" : "s"} · {pkg.portionPreview}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between pt-2 text-[10px] text-gray-500">
                  <span>R{pkg.perPerson}/person</span>
                  <span>{pkg.serves} guests</span>
                </div>

                <button
                  onClick={() => setDetailsPackageId(pkg.id)}
                  className="mt-3 w-full shrink-0 btn-red py-2.5 text-xs leading-tight"
                >
                  View Package
                </button>
              </div>
            </div>
            ))}
          </div>
        )}

        {hasMorePackages && (
          <button
            type="button"
            onClick={() => setVisibleCount(Math.min(visibleCount + 5, 10))}
            className="mb-8 w-full rounded-xl bg-eskort-red py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            See More
          </button>
        )}

        {detailsPackage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setDetailsPackageId(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="package-dialog-title"
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <h2 id="package-dialog-title" className="whitespace-normal break-words text-xl font-bold leading-tight text-[#1a1a1a]">{detailsPackage.name}</h2>
                  <p className="mt-1 whitespace-normal break-words text-sm text-gray-500">{detailsPackage.tagline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsPackageId(null)}
                  aria-label="Close package details"
                  className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <img src={detailsPackage.image} alt="" className="h-48 w-full rounded-md object-cover" />
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-2xl font-bold text-[#d52027]">R{detailsPackage.price}</p>
                  <p className="whitespace-normal text-sm text-gray-500">Serves {detailsPackage.serves} · R{detailsPackage.perPerson}/person</p>
                </div>

                <div className="mt-4 rounded-md bg-[#f4f3f1] p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a1a1a]">Recipes this package serves</h3>
                  <p className="mt-1 text-sm text-gray-600">{detailsPackage.portionPreview}</p>
                  <ul className="mt-3 space-y-3">
                    {detailsPackage.recipes.map((recipe) => (
                      <li key={recipe.id} className="min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{recipe.name}</p>
                          <p className="mt-1 text-xs text-gray-600">
                            Matched Eskort ingredient{recipe.ingredientProducts.length === 1 ? "" : "s"}: {recipe.ingredientProducts.join(", ")}
                          </p>
                          {recipe.unmappedIngredients.length > 0 && (
                            <p className="mt-1 text-xs text-amber-800">
                              Not in the Eskort catalog: {recipe.unmappedIngredients.join(", ")}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a1a1a]">What’s in the package</h3>
                  <div className="mt-3 space-y-3">
                    {detailsPackage.products.map((product) => (
                      <div key={`${detailsPackage.id}-${product.name}`} className="flex min-w-0 items-start gap-3 border-b border-gray-100 pb-3 last:border-0">
                        <img src={product.image} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-sm">
                            <span className="min-w-0 flex-1 whitespace-normal break-words font-semibold text-gray-800">{product.name}</span>
                            <span className="shrink-0 font-bold text-[#d52027]">x{product.quantity}</span>
                          </div>
                          <p className="mt-1 whitespace-normal break-words text-xs leading-relaxed text-gray-600">{product.why}</p>
                          {product.alternative && <p className="mt-1 whitespace-normal break-words text-xs leading-relaxed text-green-700">{product.alternative}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-md bg-[#f4f3f1] p-4">
                  <h3 className="text-sm font-bold text-[#1a1a1a]">Serving suggestions</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{detailsPackage.servingNote}</p>
                </div>
              </div>

              <footer className="shrink-0 border-t border-gray-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => handleStart(detailsPackage.id)}
                  className="w-full btn-red py-3 text-sm font-bold"
                >
                  Start With This Basket
                </button>
              </footer>
            </section>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Link
            href="/build-my-braai"
            onClick={handleBuildYourOwn}
            className="btn-dark py-3 text-center flex items-center justify-center gap-2"
          >
            <span>🥩</span> Build My Own Braai
          </Link>
          <button className="btn-dark py-3 flex items-center justify-center gap-2">
            <Trophy size={16} className="text-eskort-yellow" />
            My Rewards (coming soon)
          </button>
        </div>

        <button
          type="button"
          disabled
          className="mb-3 w-full cursor-not-allowed rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-500"
        >
          ⚖️ View Fair Share Portion Preview (Coming Soon)
        </button>
      </div>
    </div>
  );
}
