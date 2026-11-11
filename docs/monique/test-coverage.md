# Monique test coverage

Automated coverage is in `tests/monique-navigation.test.ts`.

- 9 focused Monique tests pass, plus the complete repository suite.
- Room aliases cover `BR08`, `BR-08`, `BR·08`, and physical unit `1008`.
- Physical unit `2704B` is covered through the services context.
- Ambiguous person matches are rejected rather than guessed.
- Mutation language and unavailable room subsections are rejected.
- The versioned read-only contract validates operation, destination and required parameters.

The registry contains 11 mobile destinations and 30 Office destinations. Full browser end-to-end verification of every leaf is not claimed here; the inventory records where the existing app exposes a parent screen without an entity-specific child state.
