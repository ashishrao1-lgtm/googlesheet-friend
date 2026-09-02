# Server-side auto refresh for fleet data

## Goal
Stop depending on the app being open to get fresh data. A scheduled job on the server pulls the Google Sheet every 5 minutes into the app's own database, keeps a history of every sync, and the app reads from the database — fast, quota-safe, and always current.

## How it will work

```text
Google Sheet  --(every 5 min)-->  sync endpoint  -->  database mirror (+ history)
                                                            |
                                              app reads (instant, no Sheets call)
```

1. A scheduled task calls a protected sync endpoint every 5 minutes.
2. The endpoint reads the Sheet tail (same loader used today), writes the current rows into mirror tables, and records the sync run.
3. Each sync also appends a snapshot row per record so history is retained (you can see when a vehicle actually reported and how alerts evolved).
4. The app's data function reads the mirror instead of calling Sheets. If the last successful sync is older than ~15 minutes, it falls back to a live Sheet read so the app never shows stale data silently.
5. Home shows "Last synced HH:MM" from the sync log plus a manual "Sync now" button.

## Technical detail

**Database (one migration)**
- `fleet_sync_runs` — `started_at`, `finished_at`, `status` ('ok'/'error'), `fixed_rows`, `adhoc_rows`, `error` text.
- `fleet_fixed_current` / `fleet_adhoc_current` — one row per record keyed by a natural key (`contract_number + vehicle + reporting_time` for fixed; `ticket_no` for adhoc), all existing sheet columns as text, plus `synced_at`. Upserted each run; rows absent from the sheet window get a `removed_at` stamp rather than a delete.
- `fleet_snapshots` — `synced_at`, `kind` ('fixed'/'adhoc'), `ref`, `status`, `attendance_status`, `reported_at`, `reporting_time`, `dri`, `center`, `vendor`. Append-only history, indexed on `(synced_at)` and `(kind, ref)`.
- Grants: `SELECT` to `anon`/`authenticated` (data is internal ops data, already read openly like `fleet_actions`), `ALL` to `service_role`. RLS on with read-only policies; all writes go through the service role in the sync endpoint.

**Sync endpoint**
- New `src/routes/api/public/hooks/sync-fleet.ts` (POST). Verifies a shared `FLEET_SYNC_SECRET` header before doing anything, then calls the existing `getFleetPayload()` loader and writes to the mirror with `supabaseAdmin` (imported inside the handler). Returns row counts. Logs a row in `fleet_sync_runs` for both success and failure.

**Scheduling**
- pg_cron + pg_net job every 5 minutes hitting the stable app URL with the secret header. Configured via SQL after the endpoint ships.

**App reads**
- New `src/lib/fleet-mirror.server.ts` reads the mirror tables and maps them back to the existing `FixedRow` / `AdhocRow` shapes, so no route or component logic changes.
- `getFleetData()` in `src/lib/fleet.functions.ts` returns mirror data + `fetchedAt` = last sync time; falls back to `getFleetPayload()` when the newest sync is stale or the mirror is empty.
- Client polling changes from 60s to 2 min (`refetchInterval`), still with refetch on focus — cheap now that it hits the database.
- Home header: show last-sync time and a "Sync now" action that triggers the sync server-side then refetches.

**History use (small addition)**
- Vehicle detail page gains a "Reporting timeline" line derived from `fleet_snapshots` for that ref, showing when its status/attendance last changed.

## Notes
- The Google Sheets connector and the existing loader stay exactly as they are; the sync endpoint is the only new caller in the scheduled path.
- Sheets quota drops to ~12 calls/hour regardless of how many people use the app.
- Snapshot history grows; the plan includes a nightly cleanup keeping 90 days.

## Out of scope
- No change to login, filters, alert logic, or the performance metric definitions.
- No true push from Google Sheets (Sheets has no webhook for this); 5-minute polling is the mechanism.
