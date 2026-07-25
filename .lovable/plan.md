# Fleet App Revamp Plan

Large multi-area change. Broken into focused workstreams below.

## 1. Login Revamp (`src/routes/login.tsx`)
- Remove DRI dropdown. Two free-text inputs: **Username** (name) and **Password** (defaults to `Delhivery@4321` if `FLEET_APP_PASSWORD` env not set — keep env override).
- Dark navy background (`oklch(0.18 0.03 260)`), white card, red primary button, title "Delhivery Intracity Fleet" (Fleet in red), subtitle "Fleet Ops Monitoring Portal".
- Session stores whatever name the user typed (used as `fleetDri` match key, case-insensitive trim).
- Update `verifyLogin` server fn: only validate password.

## 2. Alert/Resolution Storage (`src/lib/resolutions.ts` — new)
- LocalStorage per-DRI keyed record of resolved alert IDs with `{ id, kind: 'adhoc'|'fixed', ref, resolvedAt, note? }`.
- Helpers: `getResolutions(dri)`, `markResolved(dri, entry)`, `unresolve(dri, id)`, `isResolved(dri, id)`.
- IDs: adhoc → `ticketNo`; fixed → `contractNumber + '|' + attendanceDate`.

## 3. Home Revamp (`src/routes/index.tsx`)
- Remove 7/30/90d pill selector. Replace with a **Filter Sheet** trigger (button) that opens filters: State, Zone, City, Vendor, Facility Type, Center, Status, Date range (from/to). Applies to both fixed & adhoc scopes.
- Two sub-tabs already exist; keep. Add third tab: **Resolved**.
- **Alerts (Action Required)**:
  - Adhoc alerts: tickets where `ticketStatus` is `requested` / open (not confirmed/completed/cancelled) → list with center + city + reporting time + tap-to-open detail.
  - Fixed alerts: contracts where `attendanceStatus` is missing / `status` indicates not marked-in → list with contract#, vehicle, center, reporting time.
  - Each row: **Resolve** button + tap navigates to detail.
  - Hide rows already in resolutions unless on Resolved tab.
- Resolved tab: shows both kinds with resolvedAt timestamp + **Unresolve** button.

## 4. Filter Bar Component (`src/components/FilterSheet.tsx` — new)
- Bottom-sheet style modal (mobile). Fields: State, Zone, City, Vendor, Facility Type, Center, Status, Date From, Date To, Reset.
- Options derived from currently visible dataset (unique values).
- Emits `FilterState` used by Home, Tracking, Performance.
- Persist filter state via `useState` per-route (not global for now).

## 5. Tracking Tabs (`src/routes/tracking.tsx`)
- Add sub-tabs: **Adhoc** | **Fixed**.
- **Adhoc tab**: only tickets where `ticketStatus === 'truck_confirmed'` (case-insensitive, allow `truck confirmed`). Card shows: ticket#, vehicle, center, city, LOB, reporting time, driver phone, SP/vendor phone, vendor name. Buttons: **Call Driver** (`tel:` link), **Call Vendor** (`tel:` link).
- **Fixed tab**: contracts where attendance is missing (attendanceStatus empty / not marked) and reporting time has passed (or today). Card: contract#, vehicle, vendor, center, city, reporting time. Since fixed rows have no phone, show vendor name and a note; if a phone field exists in sheet add later — for now show "Contact via vendor list".
- Add same FilterSheet at top.

## 6. Performance Revamp (`src/routes/performance.tsx`)
- Replace bar chart with **line chart** trend at day level (SVG polyline) matching reference: axis grid, dots, dashed "today" indicator, subtle secondary line for 7-day average.
- **Fixed section**: Daily On-time % (status=='On-time' / total). Below chart: **Show detailed split** toggle → expands **vendor-level compliance table** (Vendor, Total, On-time, Delayed, Absent, Compliance % with mini bar).
- **Adhoc section**: 
  - Chart 1: Daily **Axle App %** = count(bid_origin=='axle-app') / count(bid_origin non-empty).
  - Chart 2 (KPI card + trend): **Reporting Breached %** = distinct tickets where ontime_placement=='Delayed' / distinct total tickets.
  - Detailed split → vendor-level on-time placement compliance.
- Add FilterSheet.

## 7. Shared bits
- New `LineChart` component in `src/components/LineChart.tsx` (SVG, single or dual series, today marker).
- New `VendorSplitTable` component in `src/components/VendorSplitTable.tsx`.
- Extend `FilterSheet` with active filter count badge.

## 8. Env / Defaults
- `verifyLogin` fallback: if `FLEET_APP_PASSWORD` not set, default to `Delhivery@4321`.

## Technical notes
- All new state client-side; no schema changes. No backend beyond existing sheet fetch.
- Match key for `fleetDri`: compare case-insensitively and trim on both sides so free-text login still filters correctly.
- Keep existing routes/components untouched where not listed (profile, vehicle detail, BottomNav).
- Non-functional filter values are hidden if the dataset has none.

Ready to implement on approval.
