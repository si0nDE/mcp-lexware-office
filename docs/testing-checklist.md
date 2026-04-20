# Manual Testing Checklist — v1.0.0

Perform these workflows in Claude Desktop before tagging v1.0.0.
Mark each item ✅ when complete.

## Rechnungskreislauf
- [ ] Angebot erstellen (`create-quotation`) → ID notieren
- [ ] Angebot abrufen (`get-quotation-details`) → korrekte Daten?
- [ ] Auftragsbestätigung erstellen (`create-order-confirmation`) → ID notieren
- [ ] Rechnung erstellen und finalisieren (`finalize-invoice`) → ID notieren
- [ ] Mahnung für die Rechnung erstellen (`finalize-dunning`) → ID notieren
- [ ] Mahnung abrufen (`get-dunning-details`) → korrekte Daten?
- [ ] Mahnungs-PDF herunterladen (`get-document-file`, docType=dunnings) → PDF korrekt?
- [ ] Rechnungs-PDF herunterladen (`get-document-file`, docType=invoices) → PDF korrekt?

## Kontaktverwaltung
- [ ] Kontakt anlegen (`create-contact`, Name: "[TEST] Manuelle Abnahme")
- [ ] Kontaktliste abrufen (`get-contacts`, name="[TEST]") → Kontakt vorhanden?
- [ ] Kontakt per ID abrufen (`get-contact-details`) → Daten vollständig?
- [ ] Kontakt aktualisieren (`update-contact`) → Version inkrementiert?

## Belegerfassung
- [ ] Buchungskategorien abrufen (`list-posting-categories`) → Liste vollständig?
- [ ] Beleg erstellen (`create-voucher`, Beschreibung "[TEST] Manueller Beleg")
- [ ] Beleg abrufen (`get-voucher-details`) → Daten korrekt?
- [ ] Datei an Beleg hochladen (`upload-file-to-voucher`) → Erfolg?
- [ ] Datei hochladen (`upload-file`) → File-ID erhalten?

## Event Subscriptions
- [ ] Subscription anlegen (`create-event-subscription`, eventType=invoice.created, callbackUrl=https://httpbin.org/post)
- [ ] Alle Subscriptions abrufen (`list-event-subscriptions`) → neue Subscription sichtbar?
- [ ] Subscription per ID abrufen (`get-event-subscription`) → korrekte Daten?
- [ ] Subscription löschen (`delete-event-subscription`) → bestätigt?

## Sonstiges
- [ ] Wiederkehrende Vorlagen abrufen (`get-recurring-templates`)
- [ ] Zahlungsbedingungen abrufen (`get-payment-conditions`)
- [ ] Firmenprofil abrufen (`get-profile`)

## Aufräumen
- [ ] Alle [TEST]-Kontakte archivieren oder dokumentieren
- [ ] Alle [TEST]-Dokumente in Lexware Office als storniert/ungültig markieren soweit möglich
