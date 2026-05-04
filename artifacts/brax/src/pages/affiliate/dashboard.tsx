import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Link2,
  MousePointer2,
  ShoppingCart,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  Users,
  Zap,
  Plus,
  Search,
  ChevronRight,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function buildAffiliateUrl(slug: string): string {
  const domain = window.location.origin;
  return `${domain}${BASE_URL}/api/affiliate/track/${slug}`;
}

function KpiCard({ label, value, icon, sub, accent = false }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? "bg-primary text-primary-foreground border-primary/50" : "bg-card border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs uppercase tracking-wider font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</span>
        <span className={accent ? "text-primary-foreground/70" : "text-primary"}>{icon}</span>
      </div>
      <p className={`text-3xl font-black ${accent ? "text-primary-foreground" : "text-foreground"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

interface AffiliateProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  code: string;
  commissionRate: number;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  status: string;
  createdAt: string;
}

interface AffiliateDashboard {
  profile: AffiliateProfile;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  pendingPayout: number;
  recentLinks: AffiliateLinkItem[];
}

interface AffiliateLinkItem {
  id: string;
  affiliateId: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  productPrice: number;
  slug: string;
  clicks: number;
  conversions: number;
  earnings: number;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrls: string[];
  sellerName: string;
}

interface ProductsResponse {
  items: Product[];
}

export default function AffiliateDashboard() {
  const { isSignedIn, user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || "");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<AffiliateProfile | null>({
    queryKey: ["affiliate-profile"],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/affiliate/profile`, { credentials: "include" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("Failed to fetch affiliate profile");
      return r.json();
    },
    enabled: isSignedIn,
    retry: false,
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<AffiliateDashboard>({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/affiliate/dashboard`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch dashboard");
      return r.json();
    },
    enabled: !!profile,
    refetchInterval: 30000,
  });

  const { data: productsData } = useQuery<ProductsResponse>({
    queryKey: ["products-for-affiliate", productSearch],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/products?limit=20&search=${encodeURIComponent(productSearch)}`, { credentials: "include" });
      return r.json();
    },
    enabled: showProductPicker,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE_URL}/api/affiliate/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email }),
      });
      if (!r.ok) {
        const e = await r.json() as { error?: string };
        throw new Error(e.error || "Registration failed");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-profile"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate-dashboard"] });
      toast({ title: "Welcome to OMNI Affiliates!", description: "Your affiliate account is now active." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Registration failed", description: err.message });
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (productId: string) => {
      const r = await fetch(`${BASE_URL}/api/affiliate/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });
      if (!r.ok) {
        const e = await r.json() as { error?: string };
        throw new Error(e.error || "Failed to create link");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-dashboard"] });
      setShowProductPicker(false);
      toast({ title: "Affiliate link created!", description: "Share your unique link to start earning." });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const copyLink = async (slug: string) => {
    const url = buildAffiliateUrl(slug);
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast({ title: "Link copied!" });
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Users className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold">Join the OMNI Affiliate Program</h2>
          <p className="text-muted-foreground">Sign in to start promoting products and earning commissions.</p>
          <Button onClick={() => setLocation("/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-10 max-w-5xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 max-w-lg">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Become an OMNI Affiliate</h1>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Promote products from OMNI Marketplace and earn <span className="text-primary font-semibold">10% commission</span> on every sale you generate. Create unique links for any product and track your performance in real time.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: <Link2 className="h-5 w-5" />, label: "Unique Links" },
                { icon: <TrendingUp className="h-5 w-5" />, label: "Real-time Stats" },
                { icon: <DollarSign className="h-5 w-5" />, label: "10% Commission" },
              ].map((f) => (
                <div key={f.label} className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-primary mb-1 flex justify-center">{f.icon}</div>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-left mb-6">
              <div>
                <label className="text-sm font-medium block mb-1">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <Button
              className="w-full font-bold h-11"
              disabled={!name || !email || registerMutation.isPending}
              onClick={() => registerMutation.mutate()}
            >
              {registerMutation.isPending ? "Registering..." : "Join Affiliate Program"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground text-sm">Your code:</p>
              <code className="text-primary font-mono font-bold text-sm bg-primary/10 px-2 py-0.5 rounded">{profile.code}</code>
              <Badge variant="secondary" className="text-xs capitalize">{profile.status}</Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Commission Rate</p>
            <p className="text-2xl font-black text-primary">{profile.commissionRate}%</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Total Earnings"
            value={`$${(dashboard?.totalEarnings ?? 0).toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
            sub="All time"
            accent
          />
          <KpiCard
            label="Total Clicks"
            value={(dashboard?.totalClicks ?? 0).toLocaleString()}
            icon={<MousePointer2 className="h-4 w-4" />}
            sub="Across all links"
          />
          <KpiCard
            label="Conversions"
            value={dashboard?.totalConversions ?? 0}
            icon={<ShoppingCart className="h-4 w-4" />}
            sub="Completed sales"
          />
          <KpiCard
            label="Conv. Rate"
            value={`${dashboard?.conversionRate ?? 0}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            sub="Clicks → sales"
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Links section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Your Affiliate Links</h2>
              <Button size="sm" onClick={() => setShowProductPicker(!showProductPicker)}>
                <Plus className="h-4 w-4 mr-1" />
                New Link
              </Button>
            </div>

            {/* Product picker */}
            {showProductPicker && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-medium mb-3 text-sm">Pick a product to promote</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(productsData?.items ?? []).map((p) => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      onClick={() => createLinkMutation.mutate(p.id)}
                      disabled={createLinkMutation.isPending}
                    >
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                        {p.imageUrls?.[0] && (
                          <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">${Number(p.price).toFixed(2)} · {p.sellerName}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                  {productsData?.items.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">No products found</p>
                  )}
                </div>
              </div>
            )}

            {/* Links list */}
            {dashLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : !dashboard?.recentLinks.length ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
                <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No affiliate links yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Click "New Link" to create your first affiliate link</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.recentLinks.map((link) => {
                  const url = buildAffiliateUrl(link.slug);
                  return (
                    <div key={link.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                          {link.productImageUrl && (
                            <img src={link.productImageUrl} alt={link.productName} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{link.productName}</p>
                          <p className="text-xs text-muted-foreground">${link.productPrice.toFixed(2)}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[220px]">{url}</code>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-bold">{link.clicks}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-bold">{link.conversions}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Sales</p>
                        </div>
                        <div className="h-8 w-px bg-border" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-primary">${link.earnings.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => copyLink(link.slug)}
                        >
                          {copiedSlug === link.slug ? (
                            <><Check className="h-3 w-3 mr-1.5 text-green-500" /> Copied!</>
                          ) : (
                            <><Copy className="h-3 w-3 mr-1.5" /> Copy Link</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLocation(`/products/${link.productId}`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                How It Works
              </h3>
              <div className="space-y-3">
                {[
                  { n: "1", text: "Create a unique link for any product" },
                  { n: "2", text: "Share it anywhere — social, WhatsApp, blog" },
                  { n: "3", text: "Earn 10% commission on every sale" },
                  { n: "4", text: "Track clicks and conversions in real time" },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</span>
                    <p className="text-sm text-muted-foreground">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold mb-1">Pending Payout</h3>
              <p className="text-3xl font-black text-primary">${(dashboard?.pendingPayout ?? 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Payouts processed monthly</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold mb-1 text-sm">Your Affiliate Code</h3>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-muted rounded px-3 py-2 text-primary font-mono font-bold text-sm">{profile.code}</code>
                <Button size="sm" variant="outline" onClick={() => copyLink(profile.code)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Add ?aff={profile.code} to any product URL</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
