import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListRfqs,
  useGetRfq,
  useCreateRfq,
  useSubmitRfqQuote,
  useAcceptRfqQuote,
  useListProducts,
  getListRfqsQueryKey,
  getGetRfqQueryKey,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, ChevronRight, ArrowLeft, Building2, Package } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  quoted: { label: "Quoted", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  accepted: { label: "Accepted", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/30" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground border-border" },
};

function RfqBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function RfqListPage() {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const { data: rfqs, isLoading } = useListRfqs();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Sign in to manage RFQs</p>
          <Button onClick={() => setLocation("/sign-in")}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Request for Quotation</h1>
            <p className="text-sm text-muted-foreground mt-1">B2B bulk order requests and quotes</p>
          </div>
          <Button onClick={() => setLocation("/rfq/new")}>
            <Plus className="h-4 w-4 mr-2" /> New RFQ
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : !rfqs?.length ? (
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-lg font-semibold text-muted-foreground">No RFQs yet</p>
            <p className="text-sm text-muted-foreground">Create an RFQ to request bulk pricing from sellers</p>
            <Button onClick={() => setLocation("/rfq/new")}>Create RFQ</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rfqs.map((rfq) => (
              <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
                <div className="group flex items-center gap-5 p-5 rounded-lg bg-card border border-border hover:border-primary/40 transition-all cursor-pointer" data-testid={`rfq-card-${rfq.id}`}>
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium truncate">{rfq.productName}</span>
                      <RfqBadge status={rfq.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rfq.buyerCompany} &middot; Qty: {rfq.quantity.toLocaleString()}
                      {rfq.targetPrice && ` &middot; Target: $${rfq.targetPrice}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rfq.quotedPrice && (
                      <span className="font-semibold text-primary">${Number(rfq.quotedPrice).toFixed(2)}/unit</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
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

export function NewRfqPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRfq = useCreateRfq();
  const { data: productsData } = useListProducts();

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    description: "",
    targetPrice: "",
    buyerCompany: "",
    deliveryDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.quantity || !form.description || !form.buyerCompany) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createRfq.mutate({
      data: {
        productId: form.productId,
        quantity: parseInt(form.quantity),
        description: form.description,
        targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : null,
        buyerCompany: form.buyerCompany,
        deliveryDate: form.deliveryDate || null,
      },
    }, {
      onSuccess: (rfq) => {
        queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
        toast({ title: "RFQ submitted successfully" });
        setLocation(`/rfq/${rfq.id}`);
      },
      onError: () => toast({ title: "Failed to submit RFQ", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/rfq")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to RFQs
        </Button>
        <h1 className="text-2xl font-bold mb-6">New Request for Quotation</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-lg p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product *</label>
            <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
              <SelectTrigger data-testid="select-product"><SelectValue placeholder="Select a product" /></SelectTrigger>
              <SelectContent>
                {productsData?.items?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                data-testid="input-quantity"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Price/unit ($)</label>
              <Input
                type="number"
                placeholder="Optional"
                value={form.targetPrice}
                onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
                data-testid="input-target-price"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name *</label>
            <Input
              placeholder="Your company or organization"
              value={form.buyerCompany}
              onChange={(e) => setForm((f) => ({ ...f, buyerCompany: e.target.value }))}
              data-testid="input-company"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              placeholder="Describe your requirements, specifications, or any special needs..."
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              data-testid="textarea-description"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Required Delivery Date</label>
            <Input
              type="date"
              value={form.deliveryDate}
              onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
              data-testid="input-delivery-date"
            />
          </div>

          <Button type="submit" className="w-full" disabled={createRfq.isPending} data-testid="button-submit-rfq">
            {createRfq.isPending ? "Submitting..." : "Submit RFQ"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function RfqDetailPage({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rfq, isLoading } = useGetRfq(params.id, {
    query: { enabled: !!params.id, queryKey: getGetRfqQueryKey(params.id) },
  });
  const submitQuote = useSubmitRfqQuote();
  const acceptQuote = useAcceptRfqQuote();

  const [quoteForm, setQuoteForm] = useState({ price: "", note: "", validUntil: "" });
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const handleAccept = () => {
    acceptQuote.mutate({ rfqId: params.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRfqQueryKey(params.id) });
        toast({ title: "Quote accepted!" });
      },
      onError: () => toast({ title: "Failed to accept quote", variant: "destructive" }),
    });
  };

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuote.mutate({
      rfqId: params.id,
      data: { quotedPrice: parseFloat(quoteForm.price), quotedNote: quoteForm.note, validUntil: quoteForm.validUntil },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRfqQueryKey(params.id) });
        toast({ title: "Quote submitted!" });
        setShowQuoteForm(false);
      },
      onError: () => toast({ title: "Failed to submit quote", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/rfq")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to RFQs
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !rfq ? (
          <p className="text-muted-foreground">RFQ not found</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{rfq.productName}</h1>
                  <RfqBadge status={rfq.status} />
                </div>
                <p className="text-sm text-muted-foreground">{rfq.buyerCompany} &middot; {new Date(rfq.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</p>
                  <p className="font-semibold mt-1">{rfq.quantity.toLocaleString()} units</p>
                </div>
                {rfq.targetPrice && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Target Price</p>
                    <p className="font-semibold mt-1">${Number(rfq.targetPrice).toFixed(2)}/unit</p>
                  </div>
                )}
                {rfq.quotedPrice && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Quoted Price</p>
                    <p className="font-semibold mt-1 text-primary">${Number(rfq.quotedPrice).toFixed(2)}/unit</p>
                  </div>
                )}
                {rfq.validUntil && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Valid Until</p>
                    <p className="font-semibold mt-1">{new Date(rfq.validUntil).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Requirements</p>
                <p className="text-sm">{rfq.description}</p>
              </div>
              {rfq.quotedNote && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Seller Note</p>
                  <p className="text-sm">{rfq.quotedNote}</p>
                </div>
              )}
            </div>

            {rfq.status === "quoted" && (
              <div className="flex gap-3">
                <Button onClick={handleAccept} disabled={acceptQuote.isPending} data-testid="button-accept-quote">
                  {acceptQuote.isPending ? "Accepting..." : "Accept Quote"}
                </Button>
              </div>
            )}

            {rfq.status === "pending" && (
              <div>
                {!showQuoteForm ? (
                  <Button variant="outline" onClick={() => setShowQuoteForm(true)} data-testid="button-submit-quote">
                    Submit Quote (Seller)
                  </Button>
                ) : (
                  <form onSubmit={handleSubmitQuote} className="space-y-4 bg-card border border-border rounded-lg p-5">
                    <h3 className="font-semibold">Submit Quote</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Price per unit ($) *</label>
                        <Input type="number" step="0.01" value={quoteForm.price} onChange={(e) => setQuoteForm((f) => ({ ...f, price: e.target.value }))} data-testid="input-quote-price" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Valid Until *</label>
                        <Input type="date" value={quoteForm.validUntil} onChange={(e) => setQuoteForm((f) => ({ ...f, validUntil: e.target.value }))} data-testid="input-quote-valid-until" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Note</label>
                      <Textarea rows={3} value={quoteForm.note} onChange={(e) => setQuoteForm((f) => ({ ...f, note: e.target.value }))} placeholder="Terms, conditions, delivery info..." data-testid="textarea-quote-note" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={submitQuote.isPending} data-testid="button-confirm-quote">{submitQuote.isPending ? "Submitting..." : "Submit Quote"}</Button>
                      <Button type="button" variant="ghost" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
