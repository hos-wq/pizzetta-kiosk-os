# Pizzetta Kiosk — Piano di sviluppo

0.1 · Architettura → Backend → Frontend → Pilot. Gli ID sotto sono unità di implementazione e accettazione. Nessuna fase è dichiarata consegnata solo perché descritta qui.

## Base e percorsi

Base osservata: il Worker Pizzetta espone health/menu/branches/creazione e lettura ordine; lo schema D1 ha catalogo, filiali, clienti, loyalty, ordini e finestre di preparazione. Il frontend attivo è un prototipo con catalogo locale, filiale e conferma fittizie. Il suo checkout non è una prova che la coda reale funzioni. Prima del pilot rimuovere la lettura ordine senza autorizzazione verificata. Non usare altri Worker, repository, dataset o credenziali per colmare questi vuoti.

| Percorso in D:/PIZZETTA | Responsabilità |
|---|---|
| apps/worker/src/pizzetta-index.ts | Entrata Worker e routing; health e statici |
| apps/worker/src/pizzetta/{auth,catalog,branches,orders,payments,chat,loyalty,jobs}/ | Moduli backend; confini di accesso nel server |
| apps/web/src/pizzetta/{customer,kiosk,staff,shared}/ | Superfici cliente, totem, staff e design system |
| apps/web/public/brand/ | Asset e font approvati |
| db/pizzetta-migrations/ | Migrazioni additive e indici; preservare 0001/0002 già applicate |
| tests/pizzetta/ | Test mirati di dominio, API e integrazione |
| scripts/pizzetta/ | Setup locale ripetibile, seed demo, smoke test, verifica release |
| wrangler.toml | Configurazione canonica Pizzetta; staging separato da produzione |

## Schema target e invarianti

| Dominio | Tabelle / modifiche |
|---|---|
| Identità | customers; customer_identities con UNIQUE(provider, subject); staff_users con Google subject; staff_branch_roles con UNIQUE(staff_id, branch_id); staff_invites; auth_sessions con digest, scope, expiry/revocation; guest access grant limitato all'ordine |
| Sedi | branches; branch_hours e branch_exceptions; branch_operations con pause, wait_minutes e versione; prep_windows con capacità per sede/servizio, finestre UTC e indice per data |
| Catalogo | menu_categories, menu_items, menu_item_variants, branch_menu_items; ingredients, allergens, menu_item_ingredients, menu_item_allergens con verifica/fonte e stato; bundle_groups, bundle_options; promotions, promotion_rules, promotion_redemptions |
| Comanda | orders con branch/customer/guest, service, schedule, SLA, currency, version e idempotency; order_items con snapshot nomi/prezzi; order_item_options e capacità riservata; order_events con cursore e attore. Indici coda per sede/stato/scadenza, storico per cliente/data |
| Pagamento | order_payments, payment_proofs con key privata, size/hash, reference, review, purge_at; account merchant per sede; vincolo anti-riuso sul riferimento verificato; audit e riconciliazione |
| Conversazione | order_messages, ID incrementale per fetch dopo cursore, autore/scope, timestamp, client nonce per deduplica; staff_audit_events per azioni amministrative |
| Loyalty | loyalty_accounts, loyalty_ledger, loyalty_programs/rewards; unicità della fonte dell'accredito/storno, snapshot della regola e saldo riconciliabile |

Prezzi e importi in centavos interi; vincoli CHECK e foreign key dove applicabili. Un articolo vendibile richiede variante quotata e autorizzata nella sede. Tenere le righe storiche e disattivare il catalogo invece di eliminarlo. Per i campi non migrabili additivamente, backfill verificato e cambio in due release. Nessun seed demo su produzione.

## Backend

- **B01 — Baseline e configurazione.** Inventario dei soli entrypoint Pizzetta e del grafo di import; rimuovere dai comandi attivi i riferimenti estranei e isolarli localmente. Unificare la config, verificare Git/D1/Worker dedicati; tracciare i binding e i nomi dei segreti senza valori. Script locali PowerShell compatibili e npm per init, migrazione locale e seed demo. Gate: due esecuzioni consecutive senza effetti collaterali, build da checkout pulito e nessuna credenziale estranea.
- **B02 — Identità e permessi.** Google cliente e Google staff con sessioni distinte; accesso guest per ordine; Meta cliente dietro capability flag, contratto e callback verificati quando configurati. Staff da invito o bootstrap controllato; policy per azione e sede, revoca server-side. API auth start/callback/session/logout. Gate: guest non legge un altro ordine, account cliente non diventa staff, cashier non usa admin o altra filiale. Prima del pilot ruotare il precedente secret sessione la cui generazione ha fallito; verifica senza leggerne il valore.
- **B03 — Catalogo, sedi e quote.** API filiali, orari, menu per filiale, disponibilità, fasce e quote. Import dei dati verificabili da Events Menu, report delle varianti/prezzi/allergeni mancanti; mantenere indisponibili le varianti non validate. Bundle, promo con priorità e finestre; server ricalcola e chiede conferma se il prezzo è cambiato. Gate: prezzo manomesso, articolo esaurito, promo scaduta e fascia piena non possono essere acquistati al valore vecchio.
- **B04 — Comanda end-to-end.** Creazione idempotente, code staff, accetta/rifiuta, prepara, pronto, completa; pause e variazioni attesa a step, slot e capacità atomici; scadenze per pagamento e accettazione con job, eventi e recupero. API /api/orders e /api/staff/branches/:id/queue, comandi con versione e motivazione quando dovuta. Gate: doppio click crea un ordine, ultimo slot assegnato una volta, due cashier non sovrascrivono un'azione, pausa preserva ordini esistenti.
- **B05 — Pagamenti.** Cash e GCash, istruzioni per sede, riscontro merchant, upload privato, scadenze, retry/rifiuto, coda di riconciliazione. Emulatore locale e bucket dedicato in staging. Gate: nessun accredito automatico da screenshot, nessun accesso incrociato, deduplica reference e recovery upload/record parziale.
- **B06 — Tracking e chat.** Snapshot iniziale e delta per cursore, scadenze server, rate limit, sanitizzazione, retry deduplicato; misurare frequenza e carico, usare push solo dopo benchmark o se requisito di latenza più stretto. Gate: due dispositivi mostrano avanzamento e messaggi, rientro dopo disconnessione senza duplicati e stato autorevole a fronte di timer locali.
- **B07 — Storico e loyalty.** Storico paginato, riordino con quote corrente, ledger per accredito, uso e storno. Gate: nessun punto su cancellazione/ordine non pagato, accredito una sola volta, saldo consistente dopo storno.

## Frontend

- **F01 — Shell mobile e totem.** Route cliente, totem per sede e /staff; manifest/installabilità, safe area, navigazione, gestione sessione, schermate vuote/rete, reset per inattività. Test a 360px, tablet e totem portrait; cart persistente solo nella sessione pertinente e cache limitata agli asset.
- **F02 — Ordina e ritira.** Dine-in/Pickup → filiale/fascia → guest/social → menu → scheda prodotto → carrello/upsell → checkout → tracking/chat. Mappa con pin Pizzetta, lista alternativa e indicazioni esterne; prima di mostrare route interne verificare provider e quote. Guest e tracking funzionano anche senza GPS. Focus, label, contrasto e touch target verificati; nessun prezzo demo nel percorso reale.
- **F03 — Console ristorante.** Queue board, dettaglio, timer, +/- e pausa; decisioni pagamento e ordine con motivo, cambio ETA, chat, disponibilità e orari manager, settings admin. Nessun comando solo cosmetico: feedback su errore, autorizzazione e conflitti. Due cashier vedono il risultato della stessa operazione senza duplicarla.
- **F04 — Dati personali e loyalty.** Storico, riordino, tessera, saldo e premi; passaggio totem → telefono quando il flusso QR è pronto. Testare social cancel, sessione scaduta e back da checkout.

## Pilot e rilascio

- **R01 — Staging.** Migrare solo dati di test, attivare OAuth redirect e bindings Pizzetta, testare il percorso cash/GCash a due dispositivi; controllare accessibilità, installabilità, latenza di aggiornamento e consumo quote con carico simulato. GitHub CI per build, typecheck, test API/SQL e smoke con fixture; deploy staging separato.
- **R02 — Operazioni.** Definire supporto, orari reali, capacità, tempo di risposta, cutoff preordini, account/ruoli, retention, policy punti e rimborsi. Dashboard minima: tempo di accettazione, tempo reale di preparazione vs ETA, pause, ordini scaduti, errori pagamenti e conversione upsell. Backup e prova di ripristino; rollback Worker senza perdere ordini né riscrivere migrazioni applicate.
- **R03 — Apertura.** Prima sede pilot, con checklist di pagamenti e stampato/fallback manuale per guasti; usare produzione solo quando il percorso è stato verificato con ruoli reali. Estendere sedi dopo riscontro di capacità, pagamenti, assistenza e latenza.

Sequenza iniziale: B01 → B02/B03 → B04 → F01/F02/F03 per la prima comanda cash; poi B05/B06/B07, F04 e staging completo. Le configurazioni esterne incomplete non bloccano il core locale. Input per il pilot: dati filiale, orari e capacità reali; listino varianti e bundle non coperti da Events Menu; allergeni confermati; GCash merchant; impostazioni loyalty, app Meta e callback Google verificati. Nessun segreto nel repository.
