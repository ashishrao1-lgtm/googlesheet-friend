import { createServerFn } from "@tanstack/react-start";

export const verifyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { dri: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.FLEET_APP_PASSWORD;
    if (!expected) {
      return { ok: false as const, error: "Server password not configured." };
    }
    if (!data.dri.trim()) {
      return { ok: false as const, error: "Please choose your name." };
    }
    if (data.password !== expected) {
      return { ok: false as const, error: "Incorrect password." };
    }
    return { ok: true as const };
  });
