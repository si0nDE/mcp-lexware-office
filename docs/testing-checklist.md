# Manual Testing Checklist — v1.0.0

Perform these workflows in Claude Desktop before tagging v1.0.0.
Mark each item ✅ when complete.

## Rechnungskreislauf
- [x] Angebot erstellen (`create-quotation`) → ID notieren
- [x] Angebot abrufen (`get-quotation-details`) → korrekte Daten?
- [x] Auftragsbestätigung erstellen (`create-order-confirmation`) → ID notieren
- [x] Rechnung erstellen und finalisieren (`finalize-invoice`) → ID notieren
- [x] Mahnung für die Rechnung erstellen (`finalize-dunning`) → ID notieren
- [x] Mahnung abrufen (`get-dunning-details`) → korrekte Daten?
- [x] Mahnungs-PDF herunterladen (`get-document-file`, docType=dunnings) → PDF korrekt?
- [x] Rechnungs-PDF herunterladen (`get-document-file`, docType=invoices) → PDF korrekt?

## Kontaktverwaltung
- [x] Kontakt anlegen (`create-contact`, Name: "[TEST] Manuelle Abnahme")
- [x] Kontaktliste abrufen (`get-contacts`, name="[TEST]") → Kontakt vorhanden?
- [x] Kontakt per ID abrufen (`get-contact-details`) → Daten vollständig?
- [x] Kontakt aktualisieren (`update-contact`) → Version inkrementiert?

## Belegerfassung
- [x] Buchungskategorien abrufen (`list-posting-categories`) → Liste vollständig?
- [x] Beleg erstellen (`create-voucher`, Beschreibung "[TEST] Manueller Beleg")
- [x] Beleg abrufen (`get-voucher-details`) → Daten korrekt?
- [ ] Datei an Beleg hochladen (`upload-file-to-voucher`) → Erfolg?
- [ ] Datei hochladen (`upload-file`) → File-ID erhalten?

## Event Subscriptions
- [x] Subscription anlegen (`create-event-subscription`, eventType=invoice.created, callbackUrl=https://httpbin.org/post)
- [x] Alle Subscriptions abrufen (`list-event-subscriptions`) → neue Subscription sichtbar?
- [x] Subscription per ID abrufen (`get-event-subscription`) → korrekte Daten?
- [x] Subscription löschen (`delete-event-subscription`) → bestätigt?

## Sonstiges
- [x] Wiederkehrende Vorlagen abrufen (`get-recurring-templates`)
- [x] Zahlungsbedingungen abrufen (`get-payment-conditions`)
- [x] Firmenprofil abrufen (`get-profile`)

## Aufräumen
- [ ] Alle [TEST]-Kontakte archivieren oder dokumentieren
- [ ] Alle [TEST]-Dokumente in Lexware Office als storniert/ungültig markieren soweit möglich

## Erkenntnisse aus der manuellen Abnahme (2026-04-20)

### API-Verhalten: contactId in address-Objekt
Wenn ein Kontakt per `contactId` im `address`-Objekt referenziert wird, erwartet die
Lexoffice-API, dass der Kontakt **eine gespeicherte Rechnungsadresse** besitzt. Fehlt diese,
antwortet die API mit HTTP 406. Workaround: Adresse inline im `address`-Objekt übergeben
(ohne `contactId`), oder dem Kontakt vor Dokumenterstellung eine Adresse zuweisen.

### API-Verhalten: voucherStatus bei Dunnings
Dunnings zeigen in der Lexoffice-API immer `voucherStatus: "draft"`, unabhängig davon,
ob `finalize=true` übergeben wurde. Das PDF wird trotzdem sofort generiert. Dies ist
dokumentiertes API-Verhalten von Lexoffice, kein Bug. Tool-Descriptions entsprechend
angepasst (2026-04-20).

### API-Verhalten: netAmount als String
Das Feld `unitPrice.netAmount` in LineItems muss als **String** übergeben werden (z.B.
`"95.00"`), nicht als Zahl. Die MCP-Tool-Schemas geben dies korrekt an.
