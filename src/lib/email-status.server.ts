import { EmailAPIError, listEmailLogs } from "@lovable.dev/email-js";

export const ADMIN_NOTIFICATION_EMAILS = [
  "alaincorrente@gmail.com",
  "bardet.rodolphe@gmail.com",
];

export const SENDER_DOMAIN = "notify.tasie-fromages.fr";

export interface EmailStatusEvent {
  timestamp: string;
  recipient: string;
  eventType: string;
  status: string | null;
}

export interface EmailStatusResult {
  ok: boolean;
  checkedAt: string;
  senderDomain: string;
  admins: string[];
  events: EmailStatusEvent[];
  historyStartsAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

export async function readEmailStatus(): Promise<EmailStatusResult> {
  const checkedAt = new Date().toISOString();
  const base = {
    checkedAt,
    senderDomain: SENDER_DOMAIN,
    admins: ADMIN_NOTIFICATION_EMAILS,
  };
  try {
    const res = await listEmailLogs({ limit: 40 }, { apiKey: apiKey() });
    return {
      ...base,
      ok: true,
      events: res.data.map((e) => ({
        timestamp: e.timestamp,
        recipient: e.recipient,
        eventType: e.event_type,
        status: e.status ?? null,
      })),
      historyStartsAt: res.history_starts_at ?? null,
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ...base,
      ok: false,
      events: [],
      historyStartsAt: null,
      errorCode: error instanceof EmailAPIError ? error.code ?? null : null,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface TestSendResult {
  recipient: string;
  sent: boolean;
  at: string;
  code: string | null;
  message: string | null;
}

export async function runNotificationTest(): Promise<TestSendResult[]> {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const stamp = new Date().toISOString();
  const results: TestSendResult[] = [];
  for (const admin of ADMIN_NOTIFICATION_EMAILS) {
    try {
      const r = await sendTemplateEmail("order-notification", admin, {
        templateData: {
          orderRef: "TEST-DIAGNOSTIC",
          emittedAt: new Date().toLocaleString("fr-FR"),
          customerName: "Test diagnostic",
          customerPhone: "—",
          customerEmail: null,
          notes: "Email de test envoyé depuis le back office.",
          totalEstimate: 0,
          items: [{ name: "Test", quantity: 1, unitLabel: "pièce", lineTotal: 0 }],
        },
        idempotencyKey: `diagnostic-${stamp}-${admin}`,
      });
      results.push({
        recipient: admin,
        sent: r.sent,
        at: new Date().toISOString(),
        code: r.sent ? null : r.reason,
        message: r.sent ? null : "Destinataire bloqué (désabonnement/rebond).",
      });
    } catch (error) {
      results.push({
        recipient: admin,
        sent: false,
        at: new Date().toISOString(),
        code: error instanceof EmailAPIError ? error.code ?? null : null,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

export interface DnsRecordCheck {
  type: "TXT" | "NS";
  host: string;
  expected: string;
  found: boolean;
  observed: string[];
}

export interface DnsStatusResult {
  checkedAt: string;
  verified: boolean;
  records: DnsRecordCheck[];
  error: string | null;
}

const EXPECTED_DNS: { type: "TXT" | "NS"; host: string; expected: string }[] = [
  {
    type: "TXT",
    host: "_lovable-email.tasie-fromages.fr",
    expected:
      "lovable_email_verify=b53ac29a177cc18a863423c13caa9dbd647ea39d52ca168fa2fa3b4ab8381865",
  },
  { type: "NS", host: SENDER_DOMAIN, expected: "ns3.lovable.cloud" },
  { type: "NS", host: SENDER_DOMAIN, expected: "ns4.lovable.cloud" },
];

async function resolve(host: string, type: string): Promise<string[]> {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  );
  if (!res.ok) throw new Error(`Résolution DNS impossible (${res.status})`);
  const json = (await res.json()) as { Answer?: { data: string }[] };
  return (json.Answer ?? []).map((a) =>
    a.data.replace(/^"|"$/g, "").replace(/\.$/, "").toLowerCase(),
  );
}

export async function readDnsStatus(): Promise<DnsStatusResult> {
  const checkedAt = new Date().toISOString();
  try {
    const cache = new Map<string, string[]>();
    const records: DnsRecordCheck[] = [];
    for (const r of EXPECTED_DNS) {
      const key = `${r.host}|${r.type}`;
      if (!cache.has(key)) cache.set(key, await resolve(r.host, r.type));
      const observed = cache.get(key)!;
      records.push({
        ...r,
        observed,
        found: observed.some((v) => v === r.expected.toLowerCase()),
      });
    }
    return {
      checkedAt,
      verified: records.every((r) => r.found),
      records,
      error: null,
    };
  } catch (error) {
    return {
      checkedAt,
      verified: false,
      records: EXPECTED_DNS.map((r) => ({ ...r, found: false, observed: [] })),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
