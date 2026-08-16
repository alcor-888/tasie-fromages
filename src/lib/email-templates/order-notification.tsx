import * as React from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface OrderNotificationProps {
  orderRef?: string;
  emittedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  customerCompany?: string | null;
  customerAddress?: string | null;
  customerWebsite?: string | null;
  notes?: string | null;
  totalEstimate?: number;
  items?: { name: string; quantity: number; unitLabel?: string; lineTotal: number }[];
}

export function OrderNotification({
  orderRef = "BC-0000-00000",
  emittedAt = "",
  customerName = "Client",
  customerPhone = "",
  customerEmail = null,
  customerCompany = null,
  customerAddress = null,
  customerWebsite = null,
  notes = null,
  totalEstimate = 0,
  items = [],
}: OrderNotificationProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{`Bon de commande n° ${orderRef} — ${customerName}`}</Preview>
      <Body style={{ backgroundColor: "#f6f4ef", fontFamily: "system-ui, sans-serif", color: "#221f1c" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", maxWidth: "620px" }}>
          <Heading style={{ fontFamily: "Georgia, serif", color: "#5c3d1e", margin: "0 0 4px" }}>
            Nouveau bon de commande
          </Heading>
          <Text style={{ margin: "0 0 2px", fontWeight: "bold" }}>N° {orderRef}</Text>
          <Text style={{ margin: "0 0 16px", color: "#6b6560" }}>Émis le {emittedAt}</Text>
          <Hr />
          <Text style={{ margin: "12px 0 4px", fontWeight: "bold" }}>{customerName}</Text>
          {customerCompany ? <Text style={{ margin: "0 0 2px" }}>{customerCompany}</Text> : null}
          <Text style={{ margin: "0 0 2px" }}>Tél. : {customerPhone}</Text>
          {customerEmail ? <Text style={{ margin: "0 0 2px" }}>Email : {customerEmail}</Text> : null}
          {customerWebsite ? <Text style={{ margin: "0 0 2px" }}>Site : {customerWebsite}</Text> : null}
          {customerAddress ? (
            <Text style={{ margin: "0 0 2px", whiteSpace: "pre-line" }}>
              Adresse de livraison : {customerAddress}
            </Text>
          ) : null}
          {notes ? <Text style={{ margin: "8px 0", fontStyle: "italic" }}>Notes : {notes}</Text> : null}
          <Section style={{ marginTop: "16px" }}>
            <Row style={{ backgroundColor: "#f6f4ef" }}>
              <Column style={{ padding: "8px" }}>Produit</Column>
              <Column style={{ padding: "8px", textAlign: "center" }}>Quantité</Column>
              <Column style={{ padding: "8px", textAlign: "right" }}>Total</Column>
            </Row>
            {items.map((item, idx) => (
              <Row key={idx} style={{ borderBottom: "1px solid #eeeae2" }}>
                <Column style={{ padding: "6px 8px" }}>{item.name}</Column>
                <Column style={{ padding: "6px 8px", textAlign: "center" }}>
                  {item.quantity} {item.unitLabel ?? ""}
                </Column>
                <Column style={{ padding: "6px 8px", textAlign: "right" }}>
                  {item.lineTotal.toFixed(2)} €
                </Column>
              </Row>
            ))}
          </Section>
          <Text style={{ textAlign: "right", fontSize: "18px", fontWeight: "bold", marginTop: "12px" }}>
            Estimation : {totalEstimate.toFixed(2)} €
          </Text>
          <Hr />
          <Text style={{ fontSize: "12px", color: "#6b6560" }}>
            La Cave Tasie Fromages — bon de commande envoyé automatiquement depuis l'application.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: OrderNotification,
  displayName: "Bon de commande (admin)",
  subject: (data: Record<string, any>) =>
    `Bon de commande n° ${data.orderRef ?? ""} — ${data.customerName ?? ""} (${Number(
      data.totalEstimate ?? 0,
    ).toFixed(2)}€)`,
  previewData: {
    orderRef: "BC-2026-00042",
    emittedAt: "16 août 2026 à 09:15",
    customerName: "Restaurant Le Comptoir",
    customerPhone: "06 12 34 56 78",
    customerEmail: "contact@lecomptoir.fr",
    customerCompany: "Le Comptoir SARL",
    totalEstimate: 184.5,
    items: [
      { name: "Comté 24 mois", quantity: 2, unitLabel: "kg", lineTotal: 62 },
      { name: "Brocciu frais", quantity: 6, unitLabel: "pce", lineTotal: 42.5 },
    ],
  },
} satisfies TemplateEntry;