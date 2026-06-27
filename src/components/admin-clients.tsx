import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { listClients, createClient, deleteClient } from "@/lib/clients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdminClients() {
  const fetchClients = useServerFn(listClients);
  const createFn = useServerFn(createClient);
  const deleteFn = useServerFn(deleteClient);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  const create = useMutation({
    mutationFn: (v: { email: string; password: string }) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Client créé");
      setEmail(""); setPassword("");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Créer un compte client</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Le client pourra se connecter immédiatement avec ces identifiants. Communiquez-les lui en main propre ou par message sécurisé.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate({ email, password }); }}
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="grid gap-2">
            <Label htmlFor="client-email">Email</Label>
            <Input id="client-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-password">Mot de passe initial</Label>
            <Input id="client-password" type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={create.isPending} className="gap-2">
            <UserPlus className="h-4 w-4" /> Créer
          </Button>
        </form>
      </div>

      <div>
        <h3 className="font-display text-xl font-semibold">Comptes existants</h3>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>}
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {data?.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u.roles.length > 0 ? u.roles.join(", ") : "client"} · créé le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              {!u.roles.includes("admin") && (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(u.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}