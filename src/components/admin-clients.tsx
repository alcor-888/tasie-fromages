import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Trash2, UserPlus, Upload, Save, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import {
  listClients,
  createClient,
  deleteClient,
  updateClientProfile,
  bulkImportClients,
} from "@/lib/clients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ProfileForm = {
  firstName: string; lastName: string; company: string;
  deliveryAddress: string; phone: string; website: string;
};
const EMPTY_PROFILE: ProfileForm = {
  firstName: "", lastName: "", company: "", deliveryAddress: "", phone: "", website: "",
};

function randomKey() {
  return "TF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function AdminClients() {
  const fetchClients = useServerFn(listClients);
  const createFn = useServerFn(createClient);
  const updateFn = useServerFn(updateClientProfile);
  const deleteFn = useServerFn(deleteClient);
  const bulkFn = useServerFn(bulkImportClients);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationKey, setActivationKey] = useState(randomKey());
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);

  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });

  const create = useMutation({
    mutationFn: (v: ProfileForm & { email: string; password: string; activationKey: string }) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Client créé");
      setEmail(""); setPassword(""); setActivationKey(randomKey()); setProfile(EMPTY_PROFILE);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Compte supprimé"); qc.invalidateQueries({ queryKey: ["clients"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [importStatus, setImportStatus] = useState<string>("");

  async function handleExcel(file: File) {
    try {
      setImportStatus("Lecture du fichier…");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
      const mapped = rows
        .map((r) => {
          const g = (keys: string[]) => {
            for (const k of keys) {
              const found = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
              if (found && String(r[found]).trim()) return String(r[found]).trim();
            }
            return "";
          };
          return {
            email: g(["Email", "E-mail", "Mail"]),
            password: g(["MotDePasse", "Mot de passe", "Password"]),
            activationKey: g(["CleActivation", "Clé d'activation", "Clé", "ActivationKey"]) || randomKey(),
            firstName: g(["Prenom", "Prénom", "FirstName"]),
            lastName: g(["Nom", "LastName"]),
            company: g(["Entreprise", "Société", "Company"]),
            deliveryAddress: g(["AdresseLivraison", "Adresse", "Address"]),
            phone: g(["Telephone", "Téléphone", "Phone"]),
            website: g(["SiteWeb", "Site", "Website"]),
          };
        })
        .filter((r) => r.email && r.password);
      if (!mapped.length) { setImportStatus("Aucune ligne valide (email + mot de passe requis)"); return; }
      setImportStatus(`Import de ${mapped.length} client(s)…`);
      const res = await bulkFn({ data: { rows: mapped } });
      setImportStatus(`✓ ${res.created} créé(s), ${res.updated} mis à jour, ${res.failed} en échec`);
      if (res.errors.length) console.error(res.errors);
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Import terminé");
    } catch (e) {
      setImportStatus(`Erreur : ${(e as Error).message}`);
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="grid gap-8">
      {/* Bulk import */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Import Excel de la base clients</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Colonnes attendues : <strong>Email, MotDePasse, CleActivation, Prenom, Nom, Entreprise, AdresseLivraison, Telephone, SiteWeb</strong>.
          Si <em>CleActivation</em> est vide, une clé est générée automatiquement.
        </p>
        <label className="mt-4 inline-block cursor-pointer">
          <input type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcel(f); }} />
          <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Upload className="h-4 w-4" /> Importer un fichier
          </span>
        </label>
        {importStatus && (
          <p className="mt-3 flex items-center gap-2 text-sm">
            {importStatus.startsWith("✓") ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4" />}
            {importStatus}
          </p>
        )}
      </div>

      {/* Manual create */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-xl font-semibold">Créer un compte client à la main</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Transmettez au client : son <strong>email</strong>, son <strong>mot de passe</strong> initial et sa <strong>clé d'activation</strong>.
          À sa première connexion il devra saisir la clé pour débloquer l'accès.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate({ email, password, activationKey, ...profile }); }}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Email" id="c-email"><Input id="c-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Mot de passe"><Input type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Clé d'activation">
            <div className="flex gap-2">
              <Input required value={activationKey} onChange={(e) => setActivationKey(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => setActivationKey(randomKey())}>
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Entreprise"><Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} /></Field>
          <Field label="Prénom"><Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} /></Field>
          <Field label="Nom"><Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
          <Field label="Site web"><Input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Adresse de livraison">
              <Textarea rows={2} value={profile.deliveryAddress} onChange={(e) => setProfile({ ...profile, deliveryAddress: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="gap-2">
              <UserPlus className="h-4 w-4" /> Créer le compte
            </Button>
          </div>
        </form>
      </div>

      {/* Existing accounts */}
      <div>
        <h3 className="font-display text-xl font-semibold">Comptes existants</h3>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>}
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
          {data?.map((u) => (
            <ClientRow key={u.id} user={u} onUpdate={(patch) => updateFn({ data: { userId: u.id, ...patch } }).then(() => { toast.success("Fiche mise à jour"); qc.invalidateQueries({ queryKey: ["clients"] }); }).catch((e) => toast.error(e.message))} onDelete={() => remove.mutate(u.id)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

type ClientUser = {
  id: string; email: string; createdAt: string; roles: string[];
  profile: {
    activation_key: string; activated: boolean;
    first_name: string | null; last_name: string | null; company: string | null;
    delivery_address: string | null; phone: string | null; website: string | null;
  } | null;
};

function ClientRow({ user, onUpdate, onDelete }: {
  user: ClientUser;
  onUpdate: (patch: ProfileForm & { activationKey?: string; resetActivation?: boolean }) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const p = user.profile;
  const [form, setForm] = useState<ProfileForm>({
    firstName: p?.first_name ?? "", lastName: p?.last_name ?? "",
    company: p?.company ?? "", deliveryAddress: p?.delivery_address ?? "",
    phone: p?.phone ?? "", website: p?.website ?? "",
  });
  const [key, setKey] = useState(p?.activation_key ?? "");
  const isAdmin = user.roles.includes("admin");

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? "admin" : (p?.company || "client")} · créé le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {p && (
            <Badge variant={p.activated ? "default" : "outline"}>
              {p.activated ? "Activé" : "En attente d'activation"}
            </Badge>
          )}
          {!isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
              {open ? "Fermer" : "Modifier"}
            </Button>
          )}
          {!isAdmin && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {open && !isAdmin && (
        <div className="mt-4 grid gap-3 rounded-md bg-secondary/30 p-4 sm:grid-cols-2">
          <Field label="Clé d'activation">
            <Input value={key} onChange={(e) => setKey(e.target.value)} />
          </Field>
          <Field label="Entreprise"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Prénom"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Site web"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Adresse de livraison">
              <Textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" className="gap-2" onClick={() => onUpdate({ ...form, activationKey: key })}>
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => onUpdate({ ...form, activationKey: key, resetActivation: true })}>
              Réinitialiser l'activation
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}