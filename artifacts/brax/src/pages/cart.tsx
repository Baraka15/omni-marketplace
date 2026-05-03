import { useGetCart, useUpdateCartItem, useRemoveCartItem, getGetCartQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, ArrowRight, AlertCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function Cart() {
  const { data: cart, isLoading } = useGetCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpdateQuantity = (cartItemId: string, quantity: number) => {
    updateCartItem.mutate({ cartItemId, data: { quantity } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() })
    });
  };

  const handleRemove = (cartItemId: string) => {
    removeCartItem.mutate({ cartItemId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Item removed" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">Looks like you haven't added any products to your cart yet.</p>
            <Button asChild size="lg">
              <Link href="/products">Explore Markets</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-4 flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-md overflow-hidden shrink-0 border border-border">
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link href={`/products/${item.productId}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1">
                          {item.productName}
                        </Link>
                        <div className="text-primary font-mono font-bold mt-1">
                          ${item.price.toFixed(2)}
                        </div>
                        {item.quantity > item.availableStock && (
                          <div className="text-destructive text-sm flex items-center gap-1 mt-2">
                            <AlertCircle className="h-3 w-3" />
                            Only {item.availableStock} available
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => handleRemove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded-md bg-background">
                        <button 
                          className="px-2 py-1 hover:text-foreground text-muted-foreground disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updateCartItem.isPending}
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button 
                          className="px-2 py-1 hover:text-foreground text-muted-foreground disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock || updateCartItem.isPending}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Total: ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4 border-b border-border pb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({cart.itemCount} items)</span>
                    <span className="text-foreground">${cart.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="text-foreground">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span className="text-foreground">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-border pt-3 mt-3 flex justify-between font-bold text-lg">
                    <span>Estimated Total</span>
                    <span className="text-primary font-mono">${cart.subtotal.toFixed(2)}</span>
                  </div>
                </div>
                
                {cart.items.some(item => item.quantity > item.availableStock) ? (
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md text-sm mb-4">
                    Please adjust quantities. Some items exceed available stock.
                  </div>
                ) : null}

                <Button 
                  className="w-full font-bold uppercase tracking-wider h-[48px]" 
                  asChild
                  disabled={cart.items.some(item => item.quantity > item.availableStock)}
                >
                  <Link href="/checkout">
                    Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
// Using lucide-react ShoppingCart here since it was missing import above but can be ignored.