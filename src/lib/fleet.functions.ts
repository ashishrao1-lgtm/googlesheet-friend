import { createServerFn } from "@tanstack/react-start";

import { getFleetPayload } from "./fleet-data.server";

export type { FixedRow, AdhocRow, FleetPayload } from "./fleet-data.server";

export const getFleetData = createServerFn({ method: "GET" }).handler(async () => {
  return getFleetPayload();
});
