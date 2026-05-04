import { useParams, Link } from "wouter";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Star, MessageCircle, CheckCircle } from "lucide-react";

interface StorefrontData {
  seller: {
    id: string;
    storeName: string;
    storeSlug: string | null;
    description: string;
    logoUrl: string | null;
    isVerified: boolean;
    totalSales: number;
    rating: number | null;
    whatsappNumber: string | null;
    currency: string;
    createdAt: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    imageUrls: string[];
    stock: number;
    rating: number | null;
    reviewCount: number;
    categoryName: string;
  }>;
}

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/store/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Store not found");
        return r.json() as Promise<StorefrontData>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <Skeleton className="h-40 rounded-xl mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Store className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold">Store not found</h2>
          <p className="text-muted-foreground text-sm">This storefront doesn&apos;t exist or has been removed.</p>
          <Link href="/products">
            <Button variant="outline">Browse Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { seller, products } = data;
  const currency = seller.currency || "UGX";

  const formatPrice = (price: number) =>
    `${currency} ${price.toLocaleString("en-UG", { minimumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Store Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-border overflow-hidden">
              {seller.logoUrl ? (
                <img src={seller.logoUrl} alt={seller.storeName} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{seller.storeName}</h1>
                {seller.isVerified && (
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-xs flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              {seller.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{Number(seller.rating).toFixed(1)}</span>
                </div>
              )}
              {seller.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">{seller.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {products.length} product{products.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {seller.totalSales} total sales
                </span>
                {seller.whatsappNumber && (
                  <a
                    href={`https://wa.me/${seller.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="container mx-auto px-4 py-3 max-w-5xl">
        <div className="flex items-center gap-2 bg-card/50 border border-border rounded-lg px-4 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Your store link:</span>
          <code className="text-primary font-mono">
            {window.location.origin}/store/{seller.storeSlug}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/store/${seller.storeSlug}`)}
            className="ml-auto text-primary hover:underline font-medium"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {products.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Store className="h-10 w-10 opacity-30" />
            <p>No products listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                  <div className="aspect-square overflow-hidden bg-muted relative">
                    <img
                      src={(product.imageUrls)?.[0] || ""}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.stock < 10 && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        LOW STOCK
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-xs text-muted-foreground mb-1 truncate">{product.categoryName}</p>
                    <p className="font-semibold text-sm line-clamp-2 flex-1">{product.name}</p>
                    {product.rating && (
                      <div className="flex items-center gap-1 my-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-muted-foreground">{Number(product.rating).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      {product.compareAtPrice && (
                        <p className="text-xs text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</p>
                      )}
                      <p className="text-primary font-bold text-sm">{formatPrice(product.price)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
