import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Products() {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const { data: categories } = useListCategories();
  const { data: productsData, isLoading } = useListProducts({ categoryId });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">BRAX</Link>
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-sm text-primary transition-colors">Products</Link>
            <Link href="/sign-in" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">Sign In</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex gap-8">
        <aside className="w-64 shrink-0">
          <h2 className="font-bold mb-4 uppercase tracking-wider text-xs text-muted-foreground">Markets</h2>
          <div className="space-y-2">
            <button 
              onClick={() => setCategoryId(undefined)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!categoryId ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-card text-muted-foreground'}`}
            >
              All Markets
            </button>
            {categories?.map(category => (
              <button 
                key={category.id}
                onClick={() => setCategoryId(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${categoryId === category.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-card text-muted-foreground'}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </aside>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Products</h1>
            <div className="text-sm text-muted-foreground">
              {productsData?.total || 0} results
            </div>
          </div>
          
          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="bg-card border border-border rounded-lg h-72 animate-pulse"></div>
             ))}
           </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData?.items.map(product => (
                <Link key={product.id} href={`/products/${product.id}`} className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors">
                  <div className="aspect-video bg-muted relative">
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest">No Image</div>
                    )}
                    {product.stock < 10 && product.stock > 0 && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded font-bold">
                        LOW STOCK
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded font-bold">
                        OUT OF STOCK
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium mb-1 truncate">{product.name}</h3>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        {product.compareAtPrice && (
                          <div className="text-xs text-muted-foreground line-through">${product.compareAtPrice.toFixed(2)}</div>
                        )}
                        <div className="font-mono text-primary font-bold text-lg">${product.price.toFixed(2)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                        {product.sellerName}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}