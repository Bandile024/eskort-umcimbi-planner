"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
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
  quantity: number;
};

type RecommendedPackage = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  serves: number;
  perPerson: number;
  badge: string | null;
  image: string;
  bgColor: string;
  products: RecommendedProduct[];
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

  const guests = Math.max(1, (event?.guests ?? 8) + (event?.uninvited ?? 0) + Math.round((event?.kids ?? 0) * 0.6));
  const budget = event?.budget || 2500;
  // A credible meat-only braai needs at least R55 per adult-equivalent guest.
  if (budget < guests * 55) return [];

  const categoryPatterns: Record<string, RegExp> = {
    wors: /wors|sausage|sosatie|skilpad|bekkies/,
    ribs: /ribs?|spare/,
    grill: /steak|chops?|fillet|rump|loin|kassler/,
    potjie: /mince|goulash|stew|neck|belly|armadillo/,
    marinated: /marinated|prego|espetada|pulled pork/,
  };
  const servingsPerPack: Record<string, number> = { wors: 4, ribs: 3, grill: 3, potjie: 4, marinated: 3 };
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
  const preferredCategories = styleCategories[event?.selectedStyle ?? "classic"] ?? styleCategories.classic;
  const occasionPattern = occasionPatterns[event?.selectedOccasion ?? "family-braai"] ?? occasionPatterns["family-braai"];

  const categoryFor = (product: ProductItem) =>
    Object.keys(categoryPatterns).find((category) => categoryPatterns[category].test(normalizeName(product.name)));
  const scoreProduct = (product: ProductItem, category: string) => {
    const name = normalizeName(product.name);
    return (preferredCategories.includes(category) ? 8 : 0) + (occasionPattern.test(name) ? 5 : 0) + (product.price > 0 ? 2 : 0);
  };
  const candidates = Object.fromEntries(
    Object.keys(categoryPatterns).map((category) => [
      category,
      products
        .filter((product) => categoryFor(product) === category && product.price > 0)
        .sort((a, b) => scoreProduct(b, category) - scoreProduct(a, category) || a.price - b.price)
        .slice(0, 5),
    ])
  ) as Record<string, ProductItem[]>;

  const templates = preferredCategories.length === 3
    ? [preferredCategories, [preferredCategories[0], preferredCategories[1]], [preferredCategories[0], preferredCategories[2]], [preferredCategories[1], preferredCategories[2]]]
    : [];
  const recommendations: Array<RecommendedPackage & { score: number }> = [];
  const usedCombinations = new Set<string>();

  templates.forEach((template, templateIndex) => {
    for (let variation = 0; variation < 5; variation += 1) {
      const selected = template.map((category) => candidates[category][variation % candidates[category].length]).filter(Boolean);
      if (selected.length !== template.length) continue;

      const key = selected.map((product) => product.id).sort().join("|");
      if (usedCombinations.has(key)) continue;

      const portions = template.length === 3 ? [0.42, 0.35, 0.23] : [0.6, 0.4];
      const productDetails = selected.map((product, index) => {
        const category = categoryFor(product)!;
        return { product, quantity: Math.ceil((guests * portions[index]) / servingsPerPack[category]) };
      });
      const price = Number(productDetails.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toFixed(2));
      if (price > budget) continue;

      usedCombinations.add(key);
      const matchScore = productDetails.reduce((sum, item) => sum + scoreProduct(item.product, categoryFor(item.product)!), 0);
      const budgetFit = 20 - Math.abs(price / budget - 0.8) * 20;
      recommendations.push({
        id: `recommended-${templateIndex}-${variation}-${selected[0].id}`,
        name: `${event?.selectedStyle === "potjie" ? "Potjie" : "Braai"} Feast`,
        tagline: `${template.length === 3 ? "A balanced variety" : "A focused, budget-conscious mix"} for ${guests} guests`,
        price,
        serves: guests,
        perPerson: Math.round(price / guests),
        badge: "Best match",
        image: selected[0].image,
        bgColor: "#1a2a1a",
        products: productDetails.map(({ product, quantity }) => ({ name: product.name, quantity })),
        score: matchScore + budgetFit,
      });
    }
  });

  return recommendations
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, 10)
    .map(({ score: _score, ...recommendation }, index) => ({
      ...recommendation,
      name: index === 0 ? `${recommendation.name} — Top Pick` : recommendation.name,
      badge: index === 0 ? "Top match" : index < 3 ? "Great fit" : "Within budget",
    }));
};

export default function RecommendedPackagesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
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

  const visiblePackages = packages.slice(0, visibleCount);
  const hasMorePackages = visibleCount < packages.length;

  const totalGuests = eventDetails
    ? Math.max(1, eventDetails.guests + eventDetails.uninvited + Math.round(eventDetails.kids * 0.6))
    : 8;
  const displayedGuestCount = eventDetails ? Math.max(1, eventDetails.guests) : 8;

  const budget = eventDetails?.budget || 2500;
  const cart = packages.length > 0
    ? packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length
    : 0;

  const handleStart = (pkgId: string) => {
    const selectedPackage = packages.find((pkg) => pkg.id === pkgId);
    if (!selectedPackage) {
      return;
    }

    setSelected(pkgId);

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
    setSelected(null);
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

        {products.length > 0 && packages.length === 0 ? (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            This budget is not enough to provide a realistic meat selection for {totalGuests} guests. Increase it to at least R{Math.ceil(totalGuests * 55).toLocaleString()} to see recommendations, or build your own braai.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
            {visiblePackages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm min-w-0 flex flex-col"
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

              <div className="p-3 flex flex-1 flex-col">
                <h3 className="font-bold text-sm text-[#1a1a1a] leading-tight break-words">
                  {pkg.name}
                </h3>
                <p className="text-gray-500 text-[10px] mt-1 break-words">{pkg.tagline}</p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[#d52027] font-bold text-base">R{pkg.price}</div>
                  <span className="text-gray-500 text-[10px] whitespace-nowrap">
                    serves {pkg.serves}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {pkg.products.map((product) => (
                    <div key={`${pkg.id}-${product.name}`} className="text-[11px] text-gray-700 flex items-center justify-between gap-2 break-words">
                      <span className="min-w-0 flex-1">• {product.name}</span>
                      <span className="text-[#d52027] font-semibold shrink-0">x{product.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-gray-500">
                  <span>R{pkg.perPerson}/person</span>
                  <span>{pkg.serves} guests</span>
                </div>

                <button
                  onClick={() => handleStart(pkg.id)}
                  className="w-full mt-3 btn-red py-2.5 text-xs leading-tight"
                >
                  {selected === pkg.id ? "Selected" : "Start With This Basket"}
                </button>
              </div>
            </div>
            ))}
          </div>
        )}

        {hasMorePackages && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => Math.min(current + 4, packages.length))}
            className="w-full bg-[#d52027] text-white font-bold text-sm uppercase tracking-wide rounded-xl py-3 hover:opacity-90 transition-opacity mb-4"
          >
            SEE MORE
          </button>
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
            My Rewards
          </button>
        </div>

        <button className="w-full border border-gray-400 rounded-lg py-3 text-sm font-semibold text-gray-600 hover:border-gray-600 transition-colors mb-3">
          ⚖️ View Fair Share Portion Preview
        </button>
      </div>
    </div>
  );
}
