export const SIGNIFICANT_FIELDS = [
  'current_price',
  'status',  // active/leased/off_market
  'free_rent_concessions',
  'application_fee',
  'admin_fee_waived',
  'admin_fee_amount',
  'bedrooms',
  'bathrooms'
];

export const COSMETIC_FIELDS = [
  'name',      // Minor wording changes
  'description',
  'images'     // Image rotation
];

export default {
  SIGNIFICANT_FIELDS,
  COSMETIC_FIELDS
};
