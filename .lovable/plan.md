# Fleet App UX Enhancements Plan

## Goal
Make the Delhivery Intracity Fleet app stickier for daily use by adding urgency-aware alerts, follow-up tracking, freshness cues, and a personal scorecard — while refining the existing visual language (no theme rewrite).

The four enhancement areas the user selected are all in scope. All work stays presentation + light-logic unless noted; data still comes from the existing Google Sheets source via the cached `getFleetData()` server function.

---

## 1. SLA timers + smart priority
Currently alerts are rendered in spreadsheet order. Field executives can't tell which follow-up is most urgent.

- New helper `src/lib/sla.ts`:
  - `timeToBreach(reportingTime, now)` → minutes remaining (or negative if breached) using the existing `parseDate`.
  - `slaTone(minutes)` → `"safe"` (>120m), `"warn"` (<=120m), `"breached"` (<=0).
  - `slaLabel(minutes)` → "Breached 12m ago" / "Reports in 1h 20m".
- Re-sort Home alerts (adhoc + fixed) and Tracking lists by urgency: breached first, then soonest reporting time, then chronological.
- Add an SLA chip to each alert/trip card (green/amber/red) showing the countdown to `reportingTime`. Card left-border color follows the SLA tone instead of the current fixed adhoc/fixed accent.
- Apply to: `AdhocAlertCard`, `FixedAlertCard` (index.tsx), `AdhocTripCard`, `FixedPendingCard` (tracking.tsx).

## 2. Quick-call + WhatsApp + action log
Tracking already has `tel:` call buttons. Extend to a real follow-up trail.

- **WhatsApp share**: add a `wa.me` deep-link button (driver/vendor phone + pre-filled message with ticket/contract + center) on tracking cards. Pure client-side, no connector needed (per the click-to-chat guidance).
- **Action log (server-backed audit trail)**: create a `fleet_actions` table so follow-up history persists across devices and managers can review.
  - Migration: `fleet_actions(id uuid pk, dri text not null, ref text not null, kind text not null ['adhoc','fixed'], action text not null ['resolved','called_driver','called_vendor','whatsapp','undo'], label text, center text, note text, created_at timestamptz default now())`.
  - GRANT SELECT, INSERT to `anon` + ALL to `service_role`; enable RLS; policy: anyone may INSERT (validated), SELECT where `dri = current_setting(...)` is not feasible without Supabase auth, so for this shared internal tool SELECT is open to `anon`/`authenticated` (no PII beyond DRI name + vehicle/center). Reuse the `feedback` table's anon-insert pattern.
  - New `src/lib/actions.functions.ts` server fn: `logAction({ dri, ref, kind, action, label, center })` → inserts; `listActions(dri)` → recent actions.
- **"Mark resolved" now also logs** an action. The existing `markResolved` in `resolutions.ts` keeps its localStorage behavior; add a fire-and-forget `logAction` call alongside it.
- **Vehicle detail page** (`src/routes/vehicle.$id.tsx`): show a "Follow-up history" timeline of logged actions for that ref (called vendor @ time, resolved @ time, etc.).
- Call/WhatsApp buttons log their action on tap (best-effort; don't block the `tel:`/`wa.me` navigation).

## 3. Real-time alerts & notifications
The Sheets source is polled, not pushed, and is cached 60s server-side — so "real-time" means fresh-on-open + periodic refresh + clear cues, not true push. Be honest about this in the UI.

- **Refresh**: add a manual "refresh" control in the Home header (next to the filter button) that triggers `queryClient.invalidateQueries(['fleet-data'])` and shows the `data.fetchedAt` timestamp updating. Adds pull-to-refresh feel without a native gesture lib.
- **Background poll**: set `refetchInterval: 60_000` + `refetchOnWindowFocus` on the `fleet-data` query while a tab is visible. The 60s server cache caps Sheets API load.
- **New-arrival detection**: track previously-seen alert IDs (localStorage, per DRI). When a refetch adds new requested tickets or newly-missing fixed vehicles, surface a dismissible in-app banner ("3 new adhoc tickets since you last checked") and pulse the affected cards once.
- **Nav badge**: show a count badge on the Home FAB in `BottomNav` for total open alerts (adhoc requested + fixed missing for the latest data day).
- **Web Notifications**: optional "Enable alerts" toggle (Profile) that requests Notification permission and fires a local notification when the background poll finds new urgent (breached) alerts while the tab is hidden. Gracefully no-ops where unsupported.

## 4. Daily digest + personal scorecard
- **Home "Today" digest card** (top of the alerts list, above the section heading): compact summary for the latest data day —
  - Adhoc: `X requested · Y truck-confirmed · breach % today`
  - Fixed: `X missing attendance · on-time % today`
  - `Z resolved by you today`
- **Personal scorecard** (new section on the Performance page, above the charts): compares the DRI's AOR vs the team average computed from all DRIs in the dataset (using the full `data.fixed`/`data.adhoc`, not just `mine`):
  - Your fixed on-time % vs team avg
  - Your reporting-breach % vs team avg
  - Your resolution rate (resolved / total alerts) 
  - Simple bars with the two values side by side and a "vs team" delta chip (▲/▼).
- **Morning digest**: on first app open of a new calendar day (track last-opened day in localStorage), show a one-time summary banner that doubles as the digest card.

## 5. Visual refinements (keep current look)
No theme rewrite. Targeted polish within the existing token system in `src/styles.css`:
- Refined alert cards: tighter hierarchy, SLA color cue, subtle gradient header strip on breached cards.
- Smoother `animate-rise` with a staggered delay so lists cascade in.
- Sticky tab bar: add a soft top gradient/blur and active-tab underline.
- BottomNav Home FAB: add a tiny badge dot anchor and a gentle pulse when there are new alerts.
- Add a `--color-info`-tinted "new" pill and a `--color-warning` amber state for SLA-warn (tokens already exist).
- Keep all colors via semantic tokens; no hardcoded values in components.

---

## File-by-file changes
- `src/lib/sla.ts` (new) — SLA helpers.
- `src/lib/actions.functions.ts` (new) — server fns for action log.
- `src/lib/resolutions.ts` — `markResolved`/`unresolve` also call `logAction`.
- `src/routes/index.tsx` — SLA sorting + chips on alert cards, Today digest card, refresh control, new-arrival banner, nav badge data, staggered animations.
- `src/routes/tracking.tsx` — SLA chips, WhatsApp button, action logging on call/whatsapp, staggered animations.
- `src/routes/performance.tsx` — personal scorecard section vs team average.
- `src/routes/vehicle.$id.tsx` — follow-up history timeline from action log.
- `src/routes/profile.tsx` — "Enable alerts" notification toggle.
- `src/components/BottomNav.tsx` — Home FAB badge count + pulse.
- `src/styles.css` — staggered rise utility, "new" pill, SLA-warn/amber usage, refined card styles.
- DB migration — `fleet_actions` table + GRANT + RLS.
- `src/routes/index.tsx` query options — add `refetchInterval` / `refetchOnWindowFocus`.

## Out of scope
- No change to the Google Sheets data source, the `getFleetData` cache, or auth/login flow.
- No true server push (data source is polled); "real-time" is implemented as periodic refetch + local notifications.
- No full theme redesign (user chose to keep current look).
- No GPS/live vehicle tracking (no location data in the source).
