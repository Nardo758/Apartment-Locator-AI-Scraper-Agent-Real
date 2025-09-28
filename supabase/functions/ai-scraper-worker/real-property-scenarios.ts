/**
 * Real Property Test Scenarios
 * 
 * This module contains realistic property listing HTML templates
 * that mirror actual apartment rental websites for comprehensive testing.
 */

export interface PropertyScenario {
  type: string;
  description: string;
  sources: string[];
  htmlTemplate: string;
  expectedFields: string[];
  priceRange: [number, number];
  commonIssues?: string[];
}

export const REAL_PROPERTY_SCENARIOS: PropertyScenario[] = [
  {
    type: "luxury_high_rise",
    description: "Luxury high-rise apartments with premium amenities",
    sources: ["apartments.com", "zillow.com", "luxuryapartments.com"],
    htmlTemplate: `
      <div class="luxury-apartment-listing" data-testid="property-details">
        <header class="property-header">
          <h1 class="property-name">{{PROPERTY_NAME}}</h1>
          <div class="property-address">
            <span class="street">{{STREET_ADDRESS}}</span>
            <span class="city-state">{{CITY}}, {{STATE}} {{ZIP}}</span>
          </div>
        </header>
        
        <section class="pricing-section">
          <div class="rent-price" data-price="{{MONTHLY_RENT}}">
            <span class="currency">$</span>
            <span class="amount">{{MONTHLY_RENT}}</span>
            <span class="period">/month</span>
          </div>
          <div class="deposit-info">Security deposit: ${{SECURITY_DEPOSIT}}</div>
        </section>
        
        <section class="unit-details">
          <div class="bedrooms">
            <span class="bed-count">{{BEDROOMS}}</span>
            <span class="bed-label">{{BEDROOM_LABEL}}</span>
          </div>
          <div class="bathrooms">
            <span class="bath-count">{{BATHROOMS}}</span>
            <span class="bath-label">{{BATHROOM_LABEL}}</span>
          </div>
          <div class="square-footage">{{SQUARE_FEET}} sq ft</div>
        </section>
        
        <section class="amenities-section">
          <h3>Building Amenities</h3>
          <ul class="amenity-list">
            <li>24/7 concierge service</li>
            <li>Rooftop fitness center</li>
            <li>Swimming pool and spa</li>
            <li>Business center</li>
            <li>Pet-friendly with dog park</li>
          </ul>
        </section>
        
        <section class="lease-terms">
          <div class="fees">
            <div class="application-fee">Application fee: ${{APPLICATION_FEE}}</div>
            <div class="admin-fee">Admin fee: ${{ADMIN_FEE}} {{ADMIN_FEE_WAIVED}}</div>
            <div class="pet-fee">Pet deposit: ${{PET_DEPOSIT}} (refundable)</div>
          </div>
          <div class="specials">
            <p class="special-offer">{{SPECIAL_OFFER}}</p>
          </div>
        </section>
      </div>
    `,
    expectedFields: ["name", "address", "city", "state", "current_price", "bedrooms", "bathrooms"],
    priceRange: [3000, 8000],
    commonIssues: ["Complex HTML structure", "Multiple price elements", "Amenity parsing"]
  },

  {
    type: "budget_apartment",
    description: "Affordable apartment listings with basic amenities",
    sources: ["rent.com", "padmapper.com", "forrent.com"],
    htmlTemplate: `
      <article class="budget-listing">
        <div class="listing-header">
          <h2 class="apartment-title">{{PROPERTY_NAME}}</h2>
          <address class="location">
            {{STREET_ADDRESS}}<br>
            {{CITY}}, {{STATE}} {{ZIP}}
          </address>
        </div>
        
        <div class="rent-info">
          <span class="monthly-rent">${{MONTHLY_RENT}}</span>
          <span class="rent-label">per month</span>
        </div>
        
        <div class="unit-specs">
          <span class="bedrooms">{{BEDROOMS}} {{BEDROOM_LABEL}}</span>
          <span class="separator">•</span>
          <span class="bathrooms">{{BATHROOMS}} {{BATHROOM_LABEL}}</span>
          <span class="separator">•</span>
          <span class="sqft">{{SQUARE_FEET}} sqft</span>
        </div>
        
        <div class="property-features">
          <ul>
            <li>Air conditioning</li>
            <li>On-site laundry</li>
            <li>Parking available</li>
            <li>{{SPECIAL_FEATURE}}</li>
          </ul>
        </div>
        
        <div class="lease-details">
          <p class="fee-info">{{FEE_INFO}}</p>
          <p class="availability">Available {{AVAILABILITY_DATE}}</p>
          {{SPECIAL_OFFER}}
        </div>
      </article>
    `,
    expectedFields: ["name", "address", "city", "state", "current_price", "bedrooms", "bathrooms"],
    priceRange: [800, 2500],
    commonIssues: ["Minimal structured data", "Inconsistent formatting", "Missing fields"]
  },

  {
    type: "suburban_house",
    description: "Single-family house rentals in suburban areas",
    sources: ["zillow.com", "realtor.com", "homes.com"],
    htmlTemplate: `
      <div class="house-rental-listing">
        <section class="property-overview">
          <h1 class="house-title">{{PROPERTY_NAME}}</h1>
          <div class="house-address">
            <div class="street">{{STREET_ADDRESS}}</div>
            <div class="city-state-zip">{{CITY}}, {{STATE}} {{ZIP}}</div>
          </div>
        </section>
        
        <section class="rental-pricing">
          <div class="monthly-rent">
            <span class="price-label">Monthly Rent:</span>
            <span class="price-amount">${{MONTHLY_RENT}}</span>
          </div>
          <div class="security-deposit">
            <span class="deposit-label">Security Deposit:</span>
            <span class="deposit-amount">${{SECURITY_DEPOSIT}}</span>
          </div>
        </section>
        
        <section class="house-specifications">
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Bedrooms:</span>
              <span class="spec-value">{{BEDROOMS}}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Bathrooms:</span>
              <span class="spec-value">{{BATHROOMS}}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Square Feet:</span>
              <span class="spec-value">{{SQUARE_FEET}}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Lot Size:</span>
              <span class="spec-value">{{LOT_SIZE}}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Garage:</span>
              <span class="spec-value">{{GARAGE_SPACES}} car garage</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Year Built:</span>
              <span class="spec-value">{{YEAR_BUILT}}</span>
            </div>
          </div>
        </section>
        
        <section class="house-features">
          <h3>Property Features</h3>
          <div class="feature-categories">
            <div class="interior-features">
              <h4>Interior</h4>
              <ul>
                <li>Updated kitchen with stainless appliances</li>
                <li>Hardwood floors</li>
                <li>Central air and heating</li>
                <li>{{INTERIOR_FEATURE}}</li>
              </ul>
            </div>
            <div class="exterior-features">
              <h4>Exterior</h4>
              <ul>
                <li>Private backyard</li>
                <li>{{EXTERIOR_FEATURE}}</li>
                <li>Sprinkler system</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section class="rental-terms">
          <div class="fees-and-deposits">
            <p>Application fee: ${{APPLICATION_FEE}} per adult applicant</p>
            <p>Pet deposit: ${{PET_DEPOSIT}} ({{PET_POLICY}})</p>
            <p>{{ADMIN_FEE_INFO}}</p>
          </div>
          <div class="lease-terms">
            <p>Minimum lease term: {{LEASE_TERM}}</p>
            <p>{{SPECIAL_TERMS}}</p>
          </div>
        </section>
      </div>
    `,
    expectedFields: ["name", "address", "city", "state", "current_price", "bedrooms", "bathrooms"],
    priceRange: [1500, 5000],
    commonIssues: ["Detailed specs parsing", "Multiple fee types", "Feature categorization"]
  },

  {
    type: "studio_loft",
    description: "Urban studio and loft apartments",
    sources: ["apartments.com", "lofts.com", "urbanstudios.com"],
    htmlTemplate: `
      <div class="studio-loft-listing">
        <header class="loft-header">
          <h1>{{PROPERTY_NAME}}</h1>
          <div class="loft-location">{{STREET_ADDRESS}}, {{CITY}}, {{STATE}} {{ZIP}}</div>
        </header>
        
        <div class="pricing-container">
          <div class="rent-display">
            <span class="dollar-sign">$</span>
            <span class="rent-amount">{{MONTHLY_RENT}}</span>
            <span class="rent-period">/mo</span>
          </div>
        </div>
        
        <div class="unit-info">
          <div class="unit-type">{{UNIT_TYPE}}</div>
          <div class="bathroom-count">{{BATHROOMS}} bathroom{{BATHROOM_PLURAL}}</div>
          <div class="square-footage">{{SQUARE_FEET}} square feet</div>
        </div>
        
        <div class="loft-features">
          <h3>Features</h3>
          <div class="feature-list">
            <span class="feature">High ceilings</span>
            <span class="feature">Exposed brick</span>
            <span class="feature">Large windows</span>
            <span class="feature">{{UNIQUE_FEATURE}}</span>
            <span class="feature">{{APPLIANCE_PACKAGE}}</span>
          </div>
        </div>
        
        <div class="building-info">
          <h3>Building</h3>
          <p>{{BUILDING_DESCRIPTION}}</p>
          <ul class="building-amenities">
            <li>{{BUILDING_AMENITY_1}}</li>
            <li>{{BUILDING_AMENITY_2}}</li>
            <li>{{BUILDING_AMENITY_3}}</li>
          </ul>
        </div>
        
        <div class="rental-info">
          <div class="fees">
            {{APPLICATION_FEE_TEXT}}
            {{ADMIN_FEE_TEXT}}
          </div>
          <div class="incentives">
            {{MOVE_IN_SPECIAL}}
          </div>
        </div>
      </div>
    `,
    expectedFields: ["name", "address", "city", "state", "current_price", "bedrooms", "bathrooms"],
    priceRange: [1200, 4000],
    commonIssues: ["Studio vs bedroom classification", "Loft-specific features", "Urban pricing variations"]
  },

  {
    type: "corporate_housing",
    description: "Furnished corporate housing and extended stays",
    sources: ["corporatehousing.com", "extendedstay.com", "furnished.com"],
    htmlTemplate: `
      <div class="corporate-housing-listing">
        <div class="property-title-section">
          <h1 class="corporate-property-name">{{PROPERTY_NAME}}</h1>
          <div class="corporate-address">
            {{STREET_ADDRESS}}<br>
            {{CITY}}, {{STATE}} {{ZIP}}
          </div>
          <div class="property-type">{{PROPERTY_TYPE}} - Fully Furnished</div>
        </div>
        
        <div class="corporate-pricing">
          <div class="rate-structure">
            <div class="monthly-rate">
              <span class="rate-label">Monthly Rate:</span>
              <span class="rate-amount">${{MONTHLY_RATE}}</span>
            </div>
            <div class="weekly-rate">
              <span class="rate-label">Weekly Rate:</span>
              <span class="rate-amount">${{WEEKLY_RATE}}</span>
            </div>
            <div class="nightly-rate">
              <span class="rate-label">Nightly Rate:</span>
              <span class="rate-amount">${{NIGHTLY_RATE}}</span>
            </div>
          </div>
        </div>
        
        <div class="unit-configuration">
          <div class="bedroom-info">{{BEDROOMS}} Bedroom{{BEDROOM_PLURAL}}</div>
          <div class="bathroom-info">{{BATHROOMS}} Bathroom{{BATHROOM_PLURAL}}</div>
          <div class="occupancy">Sleeps up to {{MAX_OCCUPANCY}}</div>
        </div>
        
        <div class="furnished-details">
          <h3>Included Furnishings</h3>
          <div class="furnishing-categories">
            <div class="living-room">
              <h4>Living Area</h4>
              <ul>
                <li>{{LIVING_ROOM_FURNITURE}}</li>
                <li>Flat-screen TV</li>
                <li>High-speed internet</li>
              </ul>
            </div>
            <div class="kitchen">
              <h4>Kitchen</h4>
              <ul>
                <li>Full kitchen appliances</li>
                <li>Cookware and dishware</li>
                <li>{{KITCHEN_AMENITY}}</li>
              </ul>
            </div>
            <div class="bedroom">
              <h4>Bedroom</h4>
              <ul>
                <li>{{BEDROOM_FURNITURE}}</li>
                <li>Premium linens</li>
                <li>{{BEDROOM_AMENITY}}</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="corporate-services">
          <h3>Corporate Services</h3>
          <ul>
            <li>{{SERVICE_1}}</li>
            <li>{{SERVICE_2}}</li>
            <li>{{SERVICE_3}}</li>
            <li>24/7 guest services</li>
          </ul>
        </div>
        
        <div class="booking-terms">
          <div class="minimum-stay">Minimum stay: {{MINIMUM_STAY}}</div>
          <div class="cancellation">{{CANCELLATION_POLICY}}</div>
          <div class="fees">
            <p>{{CLEANING_FEE}}</p>
            <p>{{SECURITY_DEPOSIT}}</p>
            <p>{{ADDITIONAL_FEES}}</p>
          </div>
        </div>
      </div>
    `,
    expectedFields: ["name", "address", "city", "state", "current_price", "bedrooms", "bathrooms"],
    priceRange: [2500, 12000],
    commonIssues: ["Multiple rate types", "Corporate vs residential classification", "Service inclusions"]
  }
];

export interface TestPropertyVariation {
  propertyName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  specialOffers?: string[];
  fees?: {
    application?: number;
    admin?: number;
    pet?: number;
    security?: number;
  };
}

export const CITY_VARIATIONS = [
  { city: "New York", state: "NY", zip: "10001", priceMultiplier: 2.5 },
  { city: "San Francisco", state: "CA", zip: "94102", priceMultiplier: 2.3 },
  { city: "Los Angeles", state: "CA", zip: "90210", priceMultiplier: 2.0 },
  { city: "Seattle", state: "WA", zip: "98101", priceMultiplier: 1.8 },
  { city: "Boston", state: "MA", zip: "02101", priceMultiplier: 1.7 },
  { city: "Washington", state: "DC", zip: "20001", priceMultiplier: 1.6 },
  { city: "Chicago", state: "IL", zip: "60601", priceMultiplier: 1.4 },
  { city: "Miami", state: "FL", zip: "33101", priceMultiplier: 1.3 },
  { city: "Denver", state: "CO", zip: "80202", priceMultiplier: 1.2 },
  { city: "Austin", state: "TX", zip: "78701", priceMultiplier: 1.1 },
  { city: "Portland", state: "OR", zip: "97201", priceMultiplier: 1.1 },
  { city: "Nashville", state: "TN", zip: "37201", priceMultiplier: 1.0 },
  { city: "Phoenix", state: "AZ", zip: "85001", priceMultiplier: 0.9 },
  { city: "Atlanta", state: "GA", zip: "30301", priceMultiplier: 0.9 },
  { city: "Dallas", state: "TX", zip: "75201", priceMultiplier: 0.8 }
];

export const SPECIAL_OFFERS = [
  "First month rent free with 12-month lease",
  "Two months free rent with 24-month lease", 
  "No application fee this month",
  "Waived admin fee for qualified applicants",
  "Move-in ready - no security deposit required",
  "$500 off first month's rent",
  "Free parking for first 6 months",
  "Complimentary gym membership included",
  "Pet deposit waived with approved application"
];

/**
 * Generate a realistic property variation
 */
export function generatePropertyVariation(
  scenario: PropertyScenario,
  cityIndex: number,
  variationIndex: number
): TestPropertyVariation {
  const city = CITY_VARIATIONS[cityIndex % CITY_VARIATIONS.length];
  const basePrice = scenario.priceRange[0] + 
    (scenario.priceRange[1] - scenario.priceRange[0]) * Math.random();
  const adjustedPrice = Math.round(basePrice * city.priceMultiplier);
  
  const bedrooms = scenario.type === "studio_loft" ? 0 : Math.floor(Math.random() * 4) + 1;
  const bathrooms = bedrooms === 0 ? 1 : Math.max(1, bedrooms - Math.floor(Math.random() * 2));
  const squareFeet = bedrooms === 0 ? 400 + Math.floor(Math.random() * 300) :
    600 + (bedrooms * 300) + Math.floor(Math.random() * 400);

  return {
    propertyName: `${scenario.description.split(' ')[0]} ${city.city} ${variationIndex}`,
    streetAddress: `${100 + variationIndex} ${['Main', 'Oak', 'Pine', 'Elm', 'Park'][variationIndex % 5]} Street`,
    city: city.city,
    state: city.state,
    zip: city.zip,
    monthlyRent: adjustedPrice,
    bedrooms,
    bathrooms,
    squareFeet,
    specialOffers: Math.random() > 0.6 ? [SPECIAL_OFFERS[variationIndex % SPECIAL_OFFERS.length]] : undefined,
    fees: {
      application: Math.random() > 0.3 ? 50 + Math.floor(Math.random() * 100) : undefined,
      admin: Math.random() > 0.4 ? 100 + Math.floor(Math.random() * 300) : undefined,
      pet: Math.random() > 0.5 ? 200 + Math.floor(Math.random() * 300) : undefined,
      security: adjustedPrice // Usually equal to one month's rent
    }
  };
}

/**
 * Fill a scenario template with property data
 */
export function fillScenarioTemplate(
  scenario: PropertyScenario, 
  variation: TestPropertyVariation
): string {
  let html = scenario.htmlTemplate;
  
  // Basic replacements
  const replacements = {
    '{{PROPERTY_NAME}}': variation.propertyName,
    '{{STREET_ADDRESS}}': variation.streetAddress,
    '{{CITY}}': variation.city,
    '{{STATE}}': variation.state,
    '{{ZIP}}': variation.zip,
    '{{MONTHLY_RENT}}': variation.monthlyRent.toLocaleString(),
    '{{BEDROOMS}}': variation.bedrooms.toString(),
    '{{BATHROOMS}}': variation.bathrooms.toString(),
    '{{SQUARE_FEET}}': variation.squareFeet.toLocaleString(),
    '{{BEDROOM_LABEL}}': variation.bedrooms === 1 ? 'bedroom' : 'bedrooms',
    '{{BATHROOM_LABEL}}': variation.bathrooms === 1 ? 'bathroom' : 'bathrooms',
    '{{BEDROOM_PLURAL}}': variation.bedrooms === 1 ? '' : 's',
    '{{BATHROOM_PLURAL}}': variation.bathrooms === 1 ? '' : 's',
    '{{APPLICATION_FEE}}': variation.fees?.application?.toString() || '0',
    '{{ADMIN_FEE}}': variation.fees?.admin?.toString() || '0',
    '{{SECURITY_DEPOSIT}}': variation.fees?.security?.toString() || variation.monthlyRent.toString(),
    '{{SPECIAL_OFFER}}': variation.specialOffers?.[0] || 'Contact for current specials'
  };
  
  // Apply all replacements
  Object.entries(replacements).forEach(([placeholder, value]) => {
    html = html.replace(new RegExp(placeholder, 'g'), value);
  });
  
  // Handle remaining placeholders with defaults
  html = html.replace(/\{\{[^}]+\}\}/g, match => {
    console.warn(`Unhandled placeholder: ${match}`);
    return 'N/A';
  });
  
  return html;
}

/**
 * Generate test properties using all scenarios
 */
export function generateRealTestProperties(count: number = 100): Array<{
  id: number;
  source: string;
  url: string;
  cleanHtml: string;
  external_id: string;
  source_url: string;
  source_name: string;
  scraping_job_id: number;
  scenario: string;
  expectedPrice: number;
  expectedBedrooms: number;
  expectedBathrooms: number;
}> {
  const properties = [];
  
  for (let i = 0; i < count; i++) {
    const scenario = REAL_PROPERTY_SCENARIOS[i % REAL_PROPERTY_SCENARIOS.length];
    const source = scenario.sources[i % scenario.sources.length];
    const variation = generatePropertyVariation(scenario, i, i);
    const html = fillScenarioTemplate(scenario, variation);
    
    properties.push({
      id: i + 1,
      source,
      url: `https://${source}/listing/${variation.state.toLowerCase()}-${i + 1}`,
      cleanHtml: html,
      external_id: `real-test-${source}-${i + 1}`,
      source_url: `https://${source}/listing/${variation.state.toLowerCase()}-${i + 1}`,
      source_name: source,
      scraping_job_id: Math.floor(i / 10) + 1,
      scenario: scenario.type,
      expectedPrice: variation.monthlyRent,
      expectedBedrooms: variation.bedrooms,
      expectedBathrooms: variation.bathrooms
    });
  }
  
  return properties;
}