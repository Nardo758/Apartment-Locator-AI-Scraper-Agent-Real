import SupabaseClientWrapper from "../src/tools/supabaseClient";

// Minimal Apartment shape used by this script to avoid importing internal types
type Apartment = {
  external_id: string;
  source?: string;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rent_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  amenities?: string[];
  images?: string[];
};
import * as process from "node:process";

function scrapeApartments(): Apartment[] {
  // Replace this with real scraping logic or import an existing scraper.
  return [
    {
      external_id: "ts-example-1",
      source: "ts_example",
      title: "TS 1BR",
      address: "1 TS Way",
      city: "Metropolis",
      state: "NY",
      zip_code: "10001",
      rent_price: 1500,
      bedrooms: 1,
      bathrooms: 1,
      square_feet: 650,
      amenities: ["elevator", "gym"],
    },
  ];
}

async function main() {
  const dryRun = !!process.env.DRY_RUN;
  const supa = new SupabaseClientWrapper();
  const apartments = scrapeApartments();

  for (const apt of apartments) {
    if (dryRun) {
      console.log("DRY_RUN payload:", apt);
      continue;
    }
    const res = await supa.upsertApartment(apt);
    console.log("Upserted:", res);
  }

  if (!dryRun) {
    const deactivated = await supa.deactivateOldListings("ts_example", 14);
    console.log("Deactivated:", deactivated);
  }
}

if (typeof require !== "undefined" && require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
