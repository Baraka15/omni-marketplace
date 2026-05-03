import { useLocation } from "wouter";
import { useListSellerOrders, useUpdateOrderStatus, getListSellerOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package } from "lucide-react";

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    processing: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    shipped: "bg-primary/10 text-primary border-primary/30",
    delivered: "bg-green-500/10 text-green-400 border-green-500/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export default function SellerOrdersPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useListSellerOrders();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatus.mutate({ orderId, data: { status: newStatus as "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSellerOrdersQueryKey() });
        toast({ title: `Order status updated to ${newStatus}` });
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/seller/dashboard")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Manage Orders</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center py-24 gap-4 text-muted-foreground">
            <Package className="h-16 w-16 opacity-30" />
            <p className="text-lg">No orders yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Order</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((order) => {
                  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors" data-testid={`seller-order-row-${order.id}`}>
                      <td className="p-4">
                        <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="p-4 text-right font-semibold">${order.total.toFixed(2)}</td>
                      <td className="p-4 text-center"><StatusBadge status={order.status} /></td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          order.paymentStatus === "paid" ? "bg-green-500/10 text-green-400 border-green-500/30" :
                          order.paymentStatus === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {nextStatuses.length > 0 ? (
                          <Select onValueChange={(v) => handleStatusUpdate(order.id, v)}>
                            <SelectTrigger className="w-36 h-8 text-xs" data-testid={`select-status-${order.id}`}>
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {nextStatuses.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
