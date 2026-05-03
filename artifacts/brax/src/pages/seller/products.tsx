import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListSellerProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
  getListSellerProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

export default function SellerProductsPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useListSellerProducts();
  const deleteProduct = useDeleteProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Archive "${name}"?`)) return;
    deleteProduct.mutate({ productId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() });
        toast({ title: "Product archived" });
      },
      onError: () => toast({ title: "Failed to archive product", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/seller/dashboard")} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <h1 className="text-2xl font-bold">My Products</h1>
          </div>
          <Button onClick={() => setLocation("/seller/products/new")}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-24 text-muted-foreground">
            <p className="text-lg mb-4">No products yet</p>
            <Button onClick={() => setLocation("/seller/products/new")}>Add your first product</Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Stock</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/20 transition-colors" data-testid={`product-row-${product.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={(product.imageUrls as string[])?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=60&q=80"}
                          alt={product.name}
                          className="h-10 w-10 rounded-md object-cover bg-muted"
                        />
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right font-medium">${Number(product.price).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${product.stock < 10 ? "text-yellow-400" : "text-foreground"}`}>
                        {product.stock}
                        {product.stock < 10 && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        product.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                        product.status === "out_of_stock" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
                        "bg-muted text-muted-foreground border-border"
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/seller/products/${product.id}/edit`)} data-testid={`edit-product-${product.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)} data-testid={`delete-product-${product.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductForm({ initialData, onSubmit, isPending, submitLabel }: {
  initialData?: Partial<{ name: string; description: string; price: string; compareAtPrice: string; imageUrls: string[]; categoryId: string; stock: string; sku: string }>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const { data: categories } = useListCategories();
  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price ? String(initialData.price) : "",
    compareAtPrice: initialData?.compareAtPrice ? String(initialData.compareAtPrice) : "",
    imageUrls: initialData?.imageUrls?.join("\n") || "",
    categoryId: initialData?.categoryId || "",
    stock: initialData?.stock ? String(initialData.stock) : "",
    sku: initialData?.sku || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
      imageUrls: form.imageUrls.split("\n").map((u) => u.trim()).filter(Boolean),
      categoryId: form.categoryId,
      stock: parseInt(form.stock),
      sku: form.sku,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Product Name *</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Blue Widget Pro" data-testid="input-name" required />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Description *</label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your product..." data-testid="textarea-description" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Price ($) *</label>
          <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="99.99" data-testid="input-price" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Compare-at Price ($)</label>
          <Input type="number" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} placeholder="Optional original price" data-testid="input-compare-price" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Category *</label>
          <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
            <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">SKU *</label>
          <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="e.g. WIDGET-BLU-001" data-testid="input-sku" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Stock *</label>
          <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="100" data-testid="input-stock" required />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Image URLs (one per line)</label>
          <Textarea rows={3} value={form.imageUrls} onChange={(e) => setForm((f) => ({ ...f, imageUrls: e.target.value }))} placeholder="https://example.com/image.jpg" data-testid="textarea-images" />
        </div>
      </div>
      <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-product">
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

export function NewProductPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/seller/products")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> My Products
        </Button>
        <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
        <ProductForm
          submitLabel="Create Product"
          isPending={createProduct.isPending}
          onSubmit={(data) => {
            createProduct.mutate({ data } as unknown as Parameters<typeof createProduct.mutate>[0], {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() });
                toast({ title: "Product created!" });
                setLocation("/seller/products");
              },
              onError: () => toast({ title: "Failed to create product", variant: "destructive" }),
            });
          }}
        />
      </div>
    </div>
  );
}

export function EditProductPage({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProduct = useUpdateProduct();
  const { data: products } = useListSellerProducts();
  const product = products?.items?.find((p) => p.id === params.id);

  if (!product) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Product not found</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/seller/products")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> My Products
        </Button>
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
        <ProductForm
          initialData={{
            name: product.name,
            description: product.description,
            price: String(product.price),
            compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : undefined,
            imageUrls: product.imageUrls as string[],
            categoryId: product.categoryId,
            stock: String(product.stock),
            sku: product.sku,
          }}
          submitLabel="Save Changes"
          isPending={updateProduct.isPending}
          onSubmit={(data) => {
            updateProduct.mutate({ productId: params.id, data } as Parameters<typeof updateProduct.mutate>[0], {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListSellerProductsQueryKey() });
                toast({ title: "Product updated!" });
                setLocation("/seller/products");
              },
              onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
            });
          }}
        />
      </div>
    </div>
  );
}
