import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { activateWithKey } from "@/lib/clients.functions";
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
  const [mode, setMode] = useState<"login" | "first">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const activate = useServerFn(activateWithKey);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "first") {
        if (password !== confirm) throw new Error("Les deux mots de passe ne sont pas identiques.");
        await activate({ data: { email, key, password } });
        toast.success("Compte activé — vous êtes connecté.");
      }
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
          {mode === "login"
            ? "Connectez-vous avec votre email et votre mot de passe."
            : "Saisissez votre email et la clé d'activation reçue de Tasie Fromages, puis choisissez votre mot de passe."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-md bg-secondary/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded px-3 py-2 transition ${mode === "login" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => setMode("first")}
            className={`rounded px-3 py-2 transition ${mode === "first" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            Première connexion
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode === "first" && (
            <div className="grid gap-2">
              <Label htmlFor="key">Clé d'activation</Label>
              <Input id="key" required value={key} onChange={(e) => setKey(e.target.value)} placeholder="TF-XXXXXX" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="password">{mode === "first" ? "Choisissez votre mot de passe" : "Mot de passe"}</Label>
            <Input id="password" type="password" required minLength={mode === "first" ? 8 : 6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === "first" && (
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirmez le mot de passe</Label>
              <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "…" : mode === "first" ? "Activer et entrer" : "Se connecter"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login"
            ? "Première visite ou mot de passe oublié ? Utilisez « Première connexion » avec votre clé d'activation."
            : "Pas de clé d'activation ? Contactez Rodolphe Bardet."}
        </p>
      </div>
    </div>
  );
}
