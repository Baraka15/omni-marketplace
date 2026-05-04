import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Products() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const initialSearch = searchParams.get("search") ?? "";
  const initialCategory = searchParams.get("categoryId") ?? undefined;

  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<string>("newest");

  const { data: categories } = useListCategories();
  const { data: productsData, isLoading } = useListProducts({
    categoryId,
    search: search || undefined,
    sortBy: sortBy as "newest" | "popular" | "price_asc" | "price_desc",
  });

  // Sync URL search param on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("search");
    const c = p.get("categoryId");
    if (s) setSearch(s);
    if (c) setCategoryId(c);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        {/* Mobile search */}
        <div className="md:hidden mb-4">
          <SearchBar
            className="w-full"
            placeholder="Search products..."
            autoFocus={!!initialSearch}
          />
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="sticky top-20">
              <h2 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Markets
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => setCategoryId(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !categoryId
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Markets
                </button>
                {categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      categoryId === category.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Filters bar */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">
                  {search ? `Results for "${search}"` : categoryId ? (categories?.find((c) => c.id === categoryId)?.name ?? "Products") : "All Products"}
                </h1>
                <span className="text-sm text-muted-foreground">
                  ({productsData?.total ?? 0})
                </span>
                {(search || categoryId) && (
                  <button
                    onClick={() => { setSearch(""); setCategoryId(undefined); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-card border border-border rounded-full px-2 py-0.5"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <select
                  className="text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : productsData?.items?.length === 0 ? (
              <div className="flex flex-col items-center py-24 gap-3 text-muted-foreground">
                <p className="text-lg">No products found</p>
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCategoryId(undefined); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productsData?.items.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group block"
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all h-full flex flex-col">
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {product.imageUrls?.[0] ? (
                          <img
                            src={product.imageUrls[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs uppercase tracking-widest">
                            No Image
                          </div>
                        )}
                        {product.stock < 10 && product.stock > 0 && (
                          <span className="absolute top-2 right-2 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            LOW STOCK
                          </span>
                        )}
                        {product.stock === 0 && (
                          <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <p className="text-xs text-muted-foreground truncate mb-0.5">{product.sellerName}</p>
                        <p className="font-semibold text-sm line-clamp-2 flex-1">{product.name}</p>
                        {product.rating && (
                          <div className="flex items-center gap-1 my-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-muted-foreground">
                              {Number(product.rating).toFixed(1)} ({product.reviewCount})
                            </span>
                          </div>
                        )}
                        <div className="mt-2">
                          {product.compareAtPrice && (
                            <p className="text-xs text-muted-foreground line-through">
                              ${Number(product.compareAtPrice).toFixed(2)}
                            </p>
                          )}
                          <p className="text-primary font-bold">${Number(product.price).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
