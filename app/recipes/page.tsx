"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

type Recipe = {
  id: string;
  name: string;
  timeCard: string;
  timeMinutes: number;
  button: string;
  image: string;
};

type TimeFilter = "all" | "under-30" | "30-45" | "over-45";

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "All recipes" },
  { id: "under-30", label: "Under 30 min" },
  { id: "30-45", label: "30–45 min" },
  { id: "over-45", label: "Over 45 min" },
];

const featuredIngredients = [
  "200 g Eskort Rindless Streaky Bacon",
  "500 ml (2 C) bread flour",
  "375 ml (1 ½ C) craft beer or cider",
  "45 ml (3 T) pineapple chutney",
  "250 ml (1 C) mozzarella cheese",
];

const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(value.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length > 0) {
    row.push(value.trim());
    rows.push(row);
  }

  const headers = rows.shift()?.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header
  );

  if (!headers) {
    return [];
  }

  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
};

const toRecipes = (csv: string): Recipe[] =>
  parseCsv(csv)
    .map((row, index) => {
      const timeMinutes = Number.parseInt(row.time ?? "", 10);
      const name = row.recipe_name?.trim() ?? "";
      const image = row.image?.trim() ?? "";

      if (!name || !image || !Number.isFinite(timeMinutes)) {
        return null;
      }

      return {
        id: row.web_scraper_order || `${index}-${name}`,
        name,
        timeCard: row.time_card?.trim() || `${timeMinutes} min`,
        timeMinutes,
        button: row.button?.trim() || "View Recipe",
        image,
      };
    })
    .filter((recipe): recipe is Recipe => recipe !== null);

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadRecipes = async () => {
      try {
        const response = await fetch("/data/recipes_data_true.csv", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Could not load recipes (${response.status}).`);
        }

        const csv = await response.text();
        setRecipes(toRecipes(csv));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Could not load recipes."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadRecipes();
    return () => controller.abort();
  }, []);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        if (activeFilter === "under-30") return recipe.timeMinutes < 30;
        if (activeFilter === "30-45") {
          return recipe.timeMinutes >= 30 && recipe.timeMinutes <= 45;
        }
        if (activeFilter === "over-45") return recipe.timeMinutes > 45;
        return true;
      }),
    [activeFilter, recipes]
  );
  const recipesPerPage = 3;
  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / recipesPerPage));
  const visibleRecipes = filteredRecipes.slice(
    (currentPage - 1) * recipesPerPage,
    currentPage * recipesPerPage
  );
  const featuredRecipe = recipes[0];
  const featuredTitleWords = featuredRecipe?.name.split(" ") ?? [];

  return (
    <div className="min-h-screen bg-eskort-cream-light text-eskort-black">
      <section className="px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {featuredRecipe && (
            <div className="min-w-0">
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="pt-2 text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Recipe:
                </p>
                <h1 className="font-display text-4xl leading-[1.05] tracking-wide sm:text-5xl">
                  <span className="block">
                    {featuredTitleWords.slice(0, 2).join(" ")}
                  </span>
                  <span className="text-eskort-red">
                    {featuredTitleWords[2] ?? ""}
                  </span>
                  {featuredTitleWords.length > 3 && (
                    <> {featuredTitleWords.slice(3).join(" ")}</>
                  )}
                </h1>
              </div>

              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="pt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Description:
                </p>
                <p className="text-sm leading-relaxed">
                  Sweet pineapple chutney and bubbling mozzarella on a quick
                  beer-or-cider dough, finished with crispy Eskort streaky bacon.
                </p>
              </div>

              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="pt-0.5 text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Ingredients:
                </p>
                <div>
                  <ul className="space-y-2 text-sm leading-relaxed">
                    {featuredIngredients.map((ingredient) => (
                      <li key={ingredient} className="relative pl-3.5 before:absolute before:left-0 before:text-eskort-red before:content-['•']">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed text-gray-600">
                    Pantry: salt to taste, 30 ml (2 T) olive oil
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Prep time:
                </p>
                <p className="text-sm">15 min</p>
              </div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Cook time:
                </p>
                <p className="text-sm">{featuredRecipe.timeMinutes - 15} min</p>
              </div>
              <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-eskort-black/15 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-eskort-red">
                  Serves:
                </p>
                <p className="text-sm">4–6</p>
              </div>

              <button
                type="button"
                className="mt-6 rounded-full border-2 border-eskort-black px-7 py-3 text-sm font-bold uppercase tracking-wide text-eskort-black transition-colors hover:bg-eskort-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eskort-red lg:absolute lg:left-0 lg:top-full"
              >
                Add to my braai plan
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4 lg:h-full">
            <ChevronLeft
              size={42}
              strokeWidth={3}
              aria-hidden="true"
              className="shrink-0 cursor-pointer text-eskort-black transition duration-200 hover:scale-125 hover:text-eskort-red"
            />
            <div className="relative aspect-video min-w-0 flex-1 overflow-hidden rounded-card border border-gray-700 bg-[#1f1f1f] text-center shadow-card lg:aspect-auto lg:self-stretch">
            <video
              className="absolute inset-0 h-full w-full object-contain"
              controls
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Recipes hero video"
            >
              <source src="/videos/recipes.hero.mp4" type="video/mp4" />
            </video>
            </div>
            <ChevronRight
              size={42}
              strokeWidth={3}
              aria-hidden="true"
              className="shrink-0 cursor-pointer text-eskort-black transition duration-200 hover:scale-125 hover:text-eskort-red"
            />
          </div>
        </div>
      </section>

      <section
        id="all-recipes"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 md:pb-20"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="step-indicator">Flavour loaded</p>
            <h2 className="section-title text-eskort-black">All Recipes</h2>
          </div>
          <p className="text-sm text-gray-600">
            {loading ? "Loading recipes…" : `${recipes.length} recipes`}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2" aria-label="Filter recipes">
          {timeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setActiveFilter(filter.id);
                setCurrentPage(1);
              }}
              aria-pressed={activeFilter === filter.id}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                activeFilter === filter.id
                  ? "border-eskort-yellow bg-eskort-yellow text-eskort-black"
                  : "border-gray-300 bg-white text-gray-700 hover:border-eskort-red/60 hover:text-eskort-black"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loadError ? (
          <p role="alert" className="rounded-card border border-red-800 bg-red-950/40 p-5 text-sm text-red-200">
            {loadError}
          </p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-gray-600" role="status">
            Loading recipes…
          </p>
        ) : filteredRecipes.length > 0 ? (
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-[12%_minmax(0,1fr)_12%] items-center gap-1 sm:grid-cols-[15%_minmax(0,1fr)_15%] sm:gap-3">
              <button
                type="button"
                aria-label="Previous recipe page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="justify-self-center disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft
                  size={42}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="shrink-0 cursor-pointer text-eskort-black transition duration-200 hover:scale-125 hover:text-eskort-red"
                />
              </button>

              <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
                {visibleRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="product-card flex h-full min-w-0 flex-col border border-gray-800"
                  >
                    <div className="relative block aspect-[16/10] overflow-hidden bg-eskort-dark-card-2">
                      <Image
                        src={recipe.image}
                        alt={recipe.name}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 28vw, 25vw"
                        className="object-cover"
                      />
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
                        <Clock3 size={11} aria-hidden="true" />
                        {recipe.timeCard}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="mb-3 flex-1 text-sm font-bold leading-snug text-white">
                        {recipe.name}
                      </h3>
                      <button
                        type="button"
                        className="flex w-[65%] self-start items-center justify-between rounded-full border border-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-eskort-black"
                      >
                        {recipe.button}
                        <ChevronRight size={15} strokeWidth={3} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                aria-label="Next recipe page"
                disabled={currentPage === pageCount}
                onClick={() =>
                  setCurrentPage((page) => Math.min(pageCount, page + 1))
                }
                className="justify-self-center disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight
                  size={42}
                  strokeWidth={3}
                  aria-hidden="true"
                  className="shrink-0 cursor-pointer text-eskort-black transition duration-200 hover:scale-125 hover:text-eskort-red"
                />
              </button>
            </div>

            <nav
              aria-label="Recipe pages"
              className="mt-7 flex justify-center gap-2"
            >
              {Array.from({ length: pageCount }, (_, index) => {
                const page = index + 1;
                const isActive = currentPage === page;

                return (
                  <button
                    key={page}
                    type="button"
                    aria-label={`Go to recipe page ${page}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-eskort-red bg-eskort-red text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-eskort-red hover:text-eskort-red"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-gray-600">
            No recipes match this time range.
          </p>
        )}
      </section>

      <section className="bg-gradient-to-r from-eskort-red to-orange-600 px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="font-display text-sm tracking-[0.3em] text-eskort-yellow-light">
            FLAVOUR LOADED
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-wide text-white sm:text-5xl">
            READY TO PLAN YOUR BRAAI?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
            Tell us your event details and we&apos;ll build your Eskort shopping
            list.
          </p>
          <Link
            href="/event-details"
            className="mt-6 inline-flex rounded-full bg-eskort-black px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-black"
          >
            Let&apos;s Plan Your Braai →
          </Link>
        </div>
      </section>
    </div>
  );
}
