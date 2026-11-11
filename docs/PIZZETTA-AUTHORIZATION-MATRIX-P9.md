# Pizzetta Ordering — P9 Ruoli e permessi

Specifica di prodotto. Questa matrice sostituisce le precedenti assegnazioni di permessi per i ruoli indicati.

| Ruolo | Ambito | Azioni |
|---|---|---|
| ADMIN | Piattaforma Pizzetta | Gestisce regole generali, menu, prezzi e impostazioni generali. |
| MANAGER | Sedi assegnate | Configura le fasce di punta, aggiorna i tempi d’attesa e mette in pausa o riapre la ricezione di nuovi ordini. |
| CASHIER | Sedi assegnate | Gestisce la coda e coordina gli ordini con la cucina. Prende in carico gli ordini, aggiorna le fasi, conferma quando sono pronti e chiude al ritiro o dopo il servizio in sala. |
| CUSTOMER | Proprio account | Consulta il menu, ordina, segue i propri ordini, accede allo storico, accumula premi loyalty e può riordinare. |
| GUEST | Propria sessione | Consulta il menu, ordina e segue il proprio ordine in corso con lo stesso percorso del cliente. Ogni nuovo ordine parte come esperienza guest, senza storico account, accumulo premi o riordino dallo storico. |

La pausa del Manager riguarda i nuovi ordini. Il Cashier continua a gestire quelli già in coda. Le transizioni dell’ordine seguono [P7](./PIZZETTA-ORDER-STATE-MACHINE-P7.md). L’API controlla ruolo e sede per ogni operazione staff e proprietà della sessione o dell’account per ogni ordine cliente.

Interpretazione di «ogni volta una nuova esperienza» coerente con P2. Se il guest chiude e riapre l’app durante un ordine, ritrova il tracker sullo stesso dispositivo finché la sessione è valida. I preferiti locali già previsti in P2 restano separati dallo storico e dalla loyalty. La proposta di accesso durante l’attesa rimane facoltativa.

La matrice descrive i permessi minimi per ruolo. Eventuali permessi operativi aggiuntivi per Manager o Admin vanno assegnati esplicitamente.
