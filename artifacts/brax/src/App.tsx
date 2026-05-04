import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrdersPage, { OrderDetailPage } from "@/pages/orders";
import RfqListPage, { NewRfqPage, RfqDetailPage } from "@/pages/rfq";
import SellerDashboard from "@/pages/seller/dashboard";
import SellerProductsPage, { NewProductPage, EditProductPage } from "@/pages/seller/products";
import SellerOrdersPage from "@/pages/seller/orders";
import StorefrontPage from "@/pages/storefront";
import AffiliateDashboard from "@/pages/affiliate/dashboard";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(165 100% 39%)",
    colorBackground: "hsl(230 28% 16%)",
    colorInput: "hsl(230 28% 26%)",
    colorForeground: "hsl(210 20% 98%)",
    colorMutedForeground: "hsl(230 15% 65%)",
    colorDanger: "hsl(0 62% 40%)",
    colorNeutral: "hsl(230 28% 22%)",
    colorInputForeground: "hsl(210 20% 98%)",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl border border-gray-200 w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-gray-900 font-bold text-2xl",
    headerSubtitle: "text-gray-500",
    formFieldLabel: "text-gray-700 font-medium",
    formFieldInput: "!bg-gray-50 !border-gray-200 !text-gray-900 focus:!ring-primary",
    socialButtonsBlockButton: "!bg-gray-50 !border-gray-200 !text-gray-700 hover:!bg-gray-100",
    dividerLine: "!bg-gray-200",
    dividerText: "!text-gray-400 !text-xs !uppercase !tracking-wider",
    footerActionLink: "!text-primary hover:!text-primary/80",
  },
};

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-[#f5f5f0]">
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border items-center justify-center p-12">
        <div className="max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 24L24 10L38 24L24 38L10 24Z" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M24 10L38 24L24 38" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 24L24 18L30 24" fill="white" opacity="0.9"/>
                <path d="M20 26L32 14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold"><span className="text-primary">OMNI</span></h2>
            <p className="text-xs text-muted-foreground mt-1">powered by BraxAI</p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            "Move Goods. Build Wealth. Scale Africa."
          </p>
          <div className="space-y-3 text-left">
            {["Real-time inventory across all listings", "Unique storefront link for every seller", "B2B sourcing with instant RFQ", "UGX, KES, TZS, NGN supported"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-[#f5f5f0]">
        {children}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthLayout>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthLayout>
  );
}

function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        client.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey || ""}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/products" component={Products} />
            <Route path="/products/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/orders" component={OrdersPage} />
            <Route path="/orders/:id">
              {(params) => <OrderDetailPage params={params as { id: string }} />}
            </Route>
            <Route path="/rfq" component={RfqListPage} />
            <Route path="/rfq/new" component={NewRfqPage} />
            <Route path="/rfq/:id">
              {(params) => <RfqDetailPage params={params as { id: string }} />}
            </Route>
            <Route path="/seller/dashboard" component={SellerDashboard} />
            <Route path="/seller/products" component={SellerProductsPage} />
            <Route path="/seller/products/new" component={NewProductPage} />
            <Route path="/seller/products/:id/edit">
              {(params) => <EditProductPage params={params as { id: string }} />}
            </Route>
            <Route path="/seller/orders" component={SellerOrdersPage} />
            <Route path="/store/:slug" component={StorefrontPage} />
            <Route path="/affiliate" component={AffiliateDashboard} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
