import { afterEach, describe, expect, it, vi } from "vitest";

// These assert the *default*, not the mechanism: a fresh clone with no env vars must
// ship no third-party analytics. The flag is read at module load, so each case
// re-imports with its own environment.

async function loadAnalytics(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
  return import("./analytics");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GA configuration", () => {
  it("is disabled when no Measurement ID is set", async () => {
    const { GA_MEASUREMENT_ID, gaEnabled } = await loadAnalytics({});
    expect(GA_MEASUREMENT_ID).toBe("");
    expect(gaEnabled).toBe(false);
  });

  it("enables only from the Measurement ID", async () => {
    const { gaEnabled } = await loadAnalytics({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST1" });
    expect(gaEnabled).toBe(true);
  });

  it("stays cookieless unless consent is explicitly granted", async () => {
    const unset = await loadAnalytics({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST1" });
    expect(unset.GA_COOKIELESS).toBe(true);

    const granted = await loadAnalytics({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST1",
      NEXT_PUBLIC_GA_CONSENT: "granted",
    });
    expect(granted.GA_COOKIELESS).toBe(false);
  });
});
