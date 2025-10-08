import { z } from "zod";

export const ScrapedPropertySchema = z.object({
  external_id: z.string(),
  property_id: z.string().optional(),
  unit_number: z.string().optional(),
  property_source_id: z.number().optional(),
  source: z.string(),
  website_name: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  current_price: z.number().nonnegative().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  square_feet: z.number().nonnegative().optional(),
  listing_url: z.string().url().optional(),
  status: z.string().optional(),
  free_rent_concessions: z.string().optional(),
  application_fee: z.number().nonnegative().optional(),
  admin_fee_waived: z.boolean().optional(),
  admin_fee_amount: z.number().nonnegative().optional(),
});

export type ScrapedPropertyType = z.infer<typeof ScrapedPropertySchema>;
