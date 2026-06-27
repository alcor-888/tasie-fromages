import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdminPassword() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères.");
    if (pwd !== confirm) return toast.error("Les deux mots de passe ne correspondent pas.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe modifié.");
    setPwd(""); setConfirm("");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Changer mon mot de passe</h2>
        <p className="mt-1 text-sm text-muted-foreground">Modification appliquée immédiatement à votre compte connecté.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
        <Input id="new-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" minLength={6} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pwd">Confirmer le mot de passe</Label>
        <Input id="confirm-pwd" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Mettre à jour"}</Button>
    </form>
  );
}