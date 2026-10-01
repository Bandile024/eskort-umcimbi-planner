"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import QuantityControl from "@/components/QuantityControl";

type Tab = "Main Meat" | "Essentials" | "Extras";

type RecipeProduct = {
  id: string;
  name: string;
  category: string;
  image: string;
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

const buildRecipeProducts = async (): Promise<RecipeProduct[]> => {
  const recipeFiles = ["/data/eskort-recipes-1.csv", "/data/eskort-recipes-2.csv"];

  const recipeResults = await Promise.all(
    recipeFiles.map(async (filePath) => {
      const rows = await readCsvRecords(filePath);

      return rows
        .map((row) => {
          const name = row.caption || row.data || row.name || row["Recipe Name"] || "";
          const image = row.image || row.url || row["image url"] || row["Image URL"] || "";

          return name && image
            ? {
                id: `${filePath}-${name}`,
                name,
                category: "RECIPES",
                image,
              }
            : null;
        })
        .filter((item): item is RecipeProduct => Boolean(item));
    })
  );

  const recipes = recipeResults.flat();

  const uniqueByName = new Map<string, RecipeProduct>();

  recipes.forEach((recipe) => {
    if (!uniqueByName.has(recipe.name)) {
      uniqueByName.set(recipe.name, recipe);
    }
  });

  return Array.from(uniqueByName.values());
};

type ProductItem = {
  id: string;
  name: string;
  image: string;
  price: number;
};

type CartItem = ProductItem & {
  quantity: number;
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

const buildProductItems = async (tab: Tab): Promise<ProductItem[]> => {
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

  const uniqueNames = new Set<string>();

  return rows
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

export default function BuildMyBraaiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Main Meat");
  const [promoProducts, setPromoProducts] = useState<RecipeProduct[]>([]);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [promoIndex, setPromoIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [cartItems, setCartItems] = useState<Record<string, CartItem>>({});
  const [cartHydrated, setCartHydrated] = useState(false);

  // Sync with localStorage cart on mount
  useEffect(() => {
    const saved = localStorage.getItem("eskort-checkout-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { products?: CartItem[] };
        const cartMap: Record<string, CartItem> = {};
        parsed.products?.forEach((item) => {
          cartMap[item.id] = item;
        });
        setCartItems(cartMap);
      } catch {
        // ignore
      }
    }
    setCartHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!cartHydrated) return;
    const cartArray = Object.values(cartItems);
    if (cartArray.length > 0) {
      const subtotal = cartArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
      localStorage.setItem("eskort-checkout-cart", JSON.stringify({ products: cartArray, subtotal }));
    } else {
      localStorage.removeItem("eskort-checkout-cart");
    }
  }, [cartItems, cartHydrated]);

  useEffect(() => {
    const packageId = new URLSearchParams(window.location.search).get("package");

    if (!packageId) {
      localStorage.removeItem("eskort-selected-package");
      return;
    }

    const packageSelection = localStorage.getItem("eskort-selected-package");
    if (!packageSelection) {
      return;
    }

    try {
      const parsed = JSON.parse(packageSelection) as {
        packageId?: string;
        total?: number;
        products?: Array<{ id: string; name: string; image: string; price: number; quantity?: number }>;
      };

      const validProducts = (parsed.products ?? []).filter((product) => product && product.name && (product.quantity ?? 0) > 0);

      if (validProducts.length === 0) {
        localStorage.removeItem("eskort-selected-package");
        return;
      }

      setCartItems(
        validProducts.reduce<Record<string, CartItem>>((cart, product) => {
          const quantity = product.quantity ?? 1;
          const existingItem = cart[product.id];

          cart[product.id] = {
            ...product,
            quantity: (existingItem?.quantity ?? 0) + quantity,
          };

          return cart;
        }, {})
      );
    } catch {
      localStorage.removeItem("eskort-selected-package");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRecipes = async () => {
      const recipes = await buildRecipeProducts();
      if (isMounted) {
        setPromoProducts(recipes);
      }
    };

    const loadProducts = async () => {
      const products = await buildProductItems(activeTab);
      if (isMounted) {
        setProductItems(products);
      }
    };

    loadRecipes();
    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!isAutoPlaying || promoProducts.length <= 1) {
      return undefined;
    }

    const autoRotate = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % promoProducts.length);
    }, 4000);

    return () => window.clearInterval(autoRotate);
  }, [isAutoPlaying, promoProducts.length]);

  useEffect(() => {
    setPromoIndex((current) => Math.min(current, Math.max(promoProducts.length - 1, 0)));
  }, [promoProducts.length]);

  const tabs: Tab[] = ["Main Meat", "Essentials", "Extras"];

  const visibleProducts = productItems.slice(0, 4);
  const selectedProducts = Object.values(cartItems);
  const itemCount = selectedProducts.reduce((sum, product) => sum + product.quantity, 0);
  const subtotal = selectedProducts.reduce((sum, product) => sum + product.quantity * product.price, 0);

  const updateCartQuantity = (product: ProductItem, quantity: number) => {
    setCartItems((previous) => {
      if (quantity <= 0) {
        const { [product.id]: _removed, ...remainingItems } = previous;
        return remainingItems;
      }

      return {
        ...previous,
        [product.id]: { ...product, quantity },
      };
    });
  };

  const prevPromo = () =>
    setPromoIndex((current) => (promoProducts.length === 0 ? 0 : (current - 1 + promoProducts.length) % promoProducts.length));
  const nextPromo = () =>
    setPromoIndex((current) => (promoProducts.length === 0 ? 0 : (current + 1) % promoProducts.length));

  return (
    <div className="min-h-screen bg-eskort-cream-light">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/recommended-packages"
          className="inline-flex items-center gap-1 text-eskort-red text-sm font-semibold mb-4 hover:opacity-80"
        >
          <ChevronLeft size={16} />
          Back
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-none tracking-wide">
              <span className="text-blue-700">BUILD MY</span>
              <br />
              <span className="text-eskort-yellow">OWN BRAAI</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">Pick your meats &amp; proteins</p>
          </div>
          <div className="bg-eskort-red text-white font-bold text-sm px-4 py-2 rounded-lg uppercase tracking-wide">
            PROMOS (ON SALE)
          </div>
        </div>

        <div
          className="relative mb-8"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${promoIndex * 100}%)` }}
            >
              {promoProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="min-w-full bg-eskort-dark-card rounded-xl overflow-hidden relative"
                  style={{ minHeight: "240px" }}
                >
                  <div className="w-full px-8 py-2 bg-[#1f1f1f]">
                    <div className="mx-auto w-[68%] h-64 overflow-hidden rounded-md bg-[#1f1f1f]">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="block w-full h-full object-cover object-center bg-[#1f1f1f]"
                        style={{
                          display: "block",
                          filter: "saturate(1.08) contrast(1.05) brightness(1.02)",
                          transform: "scale(1.06)",
                          objectPosition: "center center",
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-eskort-yellow text-xs font-semibold uppercase tracking-widest">
                      {prod.category}
                    </p>
                    <h3 className="text-white font-bold text-base mt-0.5">{prod.name}</h3>
                    <button className="mt-4 w-full bg-[#d52027] text-white font-bold text-lg rounded-xl py-3 uppercase tracking-wide hover:opacity-90 transition-opacity">
                      READ MORE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={prevPromo}
            disabled={promoIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={nextPromo}
            disabled={promoIndex >= promoProducts.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>

          <div className="flex justify-center gap-2 mt-3">
            {promoProducts.map((_, index) => (
              <div
                key={`${_}-dot-${index}`}
                className={`carousel-dot ${promoIndex === index ? "carousel-dot-active" : ""}`}
              />
            ))}
          </div>
        </div>

        <div className="flex border-b border-gray-300 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors relative ${
                activeTab === tab
                  ? "text-eskort-black border-b-2 border-eskort-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 mb-8">
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {productItems.length === 0 ? (
                  <div className="md:col-span-2 rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center text-gray-500">
                    {activeTab === "Essentials" ? "Essentials products coming soon..." : "Loading products..."}
                  </div>
                ) : (
                  visibleProducts.map((product) => {
                    const quantity = cartItems[product.id]?.quantity ?? 0;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                      >
                        <div className="h-36 overflow-hidden bg-gray-100">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="p-3">
                          <h4 className="min-h-[48px] text-base font-bold text-eskort-black leading-tight">
                            {product.name}
                          </h4>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-eskort-red text-lg font-bold">R{product.price.toFixed(2)}</div>
                            <QuantityControl
                              value={quantity}
                              onChange={(value) => updateCartQuantity(product, value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push(`/build-my-braai/products?tab=${encodeURIComponent(activeTab)}`)}
                className="mt-5 w-full bg-eskort-red text-white font-bold text-sm uppercase tracking-wide rounded-xl py-3 hover:opacity-90 transition-opacity"
              >
                SEE MORE
              </button>
            </div>

            <aside className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-fit sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-eskort-black">Your Order</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{itemCount} items</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCartItems({});
                      localStorage.removeItem("eskort-checkout-cart");
                      localStorage.removeItem("eskort-selected-package");
                    }}
                    disabled={selectedProducts.length === 0}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Clear order"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No items selected yet.
                  </div>
                ) : (
                  selectedProducts.map((product) => {
                    const quantity = product.quantity;

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
                          <p className="truncate text-sm font-semibold text-eskort-black">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(product, quantity - 1)
                              }
                              className="h-6 w-6 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              −
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-semibold text-eskort-black">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(product, quantity + 1)
                              }
                              className="h-6 w-6 rounded-full border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-eskort-black">R{(quantity * product.price).toFixed(2)}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-eskort-black">R{subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-base font-bold text-eskort-black">
                  <span>Total</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => router.push("/basket-summary")}
                  className="w-full btn-primary mt-4 py-2.5"
                >
                  Add Essentials →
                </button>
                <button
                  onClick={() => {
                    if (selectedProducts.length === 0) return;
                    const cartPayload = {
                      products: Object.values(cartItems).map((item) => ({
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        price: item.price,
                        quantity: item.quantity,
                      })),
                      subtotal: subtotal,
                    };
                    localStorage.setItem("eskort-checkout-cart", JSON.stringify(cartPayload));
                    router.push("/checkout");
                  }}
                  disabled={selectedProducts.length === 0}
                  className={`w-full mt-2 py-2.5 text-base font-bold tracking-widest rounded-lg transition-colors ${
                    selectedProducts.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "btn-primary"
                  }`}
                >
                  Skip to Checkout →
                </button>
              </div>
            </aside>
        </div>
      </div>
    </div>
  );
}
