import { describe, it, expect } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth.server";

const PUB = "sb_publishable_test";
const h = (init: Record<string, string>) => new Headers(init);

describe("isAuthorizedCronRequest", () => {
  it("accepte la clé publishable via `apikey` quand CRON_SECRET n'est pas défini (compatibilité)", () => {
    expect(isAuthorizedCronRequest(h({ apikey: PUB }), { SUPABASE_PUBLISHABLE_KEY: PUB })).toBe(
      true,
    );
  });

  it("accepte la clé via Authorization: Bearer", () => {
    expect(
      isAuthorizedCronRequest(h({ authorization: `Bearer ${PUB}` }), {
        SUPABASE_PUBLISHABLE_KEY: PUB,
      }),
    ).toBe(true);
  });

  it("refuse une clé erronée ou absente", () => {
    const env = { SUPABASE_PUBLISHABLE_KEY: PUB };
    expect(isAuthorizedCronRequest(h({ apikey: "nope" }), env)).toBe(false);
    expect(isAuthorizedCronRequest(h({}), env)).toBe(false);
  });

  it("refuse tout si aucune clé attendue n'est configurée", () => {
    expect(isAuthorizedCronRequest(h({ apikey: PUB }), {})).toBe(false);
  });

  it("quand CRON_SECRET est défini, exige ce secret et refuse la clé publishable", () => {
    const env = { SUPABASE_PUBLISHABLE_KEY: PUB, CRON_SECRET: "s3cret" };
    expect(isAuthorizedCronRequest(h({ apikey: PUB }), env)).toBe(false);
    expect(isAuthorizedCronRequest(h({ "x-cron-secret": "s3cret", apikey: PUB }), env)).toBe(true);
    expect(isAuthorizedCronRequest(h({ apikey: "s3cret" }), env)).toBe(true);
  });
});
