import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListOrders, useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, ChevronRight, ArrowLeft, Truck, CheckCircle2, Clock,
  XCircle, RotateCcw, CreditCard, Smartphone, Globe, ExternalLink,
  Copy, Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: <Clock className="h-4 w-4" /> },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "processing", label: "Processing", icon: <RotateCcw className="h-4 w-4" /> },
  { key: "shipped", label: "Shipped", icon: <Truck className="h-4 w-4" /> },
  { key: "delivered", label: "Delivered", icon: <CheckCircle2 className="h-4 w-4" /> },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Processing", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: <RotateCcw className="h-3 w-3" /> },
  shipped: { label: "Shipped", color: "bg-primary/10 text-primary border-primary/30", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
  paid: { label: "Paid", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: "Refunded", color: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: <RotateCcw className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function TrackingTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
        <XCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">This order was cancelled</p>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="relative">
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${isDone && idx < currentIdx ? "bg-primary" : "bg-border"}`} />
              )}
              <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone
                  ? isCurrent
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-primary/20 border-primary text-primary"
                  : "bg-muted border-border text-muted-foreground"
              }`}>
                {step.icon}
              </div>
              <p className={`text-[10px] mt-1.5 text-center font-medium leading-tight ${isDone ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-mono text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <StatusBadge status={order.status} />
                      <StatusBadge status={order.paymentStatus} />
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
  const { data: order, isLoading, refetch } = useGetOrder(params.id, {
    query: { enabled: !!params.id, queryKey: getGetOrderQueryKey(params.id), refetchInterval: 10000 },
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check for payment return in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentType = urlParams.get("payment");
    const txId = urlParams.get("transaction_id") || urlParams.get("transactionId");

    if (paymentType === "flutterwave" && txId && params.id) {
      verifyFlutterwavePayment(txId, params.id);
    } else if (paymentType === "paypal") {
      const ppOrderId = urlParams.get("token");
      if (ppOrderId && order?.id) {
        capturePaypalPayment(ppOrderId, order.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function verifyFlutterwavePayment(transactionId: string, orderId: string) {
    try {
      const r = await fetch(`${BASE_URL}/api/payments/flutterwave/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transactionId, orderId }),
      });
      const data = await r.json() as { success: boolean };
      if (data.success) {
        toast({ title: "Payment confirmed!", description: "Your order has been confirmed." });
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        refetch();
      }
    } catch {
      // silent
    }
  }

  async function capturePaypalPayment(paypalOrderId: string, orderId: string) {
    try {
      const r = await fetch(`${BASE_URL}/api/payments/paypal/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paypalOrderId, orderId }),
      });
      const data = await r.json() as { success: boolean };
      if (data.success) {
        toast({ title: "Payment confirmed!", description: "Your order has been confirmed." });
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
        refetch();
      }
    } catch {
      // silent
    }
  }

  async function initiateFlutterwave() {
    if (!order) return;
    setPaymentLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/payments/flutterwave/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          currency: "USD",
          email: "buyer@omni.market",
          phone: (order.shippingAddress as { phone?: string })?.phone || "",
          name: (order.shippingAddress as { fullName?: string })?.fullName || "",
        }),
      });
      const data = await r.json() as { paymentLink?: string; error?: string };
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        toast({ variant: "destructive", title: "Payment failed", description: data.error || "Could not initiate payment" });
      }
    } catch {
      toast({ variant: "destructive", title: "Payment failed", description: "Please try again" });
    } finally {
      setPaymentLoading(false);
    }
  }

  async function initiatePayPal() {
    if (!order) return;
    setPaymentLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/payments/paypal/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId: order.id, amount: order.total, currency: "USD" }),
      });
      const data = await r.json() as { approvalUrl?: string; error?: string };
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        toast({ variant: "destructive", title: "PayPal failed", description: data.error || "Could not initiate PayPal" });
      }
    } catch {
      toast({ variant: "destructive", title: "PayPal failed", description: "Please try again" });
    } finally {
      setPaymentLoading(false);
    }
  }

  const copyOrderId = async () => {
    await navigator.clipboard.writeText(order?.id ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !order ? (
          <p className="text-muted-foreground">Order not found</p>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground font-mono">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <button onClick={copyOrderId} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <h1 className="text-2xl font-bold mt-0.5">Order Details</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <StatusBadge status={order.paymentStatus} />
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold mb-5 text-sm uppercase tracking-wider text-muted-foreground">Order Progress</h2>
              <TrackingTimeline status={order.status} />
            </div>

            {/* Pay now section */}
            {order.paymentStatus === "pending" && order.status !== "cancelled" && (
              <div className="bg-card border border-primary/30 rounded-xl p-5">
                <h2 className="font-semibold mb-1">Complete Your Payment</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your order is reserved. Pay now to confirm it.
                </p>
                <p className="text-2xl font-black text-primary mb-4">${order.total.toFixed(2)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 border-[#FF5722]/30 hover:border-[#FF5722] hover:bg-[#FF5722]/5"
                    onClick={initiateFlutterwave}
                    disabled={paymentLoading}
                  >
                    <Smartphone className="h-4 w-4 mr-2 text-[#FF5722]" />
                    <span className="text-sm font-semibold">Mobile Money / Card</span>
                    <span className="text-xs text-muted-foreground ml-2">(Flutterwave)</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-[#0070BA]/30 hover:border-[#0070BA] hover:bg-[#0070BA]/5"
                    onClick={initiatePayPal}
                    disabled={paymentLoading}
                  >
                    <Globe className="h-4 w-4 mr-2 text-[#0070BA]" />
                    <span className="text-sm font-semibold">PayPal</span>
                    <span className="text-xs text-muted-foreground ml-2">(International)</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Accepts Visa, Mastercard, Mobile Money (MTN, Airtel, M-Pesa), PayPal
                </p>
              </div>
            )}

            {order.paymentStatus === "paid" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="font-semibold text-green-400">Payment Confirmed</p>
                  <p className="text-sm text-muted-foreground">via {order.paymentMethod}</p>
                </div>
              </div>
            )}

            {/* Order items */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Items Ordered</h2>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border-b border-border last:border-0" data-testid={`order-item-${item.id}`}>
                  <div className="h-16 w-16 bg-muted rounded-md overflow-hidden shrink-0">
                    <img
                      src={item.productImageUrl || `https://images.unsplash.com/photo-1560472355-536de3962603?w=80&q=80`}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1560472355-536de3962603?w=80&q=80`; }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <p className="font-semibold">${item.totalPrice.toFixed(2)}</p>
                </div>
              ))}
              <div className="p-4 space-y-2 bg-muted/20">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span><span>${order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                  <span>Total</span><span className="text-primary">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Shipping Address</p>
                <p className="font-medium">{(order.shippingAddress as { fullName?: string })?.fullName}</p>
                <p className="text-sm text-muted-foreground">{(order.shippingAddress as { line1?: string })?.line1}</p>
                <p className="text-sm text-muted-foreground">
                  {(order.shippingAddress as { city?: string; state?: string; country?: string })?.city},{" "}
                  {(order.shippingAddress as { city?: string; state?: string; country?: string })?.state},{" "}
                  {(order.shippingAddress as { city?: string; state?: string; country?: string })?.country}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(order.shippingAddress as { phone?: string })?.phone}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Payment Info</p>
                <p className="font-medium capitalize">{order.paymentMethod.replace(/_/g, " ")}</p>
                <StatusBadge status={order.paymentStatus} />
                {order.paymentStatus === "pending" && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => setLocation(`/orders/${order.id}`)}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Pay Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
