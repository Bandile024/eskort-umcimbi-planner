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

type RecommendedPackage = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  serves: number;
  perPerson: number;
  priceTier: "Value" | "Balanced" | "Premium";
  badge: string | null;
  image: string;
  bgColor: string;
  products: RecommendedProduct[];
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
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    return parseCsvRecords(text);
  } catch {
    return [];
  }
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

const buildRecommendedPackages = (
  products: ProductItem[],
  event: EventDetails | null
): RecommendedPackage[] => {
  if (!products.length) return [];

  const adults = Math.max(1, event?.guests ?? 8);
  const kids = Math.max(0, event?.kids ?? 0);
  const bufferGuests = Math.max(0, event?.uninvited ?? 0);
  const totalPeople = adults + kids + bufferGuests;
  const adultEquivalentGuests = adults + bufferGuests + kids * 0.55;
  const budget = event?.budget || 2500;
  const targetMeatGrams = adultEquivalentGuests * 350;

  const categoryPatterns: Record<string, RegExp> = {
    wors: /wors|sausage|sosatie|skilpad|bekkies/,
    ribs: /ribs?|spare/,
    grill: /steak|chops?|fillet|rump|loin|kassler/,
    potjie: /mince|goulash|stew|neck|belly|armadillo/,
    marinated: /marinated|prego|espetada|pulled pork/,
  };
  const packDefaults: Record<string, { grams: number; edibleYield: number }> = {
    wors: { grams: 500, edibleYield: 0.98 },
    ribs: { grams: 800, edibleYield: 0.72 },
    grill: { grams: 500, edibleYield: 0.9 },
    potjie: { grams: 500, edibleYield: 0.9 },
    marinated: { grams: 500, edibleYield: 0.9 },
  };
  const styleCategories: Record<string, string[]> = {
    classic: ["wors", "grill", "ribs"],
    "shisa-nyama": ["wors", "grill", "ribs"],
    potjie: ["potjie", "wors", "marinated"],
    "gas-braai": ["marinated", "grill", "ribs"],
  };
  const occasionPatterns: Record<string, RegExp> = {
    "family-braai": /wors|chops?|fillet|ribs?|marinated/,
    "friends-get-together": /wors|ribs?|steak|sosatie|fillet/,
    "game-day": /wors|ribs?|steak|marinated/,
    birthday: /ribs?|steak|wors|fillet/,
    wedding: /fillet|steak|ribs?|marinated/,
    corporate: /fillet|steak|ribs?|wors/,
  };
  const styleMixes: Record<string, Record<string, number>> = {
    classic: { wors: 0.35, grill: 0.4, ribs: 0.25 },
    "shisa-nyama": { wors: 0.45, grill: 0.3, ribs: 0.25 },
    potjie: { potjie: 0.75, wors: 0.15, marinated: 0.1 },
    "gas-braai": { marinated: 0.35, grill: 0.4, ribs: 0.25 },
  };
  const preferredCategories = styleCategories[event?.selectedStyle ?? "classic"] ?? styleCategories.classic;
  const occasionPattern = occasionPatterns[event?.selectedOccasion ?? "family-braai"] ?? occasionPatterns["family-braai"];
  const occasionPriority: Record<string, string[]> = {
    "family-braai": ["wors", "grill", "ribs", "marinated"],
    "friends-get-together": ["wors", "ribs", "marinated", "grill"],
    "game-day": ["wors", "ribs", "marinated", "grill"],
    birthday: ["wors", "grill", "ribs", "marinated"],
    wedding: ["grill", "ribs", "marinated", "wors"],
    corporate: ["grill", "marinated", "wors", "ribs"],
  };
  const occasionCategories = occasionPriority[event?.selectedOccasion ?? "family-braai"] ?? occasionPriority["family-braai"];

  const categoryFor = (product: ProductItem) =>
    Object.keys(categoryPatterns).find((category) => categoryPatterns[category].test(normalizeName(product.name)));
  const scoreProduct = (product: ProductItem, category: string) => {
    const name = normalizeName(product.name);
    const styleRank = preferredCategories.indexOf(category);
    const occasionRank = occasionCategories.indexOf(category);
    return (styleRank >= 0 ? 12 - styleRank * 2 : 0) +
      (occasionRank >= 0 ? 8 - occasionRank : 0) +
      (occasionPattern.test(name) ? 4 : 0) +
      (product.price > 0 ? 2 : 0);
  };
  const candidates = Object.fromEntries(
    Object.keys(categoryPatterns).map((category) => {
      const pricedProducts = products
        .filter((product) => categoryFor(product) === category && product.price > 0)
        .sort((a, b) => a.price - b.price);
      const lastIndex = pricedProducts.length - 1;
      const priceRangeIndexes = [0, Math.floor(lastIndex / 3), Math.floor((lastIndex * 2) / 3), lastIndex];
      const selectedProducts = [...new Set(priceRangeIndexes.map((index) => pricedProducts[index]).filter(Boolean))];

      return [
        category,
        selectedProducts.sort((a, b) => scoreProduct(b, category) - scoreProduct(a, category) || a.price - b.price),
      ];
    })
  ) as Record<string, ProductItem[]>;

  const availableCategories = preferredCategories.filter((category) => candidates[category].length > 0);
  if (availableCategories.length === 0) return [];

  const templates = [
    availableCategories.slice(0, 3),
    ...availableCategories.flatMap((category, index) =>
      availableCategories.slice(index + 1).map((other) => [category, other])
    ),
    ...availableCategories.map((category) => [category]),
  ].filter((template, index, all) =>
    template.length > 0 && all.findIndex((candidate) => candidate.join("|") === template.join("|")) === index
  );
  const mix = styleMixes[event?.selectedStyle ?? "classic"] ?? styleMixes.classic;
  const sauces = products
    .filter((product) => /sauce/.test(normalizeName(product.name)) && product.price > 0)
    .sort((a, b) => a.price - b.price);
  const sauce = sauces[0];
  const reasonFor = (category: string) => {
    const reasons: Record<string, string> = {
      wors: "A familiar South African braai staple that is easy to portion and share.",
      grill: "Adds a substantial grill cut for variety alongside the wors.",
      ribs: "A shareable, slow-grill favourite that makes the spread feel special.",
      potjie: "A hearty slow-cook centrepiece suited to a communal potjie meal.",
      marinated: "Pre-seasoned for convenient preparation and consistent flavour.",
    };
    return reasons[category] ?? "Chosen to complement the event menu.";
  };
  const servingNote = event?.selectedStyle === "potjie"
    ? "Serve with pap or samp, chakalaka and seasonal vegetables for a satisfying potjie table."
    : event?.selectedOccasion === "shisa-nyama"
      ? "Round out the shisa nyama spread with pap, chakalaka, atchar and fresh rolls."
      : event?.selectedOccasion === "game-day" || event?.selectedOccasion === "friends-get-together"
        ? "Add pap, chakalaka, a crunchy slaw and braai rolls for an easy crowd-style spread."
        : "Complete the braai with pap, chakalaka, tomato-onion relish, braai broodjies and a green salad.";

  const createRecommendations = (coverage: number) => {
    const recommendations: Array<RecommendedPackage & { score: number }> = [];
    const usedCombinations = new Set<string>();

    const getSelections = (template: string[]): ProductItem[][] =>
      template.reduce<ProductItem[][]>(
        (selections, category) => selections.flatMap((selection) =>
          candidates[category].map((product) => [...selection, product])
        ),
        [[]]
      );

    templates.forEach((template, templateIndex) => {
      const templateShare = template.reduce((sum, category) => sum + (mix[category] ?? 1), 0);

      getSelections(template).forEach((selected) => {
        const key = `${template.join(",")}:${selected.map((product) => product.id).join("|")}`;
        if (usedCombinations.has(key)) return;

        const meatDetails = selected.map((product) => {
          const category = categoryFor(product)!;
          const weightMatch = product.name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
          const parsedWeight = weightMatch
            ? Number(weightMatch[1].replace(",", ".")) * (weightMatch[2].toLowerCase() === "kg" ? 1000 : 1)
            : 0;
          const defaultPack = packDefaults[category];
          const packGrams = parsedWeight || (/bulk|family pack/i.test(product.name) ? 1000 : defaultPack.grams);
          const categoryShare = (mix[category] ?? 1) / templateShare;
          const requiredGrams = targetMeatGrams * coverage * categoryShare;
          const quantity = Math.max(1, Math.ceil(requiredGrams / (packGrams * defaultPack.edibleYield)));
          const cheaperAlternative = candidates[category]
            .filter((candidate) => candidate.id !== product.id && candidate.price < product.price)
            .sort((a, b) => a.price - b.price)[0];

          return {
            product,
            category,
            quantity,
            packGrams,
            edibleYield: defaultPack.edibleYield,
            why: reasonFor(category),
            alternative: cheaperAlternative
              ? `Budget swap: ${cheaperAlternative.name} saves about R${(product.price - cheaperAlternative.price).toFixed(2)} per pack.`
              : undefined,
          };
        });

        const meatPrice = meatDetails.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const meatWeight = meatDetails.reduce((sum, item) => sum + item.packGrams * item.edibleYield * item.quantity, 0);
        const serves = Math.min(totalPeople, Math.floor(meatWeight / (targetMeatGrams / totalPeople)));
        const fullyServesEvent = serves >= totalPeople;
        const productsInPackage: RecommendedProduct[] = meatDetails.map(({ product, quantity, why, alternative }) => ({
          name: product.name,
          image: product.image,
          quantity,
          why,
          alternative,
        }));
        let price = meatPrice;

        if (sauce) {
          const sauceQuantity = Math.max(1, Math.ceil(adultEquivalentGuests / 12));
          if (price + sauce.price * sauceQuantity <= budget) {
            productsInPackage.push({
              name: sauce.name,
              image: sauce.image,
              quantity: sauceQuantity,
              why: "A complementary Eskort sauce gives guests an easy serving option at the table.",
            });
            price += sauce.price * sauceQuantity;
          }
        }

        price = Number(price.toFixed(2));
        if (price > budget || usedCombinations.has(key)) return;
        usedCombinations.add(key);

        const productScore = meatDetails.reduce((sum, item) => sum + scoreProduct(item.product, item.category), 0);
        const budgetFit = 24 - Math.abs((price / budget) - 0.82) * 24;
        const coverageScore = Math.min(1, meatWeight / targetMeatGrams) * 50;
        const excessRatio = Math.max(0, meatWeight / targetMeatGrams - 1);
        const mixLabel = template.length === 1 ? "A focused, budget-led selection" : "A balanced mix of Eskort braai favourites";

        recommendations.push({
          id: `recommended-${templateIndex}-${selected.map((product) => product.id).join("-")}-${coverage}`,
          name: `${event?.selectedStyle === "potjie" ? "Potjie" : "Braai"} Feast`,
          tagline: fullyServesEvent
            ? `${mixLabel} portioned for ${totalPeople} guests.`
            : `Budget-led portions estimated for ${serves} of ${totalPeople} guests; increase the budget to cover everyone.`,
          price,
          serves,
          perPerson: Math.round(price / Math.max(1, serves)),
          badge: fullyServesEvent ? "Best match" : "Budget alternative",
          image: meatDetails[0].product.image,
          bgColor: "#1a2a1a",
          products: productsInPackage,
          servingNote,
          score: productScore + budgetFit + coverageScore - excessRatio * 35 + template.length * 5,
        });
      });
    });

    return recommendations;
  };

  let recommendations = createRecommendations(1);
  if (recommendations.length === 0) {
    for (let coverage = 0.9; coverage >= 0.15; coverage -= 0.05) {
      recommendations = createRecommendations(Number(coverage.toFixed(2)));
      if (recommendations.length > 0) break;
    }
  }

  const usedLeadProducts = new Set<string>();
  const usedPackageNames = new Set<string>();
  const packagePrefix = event?.selectedStyle === "potjie"
    ? "Potjie Gathering"
    : event?.selectedStyle === "shisa-nyama"
      ? "Shisa Nyama Spread"
      : event?.selectedStyle === "gas-braai"
        ? "Easy Gas Braai"
        : ({
            "family-braai": "Family Braai",
            "friends-get-together": "Friends' Braai",
            "game-day": "Game-Day Grill",
            birthday: "Birthday Braai",
            wedding: "Celebration Braai",
            corporate: "Team Braai",
          }[event?.selectedOccasion ?? "family-braai"] ?? "Classic Braai");
  const selectedRecommendations = recommendations
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .filter((recommendation) => {
      const leadProduct = normalizeName(recommendation.products[0]?.name ?? "");
      if (!leadProduct || usedLeadProducts.has(leadProduct)) return false;
      usedLeadProducts.add(leadProduct);
      return true;
    })
    .slice(0, 10);
  const sortedPrices = selectedRecommendations.map((recommendation) => recommendation.price).sort((a, b) => a - b);
  const lowPriceCutoff = sortedPrices[Math.floor((sortedPrices.length - 1) / 3)] ?? 0;
  const highPriceCutoff = sortedPrices[Math.ceil(((sortedPrices.length - 1) * 2) / 3)] ?? 0;

  return selectedRecommendations.map(({ score: _score, ...recommendation }, index) => {
      const leadProduct = recommendation.products[0]?.name ?? "Braai Selection";
      const leadLabel = leadProduct
        .replace(/\s*[|,].*$/, "")
        .replace(/^(?:eskort\s+|fresh\s+)/i, "")
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(" ");
      let packageName = `${packagePrefix}: ${leadLabel || "Host's Choice"}`;

      if (usedPackageNames.has(normalizeName(packageName))) {
        const secondProduct = recommendation.products[1]?.name
          .replace(/^(?:eskort\s+|fresh\s+)/i, "")
          .split(/\s+/)
          .slice(0, 3)
          .join(" ");
        packageName = `${packageName} with ${secondProduct || `Option ${index + 1}`}`;
      }

      while (usedPackageNames.has(normalizeName(packageName))) {
        packageName = `${packageName} Option ${index + 1}`;
      }
      usedPackageNames.add(normalizeName(packageName));

      return {
        ...recommendation,
        name: index === 0 ? `Top Pick - ${packageName}` : packageName,
        badge: index === 0 ? "Top match" : index < 3 ? "Great fit" : "Within budget",
        priceTier: lowPriceCutoff === highPriceCutoff
          ? "Balanced"
          : recommendation.price <= lowPriceCutoff
            ? "Value"
            : recommendation.price >= highPriceCutoff
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
  const [visibleCount, setVisibleCount] = useState(4);

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

    const loadProducts = async () => {
      const items = await getProductCatalog();
      if (isMounted) {
        setProducts(items);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const packages = useMemo(
    () => buildRecommendedPackages(products, eventDetails),
    [products, eventDetails]
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
      <div className="max-w-5xl mx-auto px-4 py-6">
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
          Portions target about 350 g of raw meat per adult-equivalent guest. Product prices are estimates because the price feed is not linked to individual product SKUs; serving suggestions are not included in the package total.
        </p>

        {products.length > 0 && packages.length === 0 ? (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            Even a smaller starter basket is above this budget using the current price estimates. Try increasing the budget, reducing the guest count, or building your own braai.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
            {visiblePackages.map((pkg) => (
            <div
              key={pkg.id}
              className="h-[430px] min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col"
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

              <div className="min-h-0 flex-1 p-3 flex flex-col">
                <h3 className="whitespace-normal font-bold text-sm text-[#1a1a1a] leading-snug break-words">
                  {pkg.name}
                </h3>
                <p className="whitespace-normal text-gray-500 text-[10px] mt-1 leading-snug break-words">{pkg.tagline}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className={`font-bold text-base ${pkg.priceTier === "Premium" ? "text-[#1a1a1a]" : pkg.priceTier === "Value" ? "text-green-700" : "text-[#d52027]"}`}>
                    R{pkg.price.toFixed(2)}
                    <span className={`ml-1.5 align-middle rounded px-1.5 py-0.5 text-[9px] uppercase ${pkg.priceTier === "Premium" ? "bg-[#1a1a1a] text-white" : pkg.priceTier === "Value" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {pkg.priceTier}
                    </span>
                  </div>
                  <span className="text-right text-gray-500 text-[10px]">
                    serves {pkg.serves}
                  </span>
                </div>

                <div className="mt-3 flex-1 min-h-0 flex items-center">
                  <p className="whitespace-normal text-xs leading-relaxed text-gray-600">
                    Includes {pkg.products.length} items. Open the package to see quantities, recommendations and serving ideas.
                  </p>
                </div>

                <div className="shrink-0 pt-2 flex items-center justify-between text-[10px] text-gray-500">
                  <span>R{pkg.perPerson}/person</span>
                  <span>{pkg.serves} guests</span>
                </div>

                <button
                  onClick={() => setDetailsPackageId(pkg.id)}
                  className="w-full mt-3 shrink-0 btn-red py-2.5 text-xs leading-tight"
                >
                  View Package
                </button>
              </div>
            </div>
            ))}
          </div>
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

        <button className="w-full border border-gray-400 rounded-lg py-3 text-sm font-semibold text-gray-600 hover:border-gray-600 transition-colors mb-3">
          ⚖️ View Fair Share Portion Preview
        </button>
      </div>
    </div>
  );
}
