# Fix date filtering for pending-attendance vehicles + Home button styling

## What's wrong (verified against the live sheet)

I queried the raw sheet for Ajaydev K J on 3 August: **138 rows with "Attendance Missing"** — matching your count. Two concrete defects explain the app showing 0:

1. **The date filter reads the wrong column.** For fixed rows the filter compares against `Attendance Date`, but that column is **empty on exactly the rows where attendance is missing** (confirmed: every "Attendance Missing" row has a blank attendance date). So any date range instantly excludes 100% of pending vehicles — in the alerts tab and the tracking tab. The correct date for these rows is **Reporting Time** (the column the alert logic already uses when no filter is set).

2. **Partial data window.** The sheet has 102,843 fixed rows; the app only fetches the last 8,000. That covers all of 3 Aug (7,189 rows) but only fragments of earlier days (e.g. 44 rows for 28 Jul), so any older date the user picks shows a misleadingly small count.

Also verified: the Home button's gradient uses an invalid CSS color function (`in okch` instead of `oklch`), so the whole gradient is dropped and the circle renders white.

## Fixes

### 1. Date filtering on fixed rows
- Filter fixed rows by **Reporting Time**, falling back to Attendance Date only when reporting time is empty. Applies everywhere the fixed filter runs: Home alerts, Tracking (fixed tab), Performance.
- Keep ad-hoc date filtering on Creation Time (correct today), and make the same empty-value fallback safe.
- Rows with no parseable date are excluded when a range is set (instead of the current inconsistent behaviour), so counts always tie to a real day.

### 2. Correct data coverage for the selected day
- Increase the fixed fetch window so a full week of days is always complete (raise the tail to ~45,000 rows, still one batched request, cached 60s as today).
- Show a small note under the filter bar when the selected date falls outside the loaded window, so a user never mistakes truncation for "no pending vehicles".

### 3. Stable alert identity
- Resolved-alert IDs for fixed contracts currently key on the blank attendance date, so different days collapse into one ID. Key them on contract number + reporting-time day instead, so resolving 3 Aug doesn't hide 4 Aug.

### 4. Actionable data surface (both tabs)
- Header line states plainly what's shown: `Fixed pending to mark in · <date> · <count> vehicles`, driven by the same filter state as the list, so the number on screen and the list length can't disagree.
- When a date filter is active, alerts/tracking use that date rather than the dataset's latest day (current behaviour is ambiguous), and a chip shows the active date with one-tap clear.
- Each card stays tappable through to the contract detail with call/WhatsApp and Mark resolved as today.

### 5. Home button appearance
- Fix the invalid gradient so the centre Home button renders as a solid brand gradient circle with its white icon, ring, and shadow, in both active and inactive states.

## Technical notes
- `src/lib/filters.ts`: fixed date predicate switches to `reportingTime || attendanceDate`; shared `inDateRange` tightened for unparseable values.
- `src/lib/fleet.functions.ts`: raise `FIXED_TAIL`; return the earliest loaded date in the payload for the coverage note.
- `src/lib/resolutions.ts`: `fixedAlertId(contractNumber, dayKey(reportingTime))`.
- `src/routes/index.tsx`, `src/routes/tracking.tsx`: use the filter date as the scoping day when set; add count/date header and coverage note.
- `src/components/BottomNav.tsx`: `color-mix(in oklch, ...)` typo fix in the FAB gradient.
- Verification: after the change, filter Ajaydev K J to 3 Aug and confirm the fixed pending count reads 138 in both Home alerts and Tracking.
