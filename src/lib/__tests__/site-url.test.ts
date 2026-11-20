import { describe, it, expect, afterEach } from "vitest";
import { getSiteUrl, site } from "@/config/site";

const original = process.env.SITE_URL;
afterEach(() => {
  if (original === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = original;
});

describe("getSiteUrl", () => {
  it("retombe sur site.url sans slash final", () => {
    delete process.env.SITE_URL;
    expect(getSiteUrl()).toBe(site.url.replace(/\/+$/, ""));
    expect(getSiteUrl()).not.toMatch(/example\.fr/);
  });

  it("privilégie SITE_URL et retire le slash final", () => {
    process.env.SITE_URL = "https://www.hotelvaleur.fr/";
    expect(getSiteUrl()).toBe("https://www.hotelvaleur.fr");
  });

  it("ignore un SITE_URL vide", () => {
    process.env.SITE_URL = "  ";
    expect(getSiteUrl()).toBe(site.url);
  });
});
