import { ScrapedPropertySchema } from "../src/schemas/scraped-property-schema";

describe("ScrapedPropertySchema", () => {
  test("valid sample passes", () => {
    const sample = {
      external_id: "ext_123",
      property_id: "prop_1",
      unit_number: "101",
      source: "example",
      name: "Nice Apt",
      address: "123 Main St",
      city: "Atlanta",
      state: "GA",
      current_price: 1200,
      bedrooms: 2,
      bathrooms: 1,
      listing_url: "https://example.com/unit/101",
    };

    const parsed = ScrapedPropertySchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  test("invalid sample fails", () => {
    const bad = {
      external_id: 123, // should be string
      current_price: -50, // negative
      listing_url: "not-a-url",
    };
    const parsed = ScrapedPropertySchema.safeParse(bad as any);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("external_id");
      expect(issues).toContain("current_price");
      expect(issues).toContain("listing_url");
    }
  });
});
