import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-store";
import { placeOrder } from "@/lib/orders.functions";

type OrderPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupDate: string;
  notes?: string;
  items: {
    cheeseId: string;
    cheeseName: string;
    unitPrice: number;
    unitLabel?: string;
    quantity: number;
  }[];
};
import { toast } from "sonner";

export function CartAccessButton() {
  const { count, total, open, setOpen } = useCart();

  if (open) return null;

  return (
    <Button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed bottom-4 right-4 z-50 h-14 gap-3 rounded-full px-5 shadow-[var(--shadow-elegant)] sm:bottom-6 sm:right-6"
      aria-label={`Ouvrir le panier${count > 0 ? `, ${count} article${count > 1 ? "s" : ""}` : ""}`}
    >
      <span className="relative inline-flex">
        <ShoppingBag className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
            {count}
          </span>
        )}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-sm font-medium">Panier</span>
        {count > 0 && <span className="text-xs opacity-80">{total.toFixed(2)}€</span>}
      </span>
    </Button>
  );
}

export function OrderSheet() {
  const { items, open, setOpen, setQty, remove, total, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [form, setForm] = useState({ name: "", phone: "", email: "", pickup: "", notes: "" });
  const placeOrderFn = useServerFn(placeOrder);
  const mutation = useMutation({
    mutationFn: (payload: OrderPayload) => placeOrderFn({ data: payload }),
    onSuccess: () => {
      toast.success("Bon de commande envoyé — nous vous rappelons rapidement.");
      setStep("done");
      setTimeout(() => { clear(); setStep("cart"); setOpen(false); setForm({ name: "", phone: "", email: "", pickup: "", notes: "" }); }, 3000);
    },
    onError: (e: Error) => toast.error(e.message || "Envoi impossible, réessayez."),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    mutation.mutate({
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email || undefined,
      pickupDate: form.pickup,
      notes: form.notes || undefined,
      items: items.map((i) => ({
        cheeseId: i.cheese.id,
        cheeseName: i.cheese.name,
        unitPrice: i.cheese.pricePerKg,
        unitLabel: i.cheese.unit,
        quantity: i.quantity,
      })),
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {step === "done" ? "Merci !" : step === "form" ? "Vos coordonnées" : "Votre commande"}
          </SheetTitle>
          <SheetDescription>
            {step === "done"
              ? "Votre demande a bien été transmise."
              : "Réservez vos fromages — règlement et retrait en boutique."}
          </SheetDescription>
        </SheetHeader>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-1">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Votre panier est vide.</p>
                </div>
              ) : (
                <ul className="space-y-3 py-2">
                  {items.map((i) => (
                    <li key={i.cheese.id} className="flex gap-3 rounded-md border border-border bg-card p-3">
                      <div className="flex h-16 w-16 flex-none items-center justify-center rounded bg-[var(--gradient-warm)] text-3xl">
                        {i.cheese.emoji}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <p className="font-medium leading-tight">{i.cheese.name}</p>
                          <button onClick={() => remove(i.cheese.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{i.cheese.pricePerKg}€ {i.cheese.unit}</p>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.cheese.id, i.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{i.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.cheese.id, i.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-display text-sm font-semibold">{(i.quantity * i.cheese.pricePerKg).toFixed(2)}€</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <SheetFooter className="flex-col gap-3 border-t pt-4 sm:flex-col">
                <div className="flex w-full items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Estimation totale</span>
                  <span className="font-display text-2xl font-semibold">{total.toFixed(2)}€</span>
                </div>
                <Button className="w-full" size="lg" onClick={() => setStep("form")}>
                  Continuer la commande
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Aucun paiement en ligne — règlement à la boutique.
                </p>
              </SheetFooter>
            )}
          </>
        )}

        {step === "form" && (
          <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pickup">Date de retrait souhaitée</Label>
              <Input id="pickup" type="date" required value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (allergies, préférences…)</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total estimé</span>
                <span className="font-display text-xl font-semibold">{total.toFixed(2)}€</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep("cart")}>Retour</Button>
                <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                  {mutation.isPending ? "Envoi…" : "Envoyer la commande"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-8 w-8" />
            </div>
            <p className="text-muted-foreground">Nous vous contactons sous 24h pour confirmer.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}