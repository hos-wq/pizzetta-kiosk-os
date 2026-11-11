# Pizzetta Ordering — P7 Macchina a stati dell’ordine

Transizioni confermate dall’owner. Questo documento prevale sulla sequenza degli stati descritta nella baseline P0–P1.

```text
RECEIVED → ACCEPTED → PREPARING → READY → COMPLETED
RECEIVED → CANCELLED
ACCEPTED → CANCELLED
```

| Stato | Significato operativo |
|---|---|
| `RECEIVED` | La richiesta è stata inviata e attende la conferma della sede. |
| `ACCEPTED` | La sede ha confermato l’ordine. |
| `PREPARING` | La preparazione è in corso. |
| `READY` | Lo staff ha confermato che l’ordine è pronto. |
| `COMPLETED` | Lo staff ha chiuso l’ordine dopo il ritiro o il servizio in sala. |
| `CANCELLED` | L’ordine è stato annullato prima della preparazione. |

`COMPLETED` e `CANCELLED` sono stati terminali. Ogni transizione riuscita genera un evento con stato precedente, nuovo stato, data e autore. Il timer segue l’ETA e può sollecitare lo staff. Il passaggio a `READY` richiede conferma operativa.

La prenotazione del solo tavolo segue il flusso di prenotazione. Per il preordine dine-in vale la macchina a stati dell’ordine. Il packing previsto in P1 può essere rappresentato come attività interna a `PREPARING`, da definire nel dettaglio staff.
