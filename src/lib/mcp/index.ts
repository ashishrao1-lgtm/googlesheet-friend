import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listAdhocTickets from "./tools/list-adhoc-tickets";
import listFleetActions from "./tools/list-fleet-actions";
import listPendingFixedAttendance from "./tools/list-pending-fixed-attendance";
import logFleetAction from "./tools/log-fleet-action";
import vendorOntimePerformance from "./tools/vendor-ontime-performance";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// Supabase value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "intracity-fleet",
  title: "Intracity Fleet",
  version: "0.1.0",
  instructions:
    "Tools for the Delhivery Intracity Fleet app. Use list_pending_fixed_attendance for fixed contracts whose vehicle has not reported, list_adhoc_tickets for adhoc placements (including driver/vendor phone numbers), vendor_ontime_performance for compliance summaries, and log_fleet_action / list_fleet_actions for follow-up history. Dates are YYYY-MM-DD reporting days.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listPendingFixedAttendance,
    listAdhocTickets,
    vendorOntimePerformance,
    logFleetAction,
    listFleetActions,
  ],
});
