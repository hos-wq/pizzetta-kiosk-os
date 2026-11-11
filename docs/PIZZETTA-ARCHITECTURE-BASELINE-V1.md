# Pizzetta Ordering — Architecture Baseline V1

Stato: P0–P1, 11 novembre 2026. Requisiti dell’owner e proposte tecniche da validare in P2. Non descrive funzionalità già disponibili. Fonti: brief dell’owner, immagine “Pizzetta - Menu.png”, manifesto esistente per il contesto. In caso di conflitto prevale il brief corrente: accesso dopo l’ordine, note strutturate al posto della chat, pagamento in sede, prenotazione tavolo esplicita e distinta dal preordine.

## P0 — Product framing

Vendita diretta aggiuntiva per Pobla, Antipolo e BF Homes: consultare il menu e preordinare per pickup o dine-in. Utente prioritario: chi lavora e ha poco tempo per il pranzo. L’ospite ordina senza account; il cliente abituale può ritrovare lo storico, riordinare il solito o un ordine precedente e accumulare timbri. Nessun delivery né pagamento online. WhatsApp è un recapito per eccezioni, non il canale ordinario di presa ordini.

Misurare per sede e fascia pranzo: richieste d’ordine via telefono/WhatsApp per 100 ordini, quota di preordini digitali, mediana e P90 del tempo tra arrivo e consegna per pickup, e tempo invio → accettazione. Annotare l’arrivo con un check-in al banco nel pilot (senza GPS passivo). Rilevare la baseline prima del lancio e controllare anche abbandoni, ritardi e no-show per distinguere code ridotte da domanda persa.

## P1 — Dominio e interazioni

1. Sede, modalità e orario: pickup ora o in fascia; dine-in con richiesta tavolo e, facoltativamente, preordine. Tavolo e cucina hanno capacità e conferme separate. Un tavolo richiesto non è riservato finché lo staff non lo conferma. Mostrare solo fasce proponibili; ricontrollare capacità al submit e all’accettazione.
2. Carrello → riepilogo da confermare (sede, orario, articoli, modifiche e totale in PHP) → nome e numero WhatsApp obbligatori → Cash oppure GCash in sede → invio. Il riepilogo non è ricevuta fiscale. Il server salva la richiesta con ID proprio, dati/versioni di menu e prezzo, e chiave di idempotenza: doppio tap o retry non creano duplicati. Da quel momento il cliente vede un riferimento e “In attesa del ristorante”. Un contatto formalmente valido non prova il possesso: proposta per il pilot, limiti di frequenza e verifica manuale solo per casi sospetti.
3. Lo staff della sede riceve la richiesta in cima alla coda fino a risoluzione. Può accettare con ETA di preparazione/ritiro, rifiutare con motivo o formulare una controproposta. Note a thread breve per richiesta: cliente → risposta staff → conferma/controproposta. Cambi sostanziali (prezzo, orario, articolo, allergeni) richiedono consenso esplicito sulla revisione esatta prima di proseguire. Senza risposta, scadenza esplicita e rilascio capacità. Le note non sono chat libera.
4. L’accettazione genera una sola volta un ID ordine collegato alla richiesta (1:0..1), oppure conferma solo il tavolo se non ci sono articoli. L’ordine di pickup mostra: CONFERMATO → IN PREPARAZIONE → PACKING → PRONTO → RITIRATO. Dine-in: TAVOLO CONFERMATO, con orario e coperti; se c’è un preordine mostra anche ETA e preparazione, senza packing o ritiro al banco salvo eccezione esplicita. Pagamento separato: da incassare → incassato in sede, con verifica dello staff, anche per GCash. Niente gateway, QR remoto o ricevuta GCash da caricare in questa fase.
5. Timer lato server con scadenze per sede, azioni ripetibili in sicurezza e audit di chi/cosa ha mosso lo stato. Raccomandazione: dopo l’accettazione, avvio automatico della preparazione soltanto a orario concordato e per sedi che lo abilitano; allo scadere delle altre fasi evidenziare “Da verificare” e sollecitare lo staff. Un timer non può sapere se una pizza è pronta: niente stato PRONTO, RITIRATO o incasso automatici. Le durate e la tolleranza vanno definite in P2.
6. Entrambe le viste leggono lo stesso stato. Evento registrato con la transizione, deduplica per evento e destinatario. Staff: richiesta persistente e badge in coda fino a presa in carico/risoluzione; promemoria sulle fasi scadute con intervalli limitati. Il push è un avviso aggiuntivo; la coda rimane la fonte anche dopo riapertura. Cliente: push solo per confermato e pronto per pickup; note, controproposte e altri aggiornamenti sono visibili nel tracker. Per una controproposta urgente resta il contatto manuale di eccezione. Il suono di marca resta in-app; l’avviso di sistema usa il suono gestito dal dispositivo.
7. Tracker dopo accettazione: countdown dell’ETA, stato corrente, indirizzo, distanza e indicazioni. Posizione su tap e consenso, distanza in linea d’aria calcolata sul dispositivo; nessuna persistenza delle coordinate. Se il GPS è negato, restano indirizzo e pulsante indicazioni. Se l’ETA scade, mostra “In ritardo” o l’ETA aggiornato.
8. Riapertura: cookie di sessione persistente casuale, Secure/HttpOnly/SameSite, associato sul server a una sessione guest o account; richieste e ordini sono caricati da D1 tramite il proprietario della sessione. Nessuna identità basata su IP, fingerprint o numero WhatsApp digitato. Se l’utente cancella i cookie o cambia dispositivo, il guest ha bisogno di un meccanismo di recupero con prova di possesso; lo storico di account si recupera accedendo. Il totem condiviso azzera la sessione locale tra clienti e non espone lo storico; passaggio al telefono con codice monouso è una proposta.
9. Durante l’attesa, offrire accesso e loyalty senza interrompere il tracker. Se l’ospite accede, può collegare l’ordine alla propria utenza con prova di possesso della sessione guest, una sola volta. Carta da 12 timbri, tappe 3/6/9/12. Proposta: un timbro per ordine pagato e completato, deduplicato per ID ordine; premi da decidere. Riordino sempre con controllo di prezzi e disponibilità correnti e riepilogo aggiornato.

Modello minimo: filiale, SKU/variante e disponibilità per sede; capacità tavoli/slot; sessione guest o account; richiesta e sue revisioni, note e consenso; ordine e righe snapshot; prenotazione tavolo facoltativa; eventi e invii notifica; pagamento in sede e ledger loyalty. D1 è la fonte dello stato; aggiornamento incrementale per cursore in primo piano, riallineamento alla riapertura, push in background solo sui dispositivi abilitati. Le API private e le risposte degli ordini non vanno nella cache del service worker.

## P1 — Catalogo di riferimento

Categorie: Classics, Signature, Thin Crust 10″, KITCHEN e BREWED ICED TEA. L’ordine canonico della pizza è Classics — Margherita, Spinach Dip, 5 Cheese + Garlic, Vegetarian, Pepperoni, Hawaiian, Meat Overload. Signature — Pizza Corn, Pizzalada, Chorizo, Chicken Masala, Samurai, Chicken Suya. Thin Crust 10″ — Cheese Sticks, Choco Glaze. I prezzi 14″ e tray vengono dall’immagine del menu. I prezzi 8″ e le due pizze Thin Crust 10″ vengono dal listino fornito dall’owner. KITCHEN qui documenta solo tray da 10–12 pax. L’immagine e il listino non includono tè, porzioni singole o bundle: tenere fuori dal catalogo confermato finché non c’è una fonte per composizione, formato e prezzo; nessun prezzo inventato.

| Prodotto | Formato / ₱ | Composizione riportata | Segnali allergeni dal testo |
|---|---:|---|---|
| Margherita | 14″ / 259 | Pomodoro, basilico fresco, mozzarella, olio d’oliva | Milk |
| Pepperoni | 14″ / 339 | Pepperoni, mozzarella, origano | Milk |
| Hawaiian | 14″ / 319 | Prosciutto, ananas, mozzarella, origano | Milk |
| Spinach Dip | 14″ / 269 | Base spinach dip, burro all’aglio, mozzarella, pepe | Milk |
| 5 Cheese + Garlic | 14″ / 289 | Gouda, Emmental, Parmigiano, cream cheese, mozzarella, burro all’aglio | Milk |
| Vegetarian | 14″ / 319 | Peperoni dolci, funghi, olive, cipolla, basilico | Verificare anche base e formaggio |
| Meat Overload | 14″ / 359 | Pepperoni, salsiccia italiana, prosciutto, mozzarella | Milk |
| Chicken Masala | 14″ / 299 | Pollo speziato, salsa garam masala, finitura yogurt e aglio | Milk; verificare miscela e salsa |
| Chorizo | 14″ / 299 | Chorizo affumicato, pimiento, cipolla, mozzarella, salsa di pomodoro | Milk |
| Samurai | 14″ / 349 | Surimi, fiocchi di bonito, maionese, teriyaki, crosta napoletana | Verificare teriyaki, surimi e mayo |
| Chicken Suya | 14″ / 339 | Pollo glassato suya piccante, peperoni dolci, cipolla rossa, peperoncino verde, mozzarella | Milk; verificare arachidi e frutta a guscio nella glassa |
| Pizza Corn | 14″ / 359 | Burro all’aglio, mais dolce, mozzarella, maionese giapponese | Milk; verificare mayo |
| Pizzalada | 14″ / 359 | Salsa di pomodoro, mozzarella, melanzana affumicata, cipolla rossa, pomodoro fresco, uova salate, maionese giapponese | Milk; verificare mayo |
| Lasagna | Tray / 1.299 | Ragù di maiale, besciamella, pasta all’uovo, mozzarella, Parmigiano | Milk; verificare farina di pasta e besciamella |
| Spaghetti à la Pizzetta | Tray / 999 | Spaghetti, ragù di maiale, funghi, Parmigiano | Milk; verificare spaghetti |
| Alfredo with Ham & Mushroom | Tray / 999 | Spaghetti, salsa al formaggio, prosciutto, funghi, Parmigiano | Milk; verificare spaghetti e salsa |
| Pesto Creamy Basil and Chicken | Tray / 999 | Spaghetti, salsa di pesto cremosa, pollo grigliato | Verificare spaghetti, latte e tipo di frutta a guscio nel pesto |
| Kani Salad | Tray / 1.299 | Lattuga romana, pomodori, cipolla, kani, dressing al sesamo | Verificare kani e dressing |
| Caesar Salad | Tray / 1.299 | Lattuga romana, pollo grigliato, bacon, dressing Caesar | Verificare dressing, inclusi latte e senape |

### Prezzi pizza 8″

| Prodotto | 8″ / ₱ |
|---|---:|
| Margherita | 99 |
| Pepperoni | 139 |
| Hawaiian | 129 |
| Spinach Dip | 99 |
| 5 Cheese + Garlic | 99 |
| Vegetarian | 99 |
| Meat Overload | 149 |
| Chicken Masala | 129 |
| Chorizo | 129 |
| Samurai | 149 |
| Chicken Suya | 149 |
| Pizza Corn | 139 |
| Pizzalada | 139 |

### Thin Crust 10″

| Prodotto | 10″ Thin Crust / ₱ |
|---|---:|
| Cheese Sticks | 99 |
| Choco Glaze | 99 |

Audit ingredienti, non etichette pubblicabili: quattro indicatori richiesti — Wheat, Milk, Nuts, Mustard. Wheat è probabile nelle basi pizza e nelle paste convenzionali: confermare per SKU/variante. Per Nuts verificare separatamente arachidi e frutta a guscio (e quale). Mustard non è nominata nel menu: verificare mayo, dressing, carni lavorate, miscele e salse. Un indicatore mancante significa “non verificato”, mai “privo di allergeni”. Conservare gli ingredienti espliciti anche fuori da questi quattro indicatori (es. uovo, bonito e sesamo) e verificare schede fornitori e contaminazione incrociata prima di pubblicare dichiarazioni.

## Da chiudere in P2

- Definire slot, buffer e capacità pranzo per sede; tavolo solo vs tavolo + preordine; scadenze delle controproposte e regole per clienti in ritardo.
- Dare criteri di accettazione a cinque scenari: retry senza doppio ordine; sessione riaperta con tracker; richiesta vista solo dalla sede; scadenza timer senza falso PRONTO; contatto obbligatorio con accesso facoltativo dopo l’ordine.
- Confermare disponibilità per sede e completare le schede mancanti. Poi tradurre il flusso in Service Blueprint cliente/staff e matrice delle transizioni.
