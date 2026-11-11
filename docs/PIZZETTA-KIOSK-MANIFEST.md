# Pizzetta Kiosk — Manifesto di prodotto e architettura

Versione 0.1 · Progetto autonomo · Specifica di sviluppo, non attestazione di produzione.

## Promessa

Un'unica esperienza Pizzetta per ordinare al totem o dal telefono, ritirare al banco o mangiare in sede. Chi ordina sa quanto aspetterà; chi è al banco controlla il carico; il manager può intervenire senza dare a tutti accesso alle impostazioni. Un solo menu di marca, con disponibilità, orari e tempi per filiale. Niente delivery, AI o dipendenze operative da altri progetti.

## Percorso cliente

1. Scegli Dine-in o Pickup e la filiale. Sul totem la sede è fissata dall'installazione; su mobile si può scegliere dalla lista, usare la posizione solo su richiesta e aprire indicazioni per il pin. L'ordinamento iniziale per distanza in linea d'aria non rappresenta il tempo di viaggio.
2. Ordina ora o scegli una fascia prenotabile. Un dine-in programmato è un preordine, non una prenotazione del tavolo. Continua come ospite oppure accedi con Google o Meta (Facebook Login, subordinato alla configurazione del provider). Conserva il carrello durante il login. Il totem azzera i dati tra clienti; per account e loyalty sul dispositivo condiviso, preferire il passaggio al telefono tramite QR monouso.
3. Sfoglia per categoria. Ogni prodotto ha ingredienti, allergeni verificati o informazione in attesa, varianti, prezzo in ₱ e disponibilità. Menu e foto sono pubblicati da staff autorizzato. Il riferimento Events Menu documenta solo i prezzi per le pizze 14″ e i tray 10–12 pax: non usarli per dedurre altri formati. Ingredienti pubblicabili, non ricette interne.
4. Configura prodotto o pasto. Crust Meal: base ammessa + una salad + iced tea. Barkada Meal: una pizza 14″ + due salads + tre spaghetti + una lasagna + un pitcher. Le opzioni e il prezzo dei bundle sono verificati dal server. Mostrare un suggerimento pertinente e ignorabile: upgrade Crust Meal per basi idonee o abbinamento da un'insalata; iced tea quando manca. Mostrare la differenza di prezzo prima della conferma. Mai aggiungere prodotti da soli.
5. Rivedi sede, fascia, articoli, totale e pagamento. Cash in sede; GCash con QR o istruzioni della filiale, riferimento e upload della ricevuta. Il cliente vede gli stati del pagamento e dell'ordine separatamente. Un'immagine non è prova contabile: lo staff controlla l'accredito nel proprio conto merchant prima di verificare il pagamento.
6. Segui il tracker e usa la chat dell'ordine. Il guest mantiene l'accesso sul proprio dispositivo tramite sessione e può usare un link di recupero non enumerabile, a scadenza, scambiato con una sessione. I clienti autenticati vedono storico, loyalty e possono riordinare dopo nuova verifica di prezzo e disponibilità.

## Percorso ristorante e permessi

Google soltanto. Il server verifica l'identità Google e una membership staff attiva. La registrazione cliente non crea mai un account staff. Bootstrap owner limitato all'identità Google Pizzetta verificata e registrata; inviti con scadenza, revoca immediata, audit e protezione dell'ultimo admin.

| Operazione | Cashier | Manager | Admin |
|---|---|---|---|
| Coda, accetta/rifiuta, chat, preparazione, pronto e consegna | Sede assegnata | Sedi assegnate | Tutte |
| Aggiorna attesa con −/+ 5 min, pausa/riprendi nuovi ordini | Sede assegnata, limiti operativi | Sedi assegnate | Tutte |
| Verifica accredito GCash e incassa cash | Sede assegnata, azione tracciata | Sedi assegnate | Tutte |
| Esauriti, orari eccezionali, capacità, gestione incidenti e riconciliazione | — | Sedi assegnate | Tutte |
| Catalogo globale, promozioni, filiali, ruoli, loyalty e impostazioni | — | — | Tutte |

Console: coda per priorità e scadenza, filtri per stato, dettaglio ordine con timeline, prova pagamento e chat. Il +/− cambia il tempo per le nuove proposte; sugli ordini già accettati si cambia l'ETA esplicitamente, con motivo e notifica in app. La pausa blocca le nuove conferme nella sede/servizio interessati, non cancella ordini esistenti e non interrompe la loro chat.

## Contratti operativi

- Ordine: PENDING_PAYMENT → PENDING_ACCEPTANCE → ACCEPTED → PREPARING → READY → COMPLETED; cash parte da PENDING_ACCEPTANCE. Stati terminali REJECTED, CANCELLED ed EXPIRED, raggiungibili solo con regole esplicite. Un preordine accettato rimane in agenda fino all'orario operativo. I ritardi dopo l'accettazione generano escalation, non cancellazioni automatiche.
- Pagamento: metodo CASH o GCASH; stati separati UNPAID, PROOF_SUBMITTED, VERIFIED, REJECTED, REVIEW_REQUIRED e REFUNDED (rimborso registrato dopo conferma effettiva). Cash verificato al banco prima di completare; GCash verificato prima di accettare. Prova respinta: riprova entro la scadenza. Pagamenti ambigui e ordini pagati non accettati vanno in riconciliazione, non in scadenza silenziosa. Riferimento GCash verificato utilizzabile una volta per conto merchant.
- Il Worker ricalcola totale, sconti, capacità e disponibilità al checkout. Idempotenza per richieste ripetute; aggiornamenti condizionati da versione; prenotazione capacità, evento e modifiche SQL nella stessa transazione. Date in UTC, orari e promesse visualizzati nel fuso della sede. Deadline misurate dal server, con job ripetibile per scadenze e rilascio capacità.
- Loyalty: ledger append-only, accredito una sola volta per ordine idoneo completato e pagato; storno con riga compensativa. Saldo e storico privati; regole di accumulo e premi configurabili e pubblicati prima del pilot.
- Chat: solo partecipanti autorizzati, testo semplice, limiti, chiusura e conservazione definite. Screenshot visibili solo al cliente proprietario e allo staff della sede con permesso. Upload limitati a immagini raster con verifica tipo/dimensione, archiviazione privata e cancellazione programmata. Mai esporre ricevute negli URL pubblici o nei log.

## Architettura

React/TypeScript PWA e Worker API sullo stesso origin, D1 come fonte SQL, storage privato per ricevute, job per scadenze. Nessun servizio di IA. API a sessione con cookie HttpOnly/Secure, protezione CSRF, scope cliente/staff distinto, revoca e controlli sede per ogni accesso; provider e segreti specifici Pizzetta. Verifica OAuth state, nonce per OIDC, PKCE dove supportato, subject provider stabile; nessuna fusione automatica degli account per email.

D1 rimane l'unica fonte dello stato. Per pilot: aggiornamento incrementale per cursore ogni 5 secondi nelle viste operative attive, backoff e stop in background, refresh al ritorno. Dichiarare questa latenza nell'applicazione e misurarla a due schermi. Per più sedi/volume: misurare limiti e valutare Durable Objects/WebSocket come canale di notifica, con riconciliazione da D1. Il service worker può servire risorse statiche offline; ordini e operazioni staff richiedono rete e conferma dal server.

Decisioni: QR GCash e controllo manuale nel pilot, gateway con webhook in una release successiva se richiesto; polling prima di introdurre infrastruttura push; URL di navigazione come fallback prima delle route disegnate in-app. Verificare licenza, attribuzione, quote e disponibilità del servizio mappe prima della scelta di produzione. Il free tier è un vincolo per il pilot, non una garanzia di costo a scala di catena. Riferimenti: [D1](https://developers.cloudflare.com/d1/platform/limits/), [R2](https://developers.cloudflare.com/r2/pricing/), [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect). Verifica live di requisiti e revisione Meta ancora aperta.

## Qualità dell'esperienza

Un design system, tre layout: totem portrait con categorie a sinistra e carrello fisso; mobile con categorie raggiungibili e checkout a fondo schermo rispettando la safe area; staff con coda leggibile e comandi grandi, utilizzabile anche su tablet. Carta avorio, charcoal, giallo per attenzione e arancione per azioni, nel rispetto del contrasto; accenti di categoria, Fraunces SuperSoft, Nunito/Poppins e Sour Gummy per messaggi speciali. Superfici flat, niente ombre decorative. Stati chiari di caricamento, vuoto, indisponibilità, rete persa e ripristino. Testare tastiera, focus delle schede prodotto, lettore di schermo, uso con una mano e reset totem senza cancellare un ordine già inviato.
