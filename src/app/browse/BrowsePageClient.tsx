"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { slugify } from "@/lib/slug";

type ListingType =
  | "team_blueprint"
  | "agent_blueprint"
  | "skill"
  | "governance_template";

interface ListingItem {
  id: string;
  slug: string;
  type: ListingType;
  title: string;
  tagline: string | null;
  price: number;
  creatorName: string | null;
  categories: string[];
  agentCount: number | null;
  installCount: number;
  rating: number | string | null;
  reviewCount: number;
}

interface ListingsResponse {
  data: ListingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All types", value: "" },
  { label: "Team blueprints", value: "team_blueprint" },
  { label: "Agent blueprints", value: "agent_blueprint" },
  { label: "Skills", value: "skill" },
  { label: "Governance templates", value: "governance_template" },
];

const CATEGORY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All categories", value: "" },
  { label: "SaaS", value: "saas" },
  { label: "Engineering", value: "engineering" },
  { label: "Marketing", value: "marketing" },
  { label: "Operations", value: "ops" },
  { label: "Content", value: "content" },
  { label: "Finance", value: "finance" },
];

const SORT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Most popular", value: "popular" },
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price_asc" },
  { label: "Price: high to low", value: "price_desc" },
  { label: "Highest rated", value: "rating" },
];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function listingTypeLabel(type: ListingType): string {
  return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseRating(rating: number | string | null): number | null {
  if (typeof rating === "number" && Number.isFinite(rating)) {
    return rating;
  }

  if (typeof rating === "string") {
    const parsed = Number.parseFloat(rating);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatRating(rating: number | null): string {
  if (rating === null) {
    return "No ratings";
  }

  return `${rating.toFixed(1)} / 5`;
}

function centsToDollarInput(centsValue: string | null): string {
  if (!centsValue) {
    return "";
  }

  const cents = Number.parseInt(centsValue, 10);
  if (!Number.isFinite(cents)) {
    return "";
  }

  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
}

function OrgChartPreview({ agentCount }: { agentCount: number | null }) {
  const count = Math.max(2, Math.min(agentCount ?? 3, 5));
  const leaves = Math.max(2, count - 1);

  return (
    <div className="relative h-24 rounded-xl border border-stone-300 bg-gradient-to-b from-stone-100 to-amber-50 px-4 py-3">
      <div className="mx-auto flex h-full w-full max-w-44 flex-col justify-between">
        <div className="mx-auto h-6 w-16 rounded-full border border-stone-400 bg-stone-900 text-center text-[10px] font-semibold leading-6 text-stone-100">
          Lead
        </div>
        <div className="relative mx-auto h-6 w-32">
          <div className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-stone-400" />
          <div className="absolute left-3 right-3 top-3 h-px bg-stone-400" />
          <div className="flex items-end justify-between pt-3">
            {Array.from({ length: leaves }).map((_, index) => (
              <span
                key={`leaf-${index}`}
                className="h-4 w-8 rounded-full border border-stone-400 bg-white text-center text-[9px] font-semibold leading-4 text-stone-700"
              >
                A{index + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrowsePageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ListingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = searchParams.toString();

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      type: searchParams.get("type") ?? "",
      category: searchParams.get("category") ?? "",
      minPrice: centsToDollarInput(searchParams.get("minPrice")),
      maxPrice: centsToDollarInput(searchParams.get("maxPrice")),
      sort: searchParams.get("sort") ?? "popular",
      page: Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10)),
      limit: Math.max(1, Math.min(48, Number.parseInt(searchParams.get("limit") ?? "12", 10))),
    }),
    [searchParams]
  );

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams(queryString);
      if (!params.get("sort")) {
        params.set("sort", "popular");
      }
      if (!params.get("page")) {
        params.set("page", "1");
      }
      if (!params.get("limit")) {
        params.set("limit", "12");
      }

      try {
        const response = await fetch(`/api/listings?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ListingsResponse;
        if (!ignore) {
          setResult(payload);
        }
      } catch (loadError) {
        if (!ignore) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Failed to load listings.";
          setError(message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      ignore = true;
    };
  }, [queryString]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    next.set("sort", String(data.get("sort") || "popular"));
    next.set("limit", String(filters.limit));
    next.set("page", "1");

    for (const key of ["search", "type", "category"]) {
      const rawValue = String(data.get(key) || "").trim();
      if (rawValue.length > 0) {
        next.set(key, rawValue);
      }
    }

    for (const key of ["minPrice", "maxPrice"]) {
      const rawValue = String(data.get(key) || "").trim();
      if (!rawValue) {
        continue;
      }

      const dollars = Number.parseFloat(rawValue);
      if (Number.isFinite(dollars) && dollars >= 0) {
        next.set(key, String(Math.round(dollars * 100)));
      }
    }

    router.push(`${pathname}?${next.toString()}`);
  }

  function resetFilters() {
    router.push(pathname);
  }

  function gotoPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(page));
    if (!next.get("sort")) {
      next.set("sort", "popular");
    }
    if (!next.get("limit")) {
      next.set("limit", "12");
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  const listings = result?.data ?? [];
  const pagination = result?.pagination ?? {
    page: filters.page,
    limit: filters.limit,
    total: 0,
    totalPages: 1,
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-stone-300 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-900 p-7 text-stone-100">
        <p className="text-xs uppercase tracking-[0.24em] text-stone-300">ClipMart Marketplace</p>
        <h1 className="mt-3 font-serif text-4xl">Browse listings</h1>
        <p className="mt-3 max-w-3xl text-sm text-stone-200 sm:text-base">
          Filter team blueprints, agent packs, skills, and governance templates for your Paperclip company.
        </p>
      </section>

      <section className="rounded-3xl border border-stone-300 bg-white/75 p-5 shadow-sm">
        <form onSubmit={submitFilters} className="grid gap-3 lg:grid-cols-6">
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Search title or description"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2 lg:col-span-2"
          />

          <select
            name="type"
            defaultValue={filters.type}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all-types"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="category"
            defaultValue={filters.category}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value || "all-categories"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={filters.sort}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 justify-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-800"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400"
            >
              Reset
            </button>
          </div>

          <input
            type="number"
            min={0}
            name="minPrice"
            defaultValue={filters.minPrice}
            placeholder="Min $"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2"
          />

          <input
            type="number"
            min={0}
            name="maxPrice"
            defaultValue={filters.maxPrice}
            placeholder="Max $"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-amber-300 transition focus:ring-2"
          />
        </form>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse rounded-2xl border border-stone-200 bg-white/70 p-5"
            >
              <div className="h-24 rounded-xl bg-stone-200" />
              <div className="mt-4 h-4 w-24 rounded bg-stone-200" />
              <div className="mt-3 h-6 w-3/4 rounded bg-stone-200" />
              <div className="mt-2 h-4 w-full rounded bg-stone-200" />
              <div className="mt-1 h-4 w-2/3 rounded bg-stone-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h2 className="font-serif text-2xl">Unable to load listings</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : listings.length === 0 ? (
        <section className="rounded-2xl border border-stone-300 bg-stone-50 p-8 text-center">
          <h2 className="font-serif text-3xl text-stone-900">No listings match these filters</h2>
          <p className="mt-3 text-sm text-stone-700">
            Try widening your category or price range to discover more blueprints.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-800"
          >
            Clear filters
          </button>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-700">
              Showing {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const rating = parseRating(listing.rating);
              const creatorName = listing.creatorName || "Unknown creator";

              return (
                <article
                  key={listing.id}
                  className="rounded-2xl border border-stone-300 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <OrgChartPreview agentCount={listing.agentCount} />

                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {listingTypeLabel(listing.type)}
                  </p>
                  <h2 className="mt-2 line-clamp-2 font-serif text-2xl leading-tight text-stone-900">
                    <Link href={`/listings/${listing.slug}`} className="hover:underline">
                      {listing.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-stone-700">
                    {listing.tagline || "No tagline provided."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                    <span className="rounded-full bg-stone-100 px-2 py-1">
                      👥 {listing.agentCount ?? "?"} agents
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-1">
                      ⬇ {listing.installCount} installs
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-1">
                      ★ {formatRating(rating)} ({listing.reviewCount})
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <Link
                      href={`/creators/${slugify(creatorName)}`}
                      className="text-sm text-stone-700 underline-offset-4 hover:underline"
                    >
                      By {creatorName}
                    </Link>
                    <p className="text-lg font-semibold text-stone-900">
                      {listing.price > 0
                        ? moneyFormatter.format(listing.price / 100)
                        : "Free"}
                    </p>
                  </div>

                  <Link
                    href={`/listings/${listing.slug}`}
                    className="mt-4 inline-flex w-full justify-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-800"
                  >
                    {listing.price > 0 ? "Buy / Install" : "Install"}
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => gotoPage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-stone-700">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </p>
            <button
              type="button"
              onClick={() => gotoPage(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
