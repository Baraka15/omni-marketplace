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
  LineChart,
  Line,
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
  DollarSign,
  AlertTriangle,
  FileText,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";

function StatCard({
  label,
  value,
  change,
  icon,
  isLive,
  format = "number",
}: {
  label: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  isLive?: boolean;
  format?: "number" | "currency";
}) {
  const formatted = format === "currency" ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value.toLocaleString();

  return (
    <div className="relative bg-card border border-border rounded-lg p-5 overflow-hidden group hover:border-primary/30 transition-colors" data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{formatted}</p>
      {change !== undefined && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}% vs yesterday
        </p>
      )}
    </div>
  );
}

function SetupSellerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProfile = useCreateSellerProfile();
  const [form, setForm] = useState({ storeName: "", description: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProfile.mutate({ data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSellerProfileQueryKey() });
        toast({ title: "Seller profile created!" });
      },
      onError: () => toast({ title: "Failed to create profile", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto gap-6">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        <ShoppingBag className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold">Set up your seller profile</h2>
        <p className="text-sm text-muted-foreground mt-2">Start selling on BRAX in minutes</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-4 bg-card border border-border rounded-lg p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Store Name *</label>
          <Input placeholder="My Awesome Store" value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} data-testid="input-store-name" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description *</label>
          <Textarea rows={3} placeholder="Tell buyers about your store..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="textarea-store-description" />
        </div>
        <Button type="submit" className="w-full" disabled={createProfile.isPending} data-testid="button-create-seller">
          {createProfile.isPending ? "Creating..." : "Create Seller Profile"}
        </Button>
      </form>
    </div>
  );
}

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

    return () => {
      socket.disconnect();
    };
  }, [profile, queryClient]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-lg text-muted-foreground">Sign in to access the seller dashboard</p>
          <Button onClick={() => setLocation("/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4">
          <SetupSellerProfile />
        </div>
      </div>
    );
  }

  const chartData = (revenueChart ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: d.revenue,
    orders: d.orders,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profile.storeName}</h1>
              {profile.isVerified && (
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">Seller Dashboard</p>
              <span className={`flex items-center gap-1 text-xs ${isConnected ? "text-primary" : "text-muted-foreground"}`}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/seller/products")}>
              <Package className="h-4 w-4 mr-2" /> Products
            </Button>
            <Button size="sm" onClick={() => setLocation("/seller/products/new")}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
          ) : stats ? (
            <>
              <StatCard label="Today's Revenue" value={stats.todayRevenue} change={stats.revenueChange} icon={<DollarSign className="h-4 w-4" />} isLive format="currency" />
              <StatCard label="Today's Orders" value={stats.todayOrders} change={stats.ordersChange} icon={<ShoppingBag className="h-4 w-4" />} isLive />
              <StatCard label="Active Orders" value={stats.activeOrders} icon={<Package className="h-4 w-4" />} isLive />
              <StatCard label="Inventory Items" value={stats.totalProducts} icon={<Package className="h-4 w-4" />} />
            </>
          ) : null}
        </div>

        {stats && stats.lowStockProducts > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 mb-6">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-300">
              <strong>{stats.lowStockProducts}</strong> product{stats.lowStockProducts !== 1 ? "s" : ""} with low stock (&lt;10 units)
            </p>
            <Button size="sm" variant="outline" className="ml-auto text-xs" onClick={() => setLocation("/seller/products")}>
              View
            </Button>
          </div>
        )}

        {stats && stats.pendingRfqs > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary/80">
              <strong>{stats.pendingRfqs}</strong> pending RFQ{stats.pendingRfqs !== 1 ? "s" : ""} awaiting your quote
            </p>
            <Button size="sm" variant="outline" className="ml-auto text-xs" onClick={() => setLocation("/rfq")}>
              Review
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Revenue (Last 30 Days)</h2>
            </div>
            {chartLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Orders</h2>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/seller/orders")}>View all</Button>
            </div>
            {!recentOrders?.items?.length ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                <ShoppingBag className="h-8 w-8 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.items.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-sm" data-testid={`seller-order-${order.id}`}>
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="font-medium">${order.total.toFixed(2)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      order.status === "delivered" ? "bg-green-500/10 text-green-400 border-green-500/30" :
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
      </div>
    </div>
  );
}
