import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCw, Github } from "lucide-react";
import { listOrders, setOrderStatus } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminImport } from "@/components/admin-import";
import { AdminPassword } from "@/components/admin-password";
import { AdminClients } from "@/components/admin-clients";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Bons de commande — Admin" }] }),
  component: AdminPage,
});

const STATUSES = [
  { value: "new", label: "Nouvelle" },
  { value: "confirmed", label: "Confirmée" },
  { value: "ready", label: "Prête" },
  { value: "done", label: "Retirée" },
  { value: "cancelled", label: "Annulée" },
] as const;

function statusColor(s: string) {
  switch (s) {
    case "new": return "bg-accent text-accent-foreground";
    case "confirmed": return "bg-primary text-primary-foreground";
    case "ready": return "bg-primary/80 text-primary-foreground";
    case "done": return "bg-muted text-muted-foreground";
    case "cancelled": return "bg-destructive text-destructive-foreground";
    default: return "";
  }
}

function AdminPage() {
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(setOrderStatus);
  const qc = useQueryClient();
  const [githubOpen, setGithubOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: typeof STATUSES[number]["value"] }) => updateStatus({ data: v }),
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold">La Cave</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin</span>
          </Link>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setGithubOpen(true)} className="gap-2">
              <Github className="h-4 w-4" /> GitHub
            </Button>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-4xl font-semibold">Back office</h1>
        <p className="mt-2 text-sm text-muted-foreground">Commandes et gestion des listes produits.</p>

        <Tabs defaultValue="orders" className="mt-8">
          <TabsList>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="import">Import produits</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="password">Mot de passe</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
        {isLoading && <p className="mt-10 text-muted-foreground">Chargement…</p>}
        {error && <p className="mt-10 text-destructive">{(error as Error).message}</p>}

        {data && data.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            Aucune commande pour le moment.
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {data?.map((o) => (
            <article key={o.id} className="rounded-lg border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">{o.customer_name}</h2>
                    <Badge className={statusColor(o.status)}>
                      {STATUSES.find((s) => s.value === o.status)?.label ?? o.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {o.customer_phone}{o.customer_email ? ` · ${o.customer_email}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reçue le {new Date(o.created_at).toLocaleString("fr-FR")} · Retrait souhaité le {o.pickup_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold">{Number(o.total_estimate).toFixed(2)} €</span>
                  <Select
                    value={o.status}
                    onValueChange={(v) => mutation.mutate({ id: o.id, status: v as typeof STATUSES[number]["value"] })}
                  >
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {o.notes && (
                <p className="mt-3 rounded bg-secondary/50 p-3 text-sm italic">« {o.notes} »</p>
              )}

              <ul className="mt-4 divide-y divide-border border-y border-border">
                {o.order_items?.map((i, idx: number) => (
                  <li key={idx} className="flex items-center justify-between py-2 text-sm">
                    <span>{i.cheese_name}</span>
                    <span className="text-muted-foreground">{i.quantity} {i.unit_label ?? ""}</span>
                    <span className="font-medium">{Number(i.line_total).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <AdminImport />
          </TabsContent>
          <TabsContent value="clients" className="mt-6">
            <AdminClients />
          </TabsContent>
          <TabsContent value="password" className="mt-6">
            <AdminPassword />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
