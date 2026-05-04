import { Link, useLocation } from "wouter";
import { useGetCart } from "@workspace/api-client-react";
import { ShoppingCart, Package, LayoutDashboard, FileText, Plus, Store, Link2 } from "lucide-react";
import { useUser, SignOutButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";

export default function Navbar() {
  const { data: cart } = useGetCart();
  const { isSignedIn, user } = useUser();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/">
          <Logo size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium shrink-0">
          <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">Markets</Link>
          {isSignedIn && (
            <>
              <Link href="/rfq" className="text-muted-foreground hover:text-foreground transition-colors">RFQs</Link>
              <Link href="/seller/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Sell</Link>
              <Link href="/affiliate" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />Affiliate
              </Link>
            </>
          )}
        </nav>

        <SearchBar className="flex-1 max-w-lg hidden md:block" placeholder="Search products, markets, sellers..." />

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/cart" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {cart && cart.itemCount > 0 && (
              <span className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                {cart.itemCount > 9 ? "9+" : cart.itemCount}
              </span>
            )}
          </Link>

          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden border border-border p-0">
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                      {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user?.fullName || user?.firstName}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/orders")} className="cursor-pointer">
                  <Package className="mr-2 h-4 w-4" />
                  <span>My Orders</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/rfq")} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My RFQs</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider">Seller</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLocation("/seller/dashboard")} className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/seller/products/new")} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Product</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/seller/products")} className="cursor-pointer">
                  <Store className="mr-2 h-4 w-4" />
                  <span>My Storefront</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-wider">Affiliate</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLocation("/affiliate")} className="cursor-pointer">
                  <Link2 className="mr-2 h-4 w-4" />
                  <span>Affiliate Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <SignOutButton>
                    <button className="w-full text-left text-destructive cursor-pointer flex items-center px-2 py-1.5 text-sm">
                      Sign out
                    </button>
                  </SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/sign-in")}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => setLocation("/sign-up")} className="font-semibold">
                Get Started
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
