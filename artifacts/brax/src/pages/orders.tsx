import { Link, useLocation } from "wouter";
import { useListOrders, useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronRight, ArrowLeft, Truck, CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: <RotateCcw className="h-3 w-3" /> },
  shipped: { label: "Shipped", color: "bg-primary/10 text-primary border-primary/30", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function OrdersPage() {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const { data, isLoading } = useListOrders();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Package className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Sign in to view your orders</p>
          <Button onClick={() => setLocation("/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-semibold text-muted-foreground">No orders yet</p>
            <Button onClick={() => setLocation("/products")}>Start Shopping</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.items.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="group flex items-center gap-5 p-5 rounded-lg bg-card border border-border hover:border-primary/40 transition-all cursor-pointer" data-testid={`order-card-${order.id}`}>
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""} &middot; {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${order.total.toFixed(2)}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto mt-1 group-hover:translate-x-0.5 transition-transform" />
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

export function OrderDetailPage({ params }: { params: { id: string } }) {
  const { data: order, isLoading } = useGetOrder(params.id, {
    query: { enabled: !!params.id, queryKey: getGetOrderQueryKey(params.id) },
  });
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/orders")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !order ? (
          <p className="text-muted-foreground">Order not found</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-mono">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <h1 className="text-2xl font-bold mt-1">Order Details</h1>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4" data-testid={`order-item-${item.id}`}>
                  <img
                    src={item.productImageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80"}
                    alt={item.productName}
                    className="h-16 w-16 object-cover rounded-md bg-muted"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <p className="font-semibold">${item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span><span>${order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
                  <span>Total</span><span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Shipping Address</p>
                <p className="font-medium">{(order.shippingAddress as { fullName?: string })?.fullName}</p>
                <p className="text-sm text-muted-foreground">{(order.shippingAddress as { line1?: string })?.line1}</p>
                <p className="text-sm text-muted-foreground">
                  {(order.shippingAddress as { city?: string; state?: string; country?: string })?.city}, {(order.shippingAddress as { city?: string; state?: string; country?: string })?.state}, {(order.shippingAddress as { city?: string; state?: string; country?: string })?.country}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Payment</p>
                <p className="font-medium capitalize">{order.paymentMethod.replace("_", " ")}</p>
                <StatusBadge status={order.paymentStatus} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
