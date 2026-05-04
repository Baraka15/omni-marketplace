import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({ className = "", placeholder = "Search products, sellers...", autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  const { data: results } = useListProducts(
    { search: debouncedQuery, limit: 6 },
    { query: { enabled: debouncedQuery.length >= 2, queryKey: ["search-bar-products", debouncedQuery] } },
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      setOpen(false);
      setLocation(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const handleSelect = (productId: string) => {
    setOpen(false);
    setQuery("");
    setLocation(`/products/${productId}`);
  };

  const handleSearch = () => {
    if (query.trim()) {
      setOpen(false);
      setLocation(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  const items = results?.items ?? [];
  const showDropdown = open && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          data-testid="search-input"
        />
        {query ? (
          <button
            onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </div>
          ) : (
            <>
              <div className="py-1">
                {items.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    data-testid={`search-result-${product.id}`}
                  >
                    <img
                      src={(product.imageUrls as string[])?.[0] || ""}
                      alt={product.name}
                      className="h-9 w-9 rounded-md object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.categoryName}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      ${Number(product.price).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleSearch}
                className="w-full flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm font-medium text-primary"
                data-testid="search-view-all"
              >
                <span>View all results for &ldquo;{debouncedQuery}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
