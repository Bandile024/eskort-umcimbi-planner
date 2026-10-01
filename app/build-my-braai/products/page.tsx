"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import QuantityControl from "@/components/QuantityControl";

type CatalogProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  badge?: string;
  serves?: string;
  unit?: string;
};

type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
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

const normalizeProductName = (name: string): string =>
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
  const normalizedName = normalizeProductName(name);
  const keywordBuckets: Array<[RegExp, number[]]> = [
    [/wors|sosatie|sausages|lekker|bekkies|skilpadjies/, [12, 60]],
    [/ribs|rib/, [30, 180]],
    [/steak|chops|loin|rump|fillet|minute|kassler|gammon|silverside|trotter|belly/, [25, 220]],
    [/mince|goulash|stew|neck|armadillo|pork|beef/, [15, 180]],
    [/sauce|mayo|mustard|tomato|chillinaise|secret|burger|prego/, [5, 35]],
    [/eisbein|rashers|shank|bacon|cheese|chilli|honey|creamy|marinated/, [10, 140]],
  ];

  const selectedBucket = keywordBuckets.find(([pattern]) => pattern.test(normalizedName));

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

const buildCatalogProducts = async (tab: string): Promise<CatalogProduct[]> => {
  if (tab === "Essentials") {
    return [];
  }

  const dataFiles =
    tab === "Extras"
      ? ["/data/eskort-extras-1.csv", "/data/eskort-extras-2.csv"]
      : ["/data/eskort-products.csv"];

  const fileResults = await Promise.all(dataFiles.map((filePath) => readCsvRecords(filePath)));
  const priceRows = await readCsvRecords("/data/eskort-prices.csv");
  const knownPrices = priceRows
    .map((row) => parsePriceValue(row["PriceIncVat"] || row["price"] || row["Price"] || ""))
    .filter((price): price is number => price !== null);
  const rows = fileResults.flat();
  const catalogProducts: CatalogProduct[] = [];
  const uniqueProductNames = new Set<string>();

  rows.forEach((row, index) => {
    const name = row.data || row.name || row["Product Name"] || "";
    const image = row.image || row["Image URL"] || row["image url"] || "";

    if (!name || !image || uniqueProductNames.has(name)) {
      return;
    }

    uniqueProductNames.add(name);

    const isPack = /pack|bundle|combo/i.test(name);

    catalogProducts.push({
      id: `${row.web_scraper_order || index}-${name}`,
      name,
      image,
      price: estimateProductPrice(name, knownPrices),
      badge: isPack ? "SPECIAL" : undefined,
      serves: "Serves 3-4",
      unit: isPack ? "pack" : "kg",
    });
  });

  return catalogProducts;
};

export default function BraaiProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading products...</div>}>
      <BraaiProductsPageContent />
    </Suspense>
  );
}

function BraaiProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = ["Main Meat", "Essentials", "Extras"];

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [activeTab, setActiveTab] = useState("Main Meat");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(10);

  // Sync quantities with localStorage cart
  useEffect(() => {
    const saved = localStorage.getItem("eskort-checkout-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { products?: CartItem[] };
        const cartMap: Record<string, number> = {};
        parsed.products?.forEach((item) => {
          cartMap[item.id] = item.quantity;
        });
        setQuantities(cartMap);
      } catch {
        // ignore
      }
    }
  }, []);

  const saveCart = (newQuantities: Record<string, number>) => {
    const cartItems = products
      .filter((p) => (newQuantities[p.id] ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
        quantity: newQuantities[p.id] ?? 0,
      }));
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    localStorage.setItem("eskort-checkout-cart", JSON.stringify({ products: cartItems, subtotal }));
  };

  const validTab = useMemo(() => {
    const tabFromUrl = searchParams.get("tab");
    return tabs.includes(tabFromUrl ?? "") ? (tabFromUrl as string) : "Main Meat";
  }, [searchParams]);

  useEffect(() => {
    setActiveTab(validTab);
  }, [validTab]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      const items = await buildCatalogProducts(activeTab);
      if (isMounted) {
        setProducts(items);
        // Initialize quantities for new products, preserving existing ones
        setQuantities((prev) =>
          Object.fromEntries(items.map((product) => [product.id, prev[product.id] ?? 0]))
        );
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const selectedProducts = products.filter((product) => (quantities[product.id] ?? 0) > 0);
  const subtotal = selectedProducts.reduce((sum, product) => sum + (quantities[product.id] ?? 0) * product.price, 0);

  const updateQuantity = (productId: string, nextValue: number) => {
    const updated = { ...quantities, [productId]: nextValue };
    saveCart(updated);
    setQuantities(updated);
  };

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  return (
    <div className="min-h-screen bg-[#f4f3f1] text-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          href="/build-my-braai"
          className="inline-flex items-center gap-1 text-[#d52027] text-sm font-semibold mb-4 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-widest">SHOP</p>
            <h1 className="font-display text-4xl md:text-6xl leading-none tracking-wide text-[#1a1a1a]">
              Grill, Gather, Enjoy
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Get everything you need for the perfect braai. Fresh cuts, tasty extras and great deals.
            </p>
          </div>
        </div>

        <div className="flex border border-gray-300 rounded-xl overflow-hidden mb-6 bg-white/70">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => router.push(`/build-my-braai/products?tab=${encodeURIComponent(tab)}`)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[#d52027] text-white"
                  : "bg-transparent text-[#1a1a1a]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Essentials" ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            {activeTab} products coming soon...
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
              {products.length === 0 ? (
                <div className="sm:col-span-2 md:col-span-3 xl:col-span-5 rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center text-gray-500">
                  Loading products...
                </div>
              ) : (
                visibleProducts.map((product) => {
                  const quantity = quantities[product.id] ?? 0;

                  return (
                    <div
                      key={product.id}
                      className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm min-w-0"
                    >
                      <div className="relative h-48 bg-gray-200">
                        {product.badge && (
                          <div className="absolute left-3 top-3 bg-[#d52027] text-white text-[10px] font-bold rounded px-2 py-1 uppercase tracking-wide">
                            {product.badge}
                          </div>
                        )}
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-base text-[#1a1a1a] leading-tight min-h-[52px] break-words">{product.name}</h3>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="text-[#d52027] font-bold text-lg">R{product.price.toFixed(2)}</div>
                          <QuantityControl
                            value={quantity}
                            onChange={(nextValue) => updateQuantity(product.id, nextValue)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 10)}
                className="mt-5 w-full bg-[#d52027] text-white font-bold text-sm uppercase tracking-wide rounded-xl py-3 hover:opacity-90 transition-opacity"
              >
                See More
              </button>
            )}

            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-[#1a1a1a]">Your Order</h3>
                <span className="text-sm text-gray-500">
                  {selectedProducts.reduce((sum, product) => sum + (quantities[product.id] ?? 0), 0)} items
                </span>
              </div>

              <div className="space-y-3">
                {selectedProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No items selected yet.
                  </div>
                ) : (
                  selectedProducts.map((product) => {
                    const quantity = quantities[product.id] ?? 0;

                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1a1a1a]">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="h-6 w-6 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              −
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-semibold text-[#1a1a1a]">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="h-6 w-6 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-[#1a1a1a]">R{(quantity * product.price).toFixed(2)}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#1a1a1a]">R{subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-base font-bold text-[#1a1a1a]">
                  <span>Total</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/build-my-braai/products?tab=${encodeURIComponent("Essentials")}`)}
                  className="w-full btn-primary mt-4 py-2.5"
                >
                  Add Essentials →
                </button>
                <button
                  onClick={() => {
                    if (selectedProducts.length === 0) return;
                    router.push("/checkout");
                  }}
                  disabled={selectedProducts.length === 0}
                  className={`w-full mt-4 py-2.5 text-base font-bold tracking-widest rounded-lg transition-colors ${
                    selectedProducts.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "btn-primary"
                  }`}
                >
                  Skip to Checkout →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
