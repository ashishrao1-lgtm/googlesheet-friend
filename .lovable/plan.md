# Fix adhoc data, remove Ask AI, speed up the app

## What we found (verified)

1. **Adhoc is completely mis-mapped.** The Adhoc Compliance tab in the Google Sheet was restructured — it now has `Vehicle Type / State / City / Zone` at columns J–M, plus new `nep` and `union_area` columns, and `Fleet_DRIs` sits at column Z. The loader in `src/lib/fleet-data.server.ts` still assumes the old layout, so `reporting_time` gets vendor names, `ticket_status` gets reasons, `bid_origin` gets the `nep` flag, and `fleet_dri` gets a numeric column. Result: every DRI filters down to zero adhoc rows, so Performance and Adhoc alerts show nothing. Fixed Compliance headers were verified and are still correct.
2. **The hosted backend (Lovable Cloud) is paused.** The database mirror can't be read, so every page load falls back to pulling ~54,000 rows live from Google Sheets — slow and quota-prone. This is the main reason the app feels slow.
3. **The sync's change-detection reads only the first 1,000 rows per table** (no pagination), so almost every row is re-written and re-snapshotted every 5 minutes — heavy writes and slow syncs.
4. Ask AI needs to be removed.

## Plan

### 1. Resume the backend
Request approval to resume the paused Lovable Cloud instance, then confirm it reports healthy before relying on mirror reads.

### 2. Fix the adhoc column mapping
- In `src/lib/fleet-data.server.ts`, map Adhoc columns **by header name** instead of fixed indexes (robust to future sheet edits):
  `Indent Id→indentId, Ticket No→ticketNo, LOB→lob, Ticket duration→duration, Vehicle no→vehicle, driver_phone→driverPhone, sp_phone→spPhone, Center Name→center, facility_type→facilityType, Vehicle Type→vehicleType, State→state, City→city, Zone→zone, creation_time→creationTime, reporting_time→reportingTime, attendance_in_time→attendanceInTime, Vendor Name→vendor, Ticket Status→ticketStatus, tkt_creation_bucket→creationBucket, ticket_reason→reason, target_price→targetPrice, bid_amount→bidAmount, bid_origin→bidOrigin, nep→nep, union_area→unionArea, Fleet_DRIs→fleetDri, ontime_placement→ontimePlacement, acceptance_diff→acceptanceDiff, bid_received_time→bidReceivedTime, updated_by→updatedBy`.
- Narrow the fetch range to the actual width (A:AD, 30 columns) and trim `dr`/`sdr` legacy fields.
- Mirror mapping in `fleet-mirror.server.ts` / `fleet-sync.server.ts` gains the new fields (nep, union_area, acceptance_diff, bid_received_time, updated_by) — via a small migration adding the columns, plus updated row mapping.
- Run a full sync after the fix so the mirror's adhoc columns are rebuilt with correct values.

### 3. Speed: filter by DRI on the server, not in the browser
Today every page downloads the whole ~54k-row payload and filters it client-side. Change `getFleetData` to a POST server function that takes the signed-in DRI and returns only that DRI's fixed/adhoc rows plus small precomputed **team aggregates** (team on-time %, team breach %) used by the Performance scorecard.
- Pages (`index`, `tracking`, `performance`, `vehicle.$id`, `BottomNav` badge) drop their client-side `driMatches` filters and use the scoped payload directly.
- Logouts/sessions unchanged; the DRI comes from the existing local session.

### 4. Sync correctness & efficiency
- Page the change-detection reads (`fleet_fixed_current` / `fleet_adhoc_current`) in chunks of 5,000 like the mirror reader, so change detection sees all rows.
- Mark rows `removed_at` when a natural key is absent from the current sheet window, so stale tickets/contracts stop lingering in alerts.

### 5. Remove Ask AI
- Delete `src/routes/ask.tsx` and `src/lib/ask.functions.ts`.
- Remove the Ask AI nav item from `src/components/BottomNav.tsx` (grid becomes 4 columns).

### 6. Verify end-to-end
- Build logs clean.
- Playwright: sign in as a real DRI, confirm Adhoc alerts populate, Performance adhoc charts (axle-app %, reporting breach %) render with real numbers, fixed alerts still work, no Ask AI tab, and page load times are materially faster.

## Notes
- Backend resume needs your approval when prompted; nothing else requires it.
- Once the backend is active, page loads come from the database mirror instead of Google Sheets, which is the single biggest speed gain.
