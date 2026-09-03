import { afterEach, describe, expect, it, vi } from "vitest";
import { ORDER_EMAIL_CONFIG, sendBrevoOrderEmail } from "@/lib/orders.server";

describe("configuration d’envoi des bons de commande", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("conserve la configuration Brevo validée le 30 août 2026", async () => {
    vi.stubEnv("BREVO_API_KEY", "connection-key");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-key");
    const request = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));

    await sendBrevoOrderEmail(
      {
        subject: "Bon de commande BC-TEST",
        html: "<p>Commande</p>",
        replyTo: "client@example.com",
        attachments: [{ filename: "bon-de-commande-BC-TEST.pdf", content: "cGRm" }],
      },
      request,
    );

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "https://connector-gateway.lovable.dev/brevo/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer lovable-key",
          "X-Connection-Api-Key": "connection-key",
        }),
      }),
    );
    const options = request.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(options.body));
    expect(body.sender).toEqual({ name: "Tasie Fromages", email: "bardet.rodolphe@gmail.com" });
    expect(body.to).toEqual([
      { email: "alaincorrente@gmail.com" },
      { email: "bardet.rodolphe@gmail.com" },
    ]);
    expect(body.attachment).toEqual([
      { name: "bon-de-commande-BC-TEST.pdf", content: "cGRm" },
    ]);
  });

  it("verrouille les constantes d’envoi (URL, expéditeur, destinataires)", () => {
    expect(ORDER_EMAIL_CONFIG.gatewayUrl).toBe(
      "https://connector-gateway.lovable.dev/brevo/smtp/email",
    );
    expect(ORDER_EMAIL_CONFIG.sender).toEqual({
      name: "Tasie Fromages",
      email: "bardet.rodolphe@gmail.com",
    });
    expect([...ORDER_EMAIL_CONFIG.recipients]).toEqual([
      "alaincorrente@gmail.com",
      "bardet.rodolphe@gmail.com",
    ]);
    expect(Object.isFrozen(ORDER_EMAIL_CONFIG)).toBe(true);
    expect(Object.isFrozen(ORDER_EMAIL_CONFIG.sender)).toBe(true);
    expect(Object.isFrozen(ORDER_EMAIL_CONFIG.recipients)).toBe(true);
  });

  it("remonte un refus Brevo au lieu de déclarer l’envoi réussi", async () => {
    vi.stubEnv("BREVO_API_KEY", "connection-key");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-key");
    const request = vi.fn().mockResolvedValue(
      new Response("unrecognised IP address", { status: 401 }),
    );

    await expect(
      sendBrevoOrderEmail({ subject: "Test", html: "<p>Test</p>" }, request),
    ).rejects.toThrow("Brevo a refusé l’envoi (401)");
  });
});