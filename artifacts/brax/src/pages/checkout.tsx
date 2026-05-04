import { useGetCart, useCreateOrder, getGetCartQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, Lock, Smartphone, Globe, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const checkoutSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  phone: z.string().min(1, "Phone is required"),
});

type PaymentMethod = "flutterwave" | "paypal";

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  accepts: string;
}> = [
  {
    id: "flutterwave",
    label: "Mobile Money & Card",
    sub: "MTN, Airtel, M-Pesa, Visa, Mastercard",
    icon: <Smartphone className="h-5 w-5 text-[#FF5722]" />,
    color: "hover:bg-[#FF5722]/5",
    border: "border-[#FF5722]/30 data-[selected]:border-[#FF5722] data-[selected]:bg-[#FF5722]/5",
    accepts: "UGX · KES · NGN · GHS · ZAR · USD",
  },
  {
    id: "paypal",
    label: "PayPal",
    sub: "Pay securely with your PayPal account",
    icon: <Globe className="h-5 w-5 text-[#0070BA]" />,
    color: "hover:bg-[#0070BA]/5",
    border: "border-[#0070BA]/30 data-[selected]:border-[#0070BA] data-[selected]:bg-[#0070BA]/5",
    accepts: "USD · EUR · GBP · CAD",
  },
];

export default function Checkout() {
  const { data: cart, isLoading } = useGetCart();
  const createOrder = useCreateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("flutterwave");
  const [processingPayment, setProcessingPayment] = useState(false);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "Uganda",
      postalCode: "00000",
      phone: user?.phoneNumbers?.[0]?.phoneNumber || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof checkoutSchema>) => {
    if (!cart) return;

    // Check for affiliate code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get("aff") || undefined;

    try {
      const order = await new Promise<{ id: string; total: number }>((resolve, reject) => {
        createOrder.mutate({
          data: {
            cartId: cart.id,
            paymentMethod: selectedPayment,
            shippingAddress: {
              fullName: values.fullName,
              line1: values.line1,
              line2: values.line2,
              city: values.city,
              state: values.state,
              country: values.country,
              postalCode: values.postalCode,
              phone: values.phone,
            },
            affiliateCode: affiliateCode ?? null,
          },
        }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });

      // Route to payment provider
      await initiatePayment(order.id, order.total, values);
    } catch {
      toast({ variant: "destructive", title: "Checkout failed", description: "There was an error creating your order." });
    }
  };

  const initiatePayment = async (orderId: string, total: number, values: z.infer<typeof checkoutSchema>) => {
    setProcessingPayment(true);
    try {
      if (selectedPayment === "flutterwave") {
        const r = await fetch(`${BASE_URL}/api/payments/flutterwave/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderId,
            amount: total,
            currency: "USD",
            email: user?.primaryEmailAddress?.emailAddress || "buyer@omni.market",
            phone: values.phone,
            name: values.fullName,
          }),
        });
        const data = await r.json() as { paymentLink?: string; error?: string };
        if (data.paymentLink) {
          window.location.href = data.paymentLink;
        } else if (data.error?.includes("not configured")) {
          toast({ title: "Payment pending", description: "Your order is placed. You can pay from the order page." });
          setLocation(`/orders/${orderId}`);
        } else {
          throw new Error(data.error || "Payment failed");
        }
      } else if (selectedPayment === "paypal") {
        const r = await fetch(`${BASE_URL}/api/payments/paypal/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId, amount: total, currency: "USD" }),
        });
        const data = await r.json() as { approvalUrl?: string; error?: string };
        if (data.approvalUrl) {
          window.location.href = data.approvalUrl;
        } else if (data.error?.includes("not configured")) {
          toast({ title: "Payment pending", description: "Your order is placed. You can pay from the order page." });
          setLocation(`/orders/${orderId}`);
        } else {
          throw new Error(data.error || "PayPal failed");
        }
      }
    } catch (err) {
      setProcessingPayment(false);
      toast({ variant: "destructive", title: "Payment failed", description: err instanceof Error ? err.message : "Please try again" });
      setLocation(`/orders/${orderId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Button asChild><Link href="/products">Browse Markets</Link></Button>
        </div>
      </div>
    );
  }

  const isSubmitting = createOrder.isPending || processingPayment;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Shipping */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-bold mb-4">Shipping Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="line1" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Region</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input type="tel" {...field} placeholder="+256..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-lg font-bold mb-4">Payment Method</h2>
                  <div className="space-y-3">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        data-selected={selectedPayment === opt.id ? "" : undefined}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${opt.border} ${opt.color}`}
                        onClick={() => setSelectedPayment(opt.id)}
                      >
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {opt.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{opt.label}</p>
                            {selectedPayment === opt.id && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{opt.sub}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{opt.accepts}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    <Lock className="h-3 w-3 shrink-0" />
                    <span>Payments secured by 256-bit SSL encryption. Your card details are never stored.</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                  ) : (
                    <><Lock className="mr-2 h-5 w-5" /> Pay ${cart.subtotal.toFixed(2)} via {selectedPayment === "flutterwave" ? "Mobile Money / Card" : "PayPal"}</>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="h-12 w-12 bg-muted rounded-md border border-border overflow-hidden shrink-0">
                      {item.productImageUrl && (
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary font-mono">${cart.subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                {["Secure SSL payment", "30-day buyer protection", "Instant order confirmation"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
