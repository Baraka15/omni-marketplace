import { useListFeaturedProducts, useGetMarketplaceStats, useListCategoriesWithCounts } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Zap, Globe } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  electronics: "💻",
  fashion: "👗",
  "home-garden": "🏠",
  "sports-outdoors": "⚽",
  "beauty-health": "✨",
  automotive: "🚗",
  "books-media": "📚",
  "industrial-b2b": "🏭",
};

export default function Home() {
  const { data: featuredProducts, isLoading: featuredLoading } = useListFeaturedProducts();
  const { data: stats } = useGetMarketplaceStats();
  const { data: categories } = useListCategoriesWithCounts();
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <Logo size="xl" showTagline />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
              Move Goods.{" "}
              <span className="text-primary">Build Wealth.</span>{" "}
              Scale Africa.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              The all-in-one intelligent marketplace — buy, sell, source B2B, and earn as an affiliate. Real-time inventory, instant payments, and AI-powered execution.
            </p>

            <div className="max-w-xl mx-auto mb-8">
              <SearchBar className="w-full" placeholder="Search for products, categories, sellers..." />
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" onClick={() => setLocation("/products")} className="font-semibold">
                Explore Markets <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isSignedIn && (
                <Button size="lg" variant="outline" onClick={() => setLocation("/sign-up")}>
                  Start Selling Free
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      {stats && (
        <section className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Products Listed", value: stats.totalProducts, suffix: "+" },
                { label: "Active Sellers", value: stats.totalSellers, suffix: "" },
                { label: "Orders Fulfilled", value: stats.totalOrders, suffix: "" },
                { label: "Categories", value: stats.categoriesCount, suffix: "" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-primary font-mono">
                    {s.value.toLocaleString()}{s.suffix}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Featured Markets</h2>
            <p className="text-sm text-muted-foreground mt-1">Hand-picked products from verified sellers</p>
          </div>
          <Link href="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {featuredLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(featuredProducts ?? []).map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer h-full flex flex-col" data-testid={`featured-product-${product.id}`}>
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    <img
                      src={(product.imageUrls as string[])?.[0] || ""}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.stock < 10 && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded">LOW STOCK</span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-xs text-muted-foreground mb-1 truncate">{product.categoryName}</p>
                    <p className="font-semibold text-sm line-clamp-2 flex-1">{product.name}</p>
                    <div className="mt-2">
                      {product.compareAtPrice != null && (
                        <p className="text-xs text-muted-foreground line-through">${Number(product.compareAtPrice).toFixed(2)}</p>
                      )}
                      <p className="text-primary font-bold">${Number(product.price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/products?categoryId=${cat.id}`}>
                <div className="group flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer" data-testid={`category-${cat.slug}`}>
                  <span className="text-2xl">{CATEGORY_ICONS[cat.slug] ?? "📦"}</span>
                  <div>
                    <p className="font-medium text-sm">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.productCount ?? 0} products</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sell CTA */}
      {!isSignedIn && (
        <section className="border-t border-border bg-card/30">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Zap className="h-3 w-3" /> Free to start. No commissions on first 100 sales.
              </div>
              <h2 className="text-3xl font-bold mb-4">Start selling today</h2>
              <p className="text-muted-foreground mb-6">
                List your products, get a unique storefront link, and reach thousands of buyers across Africa and beyond.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" onClick={() => setLocation("/sign-up")} className="font-semibold">
                  Create Your Store <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setLocation("/products")}>
                  Browse First
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <TrendingUp className="h-5 w-5" />, title: "Real-time Inventory", desc: "Live stock levels across all listings. Never sell what you don't have." },
              { icon: <Shield className="h-5 w-5" />, title: "Verified Sellers", desc: "Every seller is vetted. Trade with confidence on every transaction." },
              { icon: <Globe className="h-5 w-5" />, title: "B2B Sourcing", desc: "Send bulk RFQs, negotiate prices, and source at scale across Africa." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Lixar Gramz. Powered by BraxAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
