import { useListFeaturedProducts, useGetMarketplaceStats } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Home() {
  const { data: featuredProducts, isLoading: featuredLoading } = useListFeaturedProducts();
  const { data: stats, isLoading: statsLoading } = useGetMarketplaceStats();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">BRAX</Link>
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">Products</Link>
            <Link href="/sign-in" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">Sign In</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        <section className="mb-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">The precision marketplace for ambitious traders.</h1>
            <p className="text-lg text-muted-foreground mb-8">Access professional-grade liquidity, real-time inventory, and instant execution across global markets.</p>
            <div className="flex gap-4">
              <Link href="/products" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:opacity-90 transition-opacity">
                Explore Markets
              </Link>
            </div>
          </div>
        </section>

        {stats && (
          <section className="mb-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Total Products</div>
              <div className="text-2xl font-mono font-medium">{stats.totalProducts.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Active Sellers</div>
              <div className="text-2xl font-mono font-medium">{stats.totalSellers.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Total Orders</div>
              <div className="text-2xl font-mono font-medium">{stats.totalOrders.toLocaleString()}</div>
            </div>
            <div className="bg-card border border-border p-6 rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Categories</div>
              <div className="text-2xl font-mono font-medium">{stats.categoriesCount.toLocaleString()}</div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Markets</h2>
            <Link href="/products" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          
          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-card border border-border rounded-lg h-64 animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts?.map(product => (
                <Link key={product.id} href={`/products/${product.id}`} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors">
                  <div className="aspect-square bg-muted relative">
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-lg mb-1 truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-primary font-bold">${product.price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}