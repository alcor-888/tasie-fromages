import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoSeal from "@/assets/logo-seal.png.asset.json";


export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion — Tasie Fromages" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-4 flex justify-center">
          <img src={logoSeal.url} alt="Tasie Fromages" className="h-32 w-auto" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-center">Espace privé pour les professionnel</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Connectez-vous avec les identifiants fournis par Tasie Fromages.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "…" : "Se connecter"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pas encore de compte ? Contactez Rodolphe Bardet pour recevoir vos identifiants.
        </p>
      </div>
    </div>
  );
}
