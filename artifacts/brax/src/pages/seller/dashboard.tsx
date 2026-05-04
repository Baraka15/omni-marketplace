import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import {
  useGetSellerDashboardStats,
  useGetSellerRevenueChart,
  useListSellerOrders,
  useListSellerProducts,
  useCreateSellerProfile,
  useGetSellerProfile,
  getGetSellerDashboardStatsQueryKey,
  getGetSellerProfileQueryKey,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingBag,
  AlertTriangle,
  FileText,
  Plus,
  Wifi,
  WifiOff,
  Store,
  Link2,
  MessageCircle,
  Send,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import Logo from "@/components/Logo";

function formatCurrency(amount: number, currency = "UGX") {
  return `${currency} ${amount.toLocaleString("en-UG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  isLive,
  trend,
  currency,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  isLive?: boolean;
  trend?: number;
  currency?: string;
}) {
  const displayValue = currency ? formatCurrency(value, currency) : value.toLocaleString();
  return (
    <div className="relative bg-card border border-border rounded-xl p-5 overflow-hidden hover:border-primary/30 transition-colors" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      {isLive && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          LIVE
        </span>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight font-mono">{displayValue}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs mt-1.5 flex items-center gap-1 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs yesterday
        </p>
      )}
    </div>
  );
}

function SetupSellerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProfile = useCreateSellerProfile();
  const [form, setForm] = useState({ storeName: "", description: "", currency: "UGX", whatsappNumber: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProfile.mutate({ data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSellerProfileQueryKey() });
        toast({ title: "Seller profile created! Welcome to Lixar Gramz." });
      },
      onError: () => toast({ title: "Failed to create profile", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Logo size="lg" className="justify-center mb-4" />
            <h2 className="text-2xl font-bold mt-4">Set up your seller profile</h2>
            <p className="text-sm text-muted-foreground mt-2">Get your unique store link and start selling in minutes</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Store Name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. Kampala Electronics Hub" value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} data-testid="input-store-name" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea rows={3} placeholder="Tell buyers about your store..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-store-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="UGX">UGX (Uganda)</option>
                  <option value="KES">KES (Kenya)</option>
                  <option value="TZS">TZS (Tanzania)</option>
                  <option value="USD">USD</option>
                  <option value="NGN">NGN (Nigeria)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp Number</label>
                <Input placeholder="+256700000000" value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} />
              </div>
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={createProfile.isPending} data-testid="button-create-seller">
              {createProfile.isPending ? "Creating..." : "Create My Store →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

const TODAY = new Date();
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SellerDashboard() {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useGetSellerProfile();
  const { data: stats, isLoading: statsLoading } = useGetSellerDashboardStats();
  const { data: revenueChart, isLoading: chartLoading } = useGetSellerRevenueChart();
  const { data: recentOrders } = useListSellerOrders({ page: 1 });
  const { data: products } = useListSellerProducts();

  useEffect(() => {
    if (!profile) return;
    const socket = io({ path: "/ws" });
    socketRef.current = socket;
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("seller:subscribe", profile.id);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("dashboard:stats:update", () => {
      queryClient.invalidateQueries({ queryKey: getGetSellerDashboardStatsQueryKey() });
    });
    return () => { socket.disconnect(); };
  }, [profile, queryClient]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Logo size="lg" className="justify-center" />
          <p className="text-lg text-muted-foreground mt-4">Sign in to access your seller dashboard</p>
          <Button onClick={() => setLocation("/sign-in")} className="font-semibold">Sign In</Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) return <SetupSellerProfile />;

  const currency = stats?.currency ?? profile.currency ?? "UGX";
  const chartData = (revenueChart ?? []).map((d) => ({
    date: (() => {
      const dt = new Date(d.date);
      return `${DAY_NAMES[dt.getDay()]} ${dt.getDate()}`;
    })(),
    revenue: d.revenue,
    orders: d.orders,
  }));

  const storeSlug = stats?.storeSlug ?? profile.storeSlug;
  const whatsappNumber = stats?.whatsappNumber ?? profile.whatsappNumber;

  const storefrontUrl = storeSlug ? `${window.location.origin}/store/${storeSlug}` : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              OPERATIONS · {TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold">
              Good {TODAY.getHours() < 12 ? "morning" : TODAY.getHours() < 17 ? "afternoon" : "evening"} at{" "}
              <em className="not-italic text-primary">{profile.storeName}.</em>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`flex items-center gap-1 text-xs ${isConnected ? "text-primary" : "text-muted-foreground"}`}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? "Real-time connected" : "Connecting..."}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setLocation("/seller/products/new")} className="font-semibold">
              <Plus className="h-4 w-4 mr-1.5" /> New Sale
            </Button>
            <Button variant="outline" onClick={() => setLocation("/rfq/new")}>
              <Send className="h-4 w-4 mr-1.5" /> Source Stock
            </Button>
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10">
                  <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : stats ? (
            <>
              <KpiCard
                label="TODAY · REVENUE"
                value={stats.todayRevenue}
                sub={`${stats.todayOrders} orders today`}
                icon={<TrendingUp className="h-4 w-4" />}
                isLive
                trend={stats.revenueChange}
                currency={currency}
              />
              <KpiCard
                label="7 DAYS"
                value={stats.sevenDayRevenue}
                sub={`${stats.sevenDayOrders} orders this week`}
                icon={<ArrowUpRight className="h-4 w-4" />}
                currency={currency}
              />
              <KpiCard
                label="RECEIVABLES"
                value={stats.receivables}
                sub="Owed by customers"
                icon={<CreditCard className="h-4 w-4" />}
                currency={currency}
              />
              <KpiCard
                label="B2B IN TRANSIT"
                value={stats.b2bInTransit}
                sub="Track supplier orders →"
                icon={<Send className="h-4 w-4" />}
              />
            </>
          ) : null}
        </div>

        {/* Alerts */}
        {stats && stats.lowStockProducts > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-300 flex-1">
              <strong>{stats.lowStockProducts}</strong> product{stats.lowStockProducts !== 1 ? "s" : ""} with low stock (&lt;10 units)
            </p>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setLocation("/seller/products")}>View</Button>
          </div>
        )}
        {stats && stats.pendingRfqs > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary/80 flex-1">
              <strong>{stats.pendingRfqs}</strong> pending RFQ{stats.pendingRfqs !== 1 ? "s" : ""} awaiting your quote
            </p>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setLocation("/rfq")}>Review</Button>
          </div>
        )}

        {/* Storefront link */}
        {storefrontUrl && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border mb-6">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Your unique storefront link</p>
              <code className="text-sm text-primary font-mono truncate block">{storefrontUrl}</code>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(storefrontUrl);
              }}
            >
              Copy Link
            </Button>
            <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => setLocation(`/store/${storeSlug}`)}>
              <Store className="h-3.5 w-3.5 mr-1" /> View
            </Button>
          </div>
        )}

        {/* Revenue chart + Recent orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Revenue — Last 30 Days</h2>
              <span className="text-xs text-muted-foreground">{currency}</span>
            </div>
            {chartLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(165 100% 39%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(165 100% 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} tickFormatter={(v) => `${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(165 100% 39%)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Orders</h2>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/seller/orders")}>View all</Button>
            </div>
            {!recentOrders?.items?.length ? (
              <div className="flex flex-col items-center py-10 text-muted-foreground gap-3">
                <ShoppingBag className="h-8 w-8 opacity-30" />
                <p className="text-sm">No orders yet</p>
                <Button size="sm" variant="outline" onClick={() => setLocation("/seller/products/new")} className="text-xs">Add your first product</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.items.slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0" data-testid={`seller-order-${order.id}`}>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="font-semibold text-xs">{formatCurrency(order.total, currency)}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${
                      order.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                      order.status === "shipped" ? "bg-primary/10 text-primary border-primary/30" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setLocation("/seller/products")}>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">My Products</span>
            </div>
            <p className="text-2xl font-bold">{products?.total ?? 0}</p>
            <p className="text-xs text-primary mt-1">Manage inventory →</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setLocation("/rfq")}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">RFQs</span>
            </div>
            <p className="text-2xl font-bold">{stats?.pendingRfqs ?? 0}</p>
            <p className="text-xs text-primary mt-1">Pending quotes →</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setLocation("/seller/orders")}>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Customer Orders</span>
            </div>
            <p className="text-2xl font-bold">{stats?.activeOrders ?? 0}</p>
            <p className="text-xs text-primary mt-1">Active orders →</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Storefront</span>
            </div>
            <p className="text-2xl font-bold">Live</p>
            {storefrontUrl && (
              <button
                className="text-xs text-primary mt-1 hover:underline"
                onClick={() => setLocation(`/store/${storeSlug}`)}
              >
                View your store →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
