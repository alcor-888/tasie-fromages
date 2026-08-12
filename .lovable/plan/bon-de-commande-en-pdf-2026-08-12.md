# Bon de commande en PDF

Objectif : à chaque commande envoyée, générer automatiquement un PDF du bon de commande, l'attacher à l'email envoyé à Rodolphe et Alain, et permettre au client de le télécharger depuis l'application.

## Ce qui change pour l'utilisateur

- Après l'envoi du panier, l'écran de confirmation propose un bouton **Télécharger le bon de commande (PDF)**.
- Les deux administrateurs reçoivent le même email qu'aujourd'hui, avec en pièce jointe `bon-de-commande-<numéro>.pdf`.
- Le PDF reprend : logo/nom Tasie Fromages, numéro et date de commande, coordonnées du client (nom, entreprise, téléphone, email, adresse, site), notes, tableau des produits (désignation, quantité, prix unitaire, total ligne) et l'estimation totale.

## Mise en œuvre technique

1. **Génération PDF** — nouveau module serveur `src/lib/order-pdf.server.ts` utilisant `pdf-lib` (JS pur, compatible avec le runtime serveur). Une fonction `buildOrderPdf(payload)` renvoie les octets du PDF ; police Helvetica, texte accentué nettoyé/encodé correctement (WinAnsi).
2. **Email** — `src/lib/orders.server.ts` appelle `buildOrderPdf` puis ajoute le champ `attachments: [{ filename, content: <base64> }]` à la requête d'envoi existante. Aucun changement de destinataires ni de template HTML.
3. **Téléchargement client** — nouvelle fonction serveur `getOrderPdf` (dans `src/lib/orders.functions.ts`) qui recharge la commande et ses lignes par `id` et renvoie le PDF en base64. `placeOrder` renvoie déjà l'`id` ; `src/components/order-sheet.tsx` le conserve à l'étape « done » et affiche le bouton de téléchargement (conversion base64 → Blob côté navigateur).
4. **Sécurité** — `getOrderPdf` exige un identifiant de commande valide et n'est appelée qu'avec l'id retourné juste après la création ; aucune liste de commandes n'est exposée.
5. **Dépendance** — ajout de `pdf-lib`.

## Hors périmètre

- Pas de modification du design du panier ni du flux de commande existant.
- Pas de stockage du PDF en base : il est régénéré à la demande.
