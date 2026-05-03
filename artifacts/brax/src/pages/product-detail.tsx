import { useGetProduct, useAddCartItem, getGetCartQueryKey, getGetProductQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, Star, StarHalf, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useGetProduct(id || "", { query: { enabled: !!id, queryKey: getGetProductQueryKey(id || "") } });
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const addCartItem = useAddCartItem();

  const handleAddToCart = () => {
    if (!product) return;
    addCartItem.mutate({ data: { productId: product.id, quantity } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({
          title: "Added to cart",
          description: `${quantity}x ${product.name} added to your cart.`
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Failed to add to cart",
          description: "There was an error adding the item to your cart."
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Link href="/products" className="text-primary hover:underline">Return to products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Products
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
              {product.imageUrls?.[selectedImage] ? (
                <img src={product.imageUrls[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xl uppercase tracking-widest">No Image</div>
              )}
            </div>
            {product.imageUrls && product.imageUrls.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {product.imageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 shrink-0 rounded-md overflow-hidden border-2 ${selectedImage === idx ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{product.categoryName}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Package className="h-4 w-4" /> SKU: {product.sku}</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center text-yellow-500">
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <Star className="h-5 w-5 fill-current" />
                <StarHalf className="h-5 w-5 fill-current" />
                <span className="ml-2 text-foreground text-sm font-medium">{product.rating?.toFixed(1) || '4.8'}</span>
                <span className="ml-1 text-muted-foreground text-sm">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-mono font-bold text-primary">${product.price.toFixed(2)}</span>
                {product.compareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through mb-1">${product.compareAtPrice.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Low Stock (${product.stock} remaining)` : 'Out of Stock'}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground mb-8 text-base leading-relaxed">
              {product.description}
            </p>

            <div className="bg-card border border-border rounded-lg p-6 mb-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-24">
                  <label className="text-sm font-medium mb-1 block">Quantity</label>
                  <div className="flex items-center border border-border rounded-md">
                    <button 
                      className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || product.stock === 0}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="w-full text-center bg-transparent border-none p-0 focus:ring-0 disabled:opacity-50"
                      value={quantity}
                      readOnly
                    />
                    <button 
                      className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock || product.stock === 0}
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button 
                  className="flex-1 h-[42px] mt-6 gap-2 font-bold uppercase tracking-wider" 
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || addCartItem.isPending}
                >
                  {addCartItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </div>
              <div className="flex gap-4 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <Link href="/rfq/new">Request Bulk Quote</Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-semibold mb-3">Seller Information</h3>
              <div className="flex items-center justify-between bg-card border border-border p-4 rounded-lg">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {product.sellerName}
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Verified Seller • 99% Positive Feedback</div>
                </div>
                <Button variant="secondary" size="sm">View Profile</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}