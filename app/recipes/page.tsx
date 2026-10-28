"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock3 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [videoReady, setVideoReady] = useState(false);

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

  return (
    <div className="min-h-screen bg-eskort-cream-light text-eskort-black">
      <section className="px-4 pb-14 pt-8 sm:px-6 md:pb-20 md:pt-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative mx-auto flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-gray-700 bg-[#1f1f1f] px-4 text-center shadow-card md:w-1/2">
            <video
              className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
              src="/videos/recipes.hero.mp4"
              controls
              muted
              loop
              playsInline
              preload="auto"
              aria-label="Recipes hero video"
              onLoadedMetadata={() => setVideoReady(true)}
              onError={() => setVideoReady(false)}
            />
            {!videoReady && (
              <p className="pointer-events-none text-sm text-gray-300 sm:text-base">
                No video currently
              </p>
            )}
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
              onClick={() => setActiveFilter(filter.id)}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRecipes.map((recipe) => (
              <article
                key={recipe.id}
                className="product-card flex h-full flex-col border border-gray-800"
              >
                <div className="relative block aspect-[4/3] overflow-hidden bg-eskort-dark-card-2">
                  <Image
                    src={recipe.image}
                    alt={recipe.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white">
                    <Clock3 size={13} aria-hidden="true" />
                    {recipe.timeCard}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="mb-5 flex-1 text-base font-bold leading-snug text-white">
                    {recipe.name}
                  </h3>
                  <button
                    type="button"
                    className="flex w-[65%] self-start items-center justify-between rounded-full border border-white px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-eskort-black"
                  >
                    {recipe.button}
                    <ChevronRight size={18} strokeWidth={3} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
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
