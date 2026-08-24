import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { getDnsStatus } from "@/lib/email-status.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR");
}

export function AdminDnsStatus() {
  const fetchDns = useServerFn(getDnsStatus);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["email-dns-status"],
    queryFn: () => fetchDns(),
  });

  const missing = (data?.records ?? []).filter((r) => !r.found);

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value);
    toast.success("Valeur copiée");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">Vérification DNS du domaine d'envoi</h3>
            {data && (
              <Badge variant={data.verified ? "default" : "destructive"}>
                {data.verified ? "Vérifié" : "En attente"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Les bons de commande ne partent qu'une fois ces enregistrements visibles chez votre registrar.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Vérification en cours…</p>}
      {error && <p className="mt-4 text-sm text-destructive">{(error as Error).message}</p>}
      {data?.error && <p className="mt-4 text-sm text-destructive">{data.error}</p>}

      {data && (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            Dernière vérification : {fmt(data.checkedAt)}
            {missing.length > 0 && ` · ${missing.length} enregistrement(s) manquant(s)`}
          </p>

          <ul className="mt-3 space-y-2">
            {data.records.map((r, i) => (
              <li
                key={i}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {r.found ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <Badge variant="outline">{r.type}</Badge>
                  <code className="break-all text-xs">{r.host}</code>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded bg-secondary/60 px-2 py-1 text-xs">
                    {r.expected}
                  </code>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => copy(r.expected)}>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-xs">Copier</span>
                  </Button>
                </div>
                {!r.found && r.observed.length > 0 && (
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    Valeurs actuellement publiées : {r.observed.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {!data.verified && (
            <p className="mt-4 text-xs text-muted-foreground">
              Ajoutez les enregistrements manquants chez votre registrar : la propagation peut prendre
              jusqu'à 72 h (souvent quelques minutes).
            </p>
          )}
        </>
      )}
    </div>
  );
}
