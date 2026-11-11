# Pizzetta Ordering — P2 Service Blueprint

Stato: bozza di progettazione, 11 novembre 2026. Estende PIZZETTA-ARCHITECTURE-BASELINE-V1.md. L'ultimo punto del brief P2 («quando arriva la conferma») è incompleto; le interazioni successive sono proposte, non decisioni approvate.

## Percorso cliente e risposta del sistema

| Momento | Cliente | Sistema / ristorante |
|---|---|---|
| Apertura | Animazione brand breve e saltabile, poi due card: Pick up / Dine in. Su ritorno, azione visibile «Riprendi ordine». | Ripristina la sessione dal cookie: nuovo, ospite di ritorno o autenticato. Recupera l'ordine attivo. Mostra le card anche se la rete o il GPS tardano. Rispetta la preferenza di movimento ridotto. |
| Sede e orario | Dopo la scelta della modalità, seleziona sede e fascia; può mantenere o cambiare la sede consigliata. | Se il permesso esiste già, prova a leggere la posizione; altrimenti offri «Usa la mia posizione». Suggerisci in modo discreto la sede più vicina in linea d'aria, distinta da una sede prenotabile. Senza GPS resta la selezione manuale. Niente coordinate persistenti. |
| Menu e dettaglio | Sfoglia per categoria; apre ingredienti e allergeni, sceglie formato e quantità con +/−, seleziona add-on con checkbox, aggiunge una nota o salva nei preferiti. | Mostra prezzo e disponibilità per sede, aggiorna il totale con gli extra. Una riga è identificata da SKU, variante, extra e nota: righe con personalizzazioni diverse restano separate. Preferito e carrello sono azioni distinte. |
| Add to cart | Aggiunge e torna esattamente a categoria e posizione di scorrimento precedenti. Una barra fissa mostra quantità, subtotale e accesso alla lista aggiornata; «Checkout» nel carrello. | Il carrello mantiene righe, note e configurazioni. Cambio sede: verifica tutte le righe, mostra differenze e chiede conferma prima di applicarle. |
| Checkout | Può aggiungere una nota generale. Vede lista, modifiche, sede, orario e totale, poi sceglie «Edit» o «Confirm». Dopo la conferma inserisce nome e WhatsApp obbligatori, se mancanti, sceglie Cash o GCash in sede e invia. | Ricalcola prezzi, promozioni e disponibilità. Se cambiano, torna al riepilogo per nuova conferma. Retry o doppio tap producono la stessa richiesta. Per dine-in distingue tavolo solo e tavolo con preordine. |
| Attesa | Vede «Waiting for restaurant» e il riferimento. Può aderire alla Pizzetta Loyalty Card con sign up / log in, oppure continuare come guest. Può rispondere a una controproposta. | Coda staff persistente fino a gestione. Lo staff conferma con ETA oppure propone una variazione; nessuna chat libera. L'accesso durante l'attesa conserva il tracker e collega la richiesta in modo sicuro. |
| Conferma | Se il tracker è in primo piano passa alla vista confermata. Altrimenti notifica, se abilitata, e link diretto al tracker. | Pickup: countdown sull'ETA, mappa con percorso verso la sede confermata e fase corrente evidenziata; pulsazione leggera, statica con movimento ridotto. Se GPS o percorso non sono disponibili, mostra indirizzo e indicazioni manuali. Dine-in: orario e coperti confermati; timer di preparazione solo se c'è un preordine e un ETA. |

## Regole delle offerte

- Prima pizza aggiunta: una sola offerta Iced Tea a ₱39 per carrello, con azioni «Aggiungi» e «No, grazie». La quantità dell'offerta e la cumulabilità sono da confermare; per la bozza si assume un tè per carrello, e rimozione dell'idoneità se non rimane nessuna pizza. Mai aggiungere il tè senza consenso.
- Pizza 8″, spaghetti o lasagna: proponi «Make it a Crust Meal» nel dettaglio, con insalata, tè, prezzo totale e differenza rispetto alla base. Il pasto sostituisce la base, mantenendo quantità e personalizzazioni compatibili. Proposta UX: stessa scheda e nessun secondo popup; se viene scelto subito un pasto che include tè, sopprimi il popup del tè. Prezzo del pasto e formati kitchen idonei vanno confermati.
- Al primo ingresso in checkout, prima del riepilogo finale: al massimo una proposta. Se manca il tè, proponi il tè; altrimenti, se manca l'insalata, proponi un'insalata. Contano anche le componenti dei bundle. Se entrambe sono già presenti, salta. Se rifiutata, non riproporla a ogni ritorno dal tasto Edit. Il prezzo di checkout è quello applicabile alla promozione verificata dal server: non mostrare ₱39 quando il carrello non è idoneo.
- Il server registra la promozione applicata e ricalcola il totale quando cambiano le righe. Per il pilot, una promozione con condizioni non ancora confermate resta disattivata.

## Navigazione persistente e preferiti

Prima dell'invio la barra contestuale dà priorità al carrello. Dopo l'invio il footer mantiene accessibili Menu, Ordine in corso, Preferiti e Profilo senza coprire le azioni del tracker. Per il guest, Profilo porta a sign up / log in; per l'account mostra storico e loyalty. Da storico o preferiti si torna alla scheda e si riconfermano prezzo e disponibilità correnti.

I preferiti di account sono associati all'ID cliente nel database. Per il guest personale, proposta: lista di ID prodotto salvata nel browser; il cookie di sessione serve a recuperare l'ordine dal server. Al login, unione per ID senza duplicati. Pulizia dati o cambio dispositivo non garantiscono il recupero dei preferiti guest. Su totem condiviso si azzerano al cambio cliente.

## Verifiche da usare per P3

- Un avvio senza rete o senza permesso GPS non blocca le due card; l'ordine non è inviabile senza rete e conferma del server.
- Alla riapertura, il cliente ritrova il proprio ordine e vede lo stato effettivo, anche se la conferma è avvenuta a schermo chiuso.
- Dopo Add to cart si riprende dallo stesso punto; edit, note, quantità e add-on si riflettono nel riepilogo.
- Prima pizza idonea → una sola proposta tè; Crust Meal con tè → nessun doppione; Edit ↔ Checkout → nessun popup ripetuto.
- Negare la posizione o non ricevere push non impedisce di consultare il tracker.
- La mappa mostra la sede confermata, non la sede più vicina a una nuova posizione del cliente. Un ETA scaduto non fa avanzare automaticamente a PRONTO.
