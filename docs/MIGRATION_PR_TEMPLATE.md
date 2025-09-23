## chore(migrations): add RPCs and helpers for property updates + price history

This PR adds server-side RPCs and helper functions to atomically update `scraped_properties` and record `price_history` when `current_price` changes. It also adds utility functions and field lists used by the scraper.

Files changed
- `supabase/migrations/20250923150000_rpc_update_property_with_history.sql` - RPC to update single property atomically and insert price_history on price change.
- `supabase/migrations/20250923153000_has_property_changed.sql` - has_property_changed utility and default wrapper.
- `supabase/migrations/20250923160000_rpc_bulk_upsert_properties.sql` - bulk upsert RPC accepting a JSON array, upserting properties and recording price_history when needed.
- `supabase/migrations/20250923161000_ensure_price_history_trigger.sql` - idempotent trigger/function creation for price_history.
- `src/scraper/fields.ts` - exports SIGNIFICANT_FIELDS and COSMETIC_FIELDS for consistent use across the codebase.

Testing checklist
- Run `supabase db push --yes --include-all` in a staging environment and verify all migrations apply.
- Use the service role key to call `rpc_update_property_with_history` and `rpc_bulk_upsert_properties` with test payloads and verify `scraped_properties` and `price_history` rows are created/updated.
- Confirm triggers exist: `trg_price_history_on_change` on `scraped_properties`.

Notes
- These migrations are safe to run multiple times; the trigger migration is idempotent.
- Grant `EXECUTE` on the RPCs to `authenticated` if you intend to call them directly from front-end clients. Otherwise call from server-side with service role key.

Suggested commit message:
```
chore(migrations): add RPCs and has_property_changed utility; bulk upsert and trigger ensure

Adds server-side functions to atomically update properties and record price history, a bulk-upsert RPC,
and a default has_property_changed utility. Also exports field lists for scrapers.
```
