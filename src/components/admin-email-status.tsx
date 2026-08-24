import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { getEmailStatus, sendTestNotification } from "@/lib/email-status.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR");
}

const ERROR_HINTS: Record<string, string> = {
  domain_not_verified:
    "Le domaine d'envoi n'est pas encore vérifié : ajoutez les enregistrements DNS chez votre registrar, puis relancez le test.",
  emails_disabled: "L'envoi d'emails est désactivé pour ce projet.",
  recipient_suppressed:
    "Ce destinataire est bloqué (désabonnement, rebond ou plainte). Il ne recevra plus de notifications.",
};

const EVENT_LABELS: Record<string, string> = {
  sent: "Envoyé",
  rejected: "Refusé",
  bounced: "Rebond",
  complained: "Plainte",
  unsubscribed: "Désabonné",
  suppressed: "Bloqué",
  rate_limited: "Limité",
};

export function AdminEmailStatus() {
  const fetchStatus = useServerFn(getEmailStatus);
  const runTest = useServerFn(sendTestNotification);
  const [lastTest, setLastTest] = useState<
    { recipient: string; sent: boolean; at: string; code: string | null; message: string | null }[] | null
  >(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["email-status"],
    queryFn: () => fetchStatus(),
  });

  const test = useMutation({
    mutationFn: () => runTest(),
    onSuccess: (res) => {
      setLastTest(res);
      const ok = res.filter((r) => r.sent).length;
      if (ok === res.length) toast.success("Email de test envoyé aux deux administrateurs");
      else toast.error(`Échec pour ${res.length - ok} destinataire(s)`);
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderEvents = (data?.events ?? []).filter((e) =>
    (data?.admins ?? []).includes(e.recipient),
  );
  const lastSent = orderEvents.find((e) => e.eventType === "sent");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Statut des notifications</h2>
          <p className="text-sm text-muted-foreground">
            Diagnostic de l'envoi des bons de commande aux administrateurs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => test.mutate()} disabled={test.isPending} className="gap-2">
            <Send className="h-4 w-4" /> {test.isPending ? "Envoi…" : "Envoyer un test"}
          </Button>
        </div>
      </div>

      <AdminDnsStatus />

      {isLoading && <p className="text-muted-foreground">Chargement…</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Domaine d'envoi</p>
            <p className="mt-1 font-medium">{data.senderDomain}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dernier envoi réussi</p>
            <p className="mt-1 font-medium">{lastSent ? fmt(lastSent.timestamp) : "Aucun"}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dernière vérification</p>
            <p className="mt-1 font-medium">{fmt(data.checkedAt)}</p>
          </div>
        </div>
      )}

      {data && !data.ok && (
        <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              Erreur {data.errorCode ?? "inconnue"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {(data.errorCode && ERROR_HINTS[data.errorCode]) || data.errorMessage}
            </p>
          </div>
        </div>
      )}

      {lastTest && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">Résultat du dernier test</p>
          <ul className="mt-3 space-y-2 text-sm">
            {lastTest.map((r) => (
              <li key={r.recipient} className="flex flex-wrap items-center gap-2">
                {r.sent ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-medium">{r.recipient}</span>
                <span className="text-xs text-muted-foreground">{fmt(r.at)}</span>
                {!r.sent && (
                  <span className="text-xs text-destructive">
                    {r.code ? `${r.code} — ` : ""}
                    {(r.code && ERROR_HINTS[r.code]) || r.message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-sm font-medium">Historique des envois</p>
        {data?.historyStartsAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Historique visible depuis le {fmt(data.historyStartsAt)}.
          </p>
        )}
        {data && data.events.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun événement d'envoi enregistré pour le moment.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {data?.events.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium">{e.recipient}</span>
                <span className="flex items-center gap-2">
                  <Badge variant={e.eventType === "sent" ? "default" : "destructive"}>
                    {EVENT_LABELS[e.eventType] ?? e.eventType}
                  </Badge>
                  {e.status && <span className="text-xs text-muted-foreground">{e.status}</span>}
                  <span className="text-xs text-muted-foreground">{fmt(e.timestamp)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
