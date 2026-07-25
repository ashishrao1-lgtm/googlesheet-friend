import { createServerFn } from "@tanstack/react-start";

const DEFAULT_PASSWORD = "Delhivery@4321";

export const verifyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { dri: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.FLEET_APP_PASSWORD || DEFAULT_PASSWORD;
    if (!data.dri.trim()) {
      return { ok: false as const, error: "Please enter your name." };
    }
    if (data.password !== expected) {
      return { ok: false as const, error: "Incorrect password." };
    }
    return { ok: true as const };
  });
