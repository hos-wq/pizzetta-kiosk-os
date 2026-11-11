# Monique navigation contract v1

The controller accepts only the following operation shape:

```json
{
  "version": 1,
  "operation": "NAVIGATE",
  "destination": {
    "navigationId": "listing.room.details",
    "entities": { "roomId": "BR·08" }
  }
}
```

`navigationId` must exist in `UI/src/monique/navigation.ts`. Required entity parameters are checked against the registry. The only operation is `NAVIGATE`; mutation operations are rejected. The resolver produces canonical loaded IDs, never raw user text.

Supported required parameters currently are `roomId`, `personId`, and `date`. The page controller maps these to existing React state and updates the current URL with `history.replaceState`; it does not submit a form, call a POST/PATCH/DELETE endpoint, or change D1.
