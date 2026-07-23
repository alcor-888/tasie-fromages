import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, activateAccount } from "@/lib/clients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: ActivationGate,
});

function ActivationGate() {
  const fetchProfile = useServerFn(getMyProfile);
  const activate = useServerFn(activateAccount);
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>;
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-destructive">
        {(error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  if (data.isAdmin || data.activated) return <Outlet />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await activate({ data: { key } });
      toast.success("Compte activé — bienvenue !");
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="flex items-center justify-center gap-2 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-2 text-center font-display text-2xl font-semibold">Activation de votre compte</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Saisissez la clé d'activation communiquée par Rodolphe Bardet.
          {data.hasProfile ? "" : " Aucune fiche client n'est encore associée à votre compte — contactez Rodolphe."}
        </p>

        {data.hasProfile && (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="key">Clé d'activation</Label>
              <Input id="key" required autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="TF-XXXXXX" />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "…" : "Activer mon compte"}</Button>
          </form>
        )}

        <button
          onClick={signOut}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3 w-3" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
