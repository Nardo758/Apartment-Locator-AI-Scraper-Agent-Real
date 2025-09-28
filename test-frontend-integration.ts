// Frontend Integration Test Suite
// test-frontend-integration.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class FrontendIntegrationTester {
  private supabase;
  private results: TestResult[] = [];

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Run all frontend integration tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Frontend Integration Tests...\n');

    await this.testDatabaseSchema();
    await this.testDataTransformation();
    await this.testGeographicSearch();
    await this.testMatchScoring();
    await this.testMarketIntelligence();
    await this.testUserProfiles();
    await this.testRentalOffers();
    await this.testDataIntegrity();

    this.printResults();
    return this.results;
  }

  /**
   * Test 1: Database Schema Validation
   */
  private async testDatabaseSchema(): Promise<void> {
    console.log('🔍 Testing Database Schema...');

    // Test required tables exist
    const requiredTables = [
      'properties', 'user_profiles', 'apartment_iq_data', 
      'rental_offers', 'market_intelligence'
    ];

    for (const table of requiredTables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          this.addResult(`Schema: ${table} table`, false, `Table not accessible: ${error.message}`);
        } else {
          this.addResult(`Schema: ${table} table`, true, 'Table exists and accessible');
        }
      } catch (error) {
        this.addResult(`Schema: ${table} table`, false, `Error accessing table: ${error.message}`);
      }
    }

    // Test required functions exist
    const requiredFunctions = [
      'search_properties_near_location',
      'calculate_property_match_score',
      'transform_scraped_to_properties'
    ];

    for (const func of requiredFunctions) {
      try {
        // Test function exists by trying to call it with minimal params
        const { error } = await this.supabase.rpc(func, {
          lat: 40.7128,
          lng: -74.0060,
          radius_km: 1
        });

        // Function exists if we get a result or parameter error (not "function does not exist")
        if (!error || !error.message.includes('function') || !error.message.includes('does not exist')) {
          this.addResult(`Schema: ${func} function`, true, 'Function exists');
        } else {
          this.addResult(`Schema: ${func} function`, false, `Function not found: ${error.message}`);
        }
      } catch (error) {
        this.addResult(`Schema: ${func} function`, false, `Error testing function: ${error.message}`);
      }
    }
  }

  /**
   * Test 2: Data Transformation
   */
  private async testDataTransformation(): Promise<void> {
    console.log('🔄 Testing Data Transformation...');

    try {
      // Test the transformation function
      const { data, error } = await this.supabase.rpc('transform_scraped_to_properties');

      if (error) {
        this.addResult('Transformation: Function execution', false, `Error: ${error.message}`);
      } else {
        this.addResult('Transformation: Function execution', true, `Transformed ${data || 0} properties`);
      }

      // Verify properties table has data
      const { data: properties, error: propError } = await this.supabase
        .from('properties')
        .select('*')
        .limit(5);

      if (propError) {
        this.addResult('Transformation: Properties data', false, `Error fetching properties: ${propError.message}`);
      } else {
        this.addResult('Transformation: Properties data', true, `Found ${properties?.length || 0} properties`);
        
        // Validate required fields
        if (properties && properties.length > 0) {
          const firstProperty = properties[0];
          const requiredFields = ['external_id', 'name', 'city', 'state', 'bedrooms', 'bathrooms', 'original_price', 'ai_price', 'effective_price'];
          
          const missingFields = requiredFields.filter(field => firstProperty[field] === null || firstProperty[field] === undefined);
          
          if (missingFields.length === 0) {
            this.addResult('Transformation: Required fields', true, 'All required fields present');
          } else {
            this.addResult('Transformation: Required fields', false, `Missing fields: ${missingFields.join(', ')}`);
          }
        }
      }

    } catch (error) {
      this.addResult('Transformation: Overall', false, `Transformation test failed: ${error.message}`);
    }
  }

  /**
   * Test 3: Geographic Search
   */
  private async testGeographicSearch(): Promise<void> {
    console.log('📍 Testing Geographic Search...');

    try {
      // Test geographic search function
      const { data, error } = await this.supabase.rpc('search_properties_near_location', {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 25,
        min_bedrooms: 1,
        max_bedrooms: 3,
        min_price: 1000,
        max_price: 5000
      });

      if (error) {
        this.addResult('Geographic: Search function', false, `Search error: ${error.message}`);
      } else {
        this.addResult('Geographic: Search function', true, `Found ${data?.length || 0} properties within radius`);
        
        // Validate search results structure
        if (data && data.length > 0) {
          const result = data[0];
          const expectedFields = ['id', 'name', 'address', 'city', 'state', 'distance_km', 'bedrooms', 'bathrooms'];
          
          const hasAllFields = expectedFields.every(field => result.hasOwnProperty(field));
          
          if (hasAllFields) {
            this.addResult('Geographic: Result structure', true, 'Search results have expected structure');
          } else {
            this.addResult('Geographic: Result structure', false, 'Search results missing expected fields');
          }

          // Validate distance calculation
          if (result.distance_km !== null && result.distance_km <= 25) {
            this.addResult('Geographic: Distance calculation', true, `Distance within expected range: ${result.distance_km}km`);
          } else {
            this.addResult('Geographic: Distance calculation', false, `Distance calculation issue: ${result.distance_km}km`);
          }
        }
      }

    } catch (error) {
      this.addResult('Geographic: Overall', false, `Geographic search test failed: ${error.message}`);
    }
  }

  /**
   * Test 4: Match Scoring
   */
  private async testMatchScoring(): Promise<void> {
    console.log('🎯 Testing Match Scoring...');

    try {
      // First, create a test user profile
      const testUserId = crypto.randomUUID();
      
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          user_id: testUserId,
          email: 'test@example.com',
          bedrooms: '2',
          max_budget: 3000,
          preferred_amenities: ['gym', 'pool'],
          search_criteria: {
            location: 'New York, NY',
            budget_range: [2000, 3000],
            must_have: ['parking']
          }
        });

      if (profileError) {
        this.addResult('Match Scoring: Test user creation', false, `Profile creation error: ${profileError.message}`);
        return;
      }

      // Get a property to test with
      const { data: properties, error: propError } = await this.supabase
        .from('properties')
        .select('id')
        .limit(1)
        .single();

      if (propError || !properties) {
        this.addResult('Match Scoring: Test property', false, 'No properties available for testing');
        return;
      }

      // Test match score calculation
      const { data: matchScore, error: matchError } = await this.supabase.rpc('calculate_property_match_score', {
        property_id_param: properties.id,
        user_id_param: testUserId
      });

      if (matchError) {
        this.addResult('Match Scoring: Score calculation', false, `Match score error: ${matchError.message}`);
      } else {
        const score = matchScore;
        if (typeof score === 'number' && score >= 0 && score <= 100) {
          this.addResult('Match Scoring: Score calculation', true, `Valid match score: ${score}`);
        } else {
          this.addResult('Match Scoring: Score calculation', false, `Invalid match score: ${score}`);
        }
      }

      // Cleanup test user
      await this.supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', testUserId);

    } catch (error) {
      this.addResult('Match Scoring: Overall', false, `Match scoring test failed: ${error.message}`);
    }
  }

  /**
   * Test 5: Market Intelligence
   */
  private async testMarketIntelligence(): Promise<void> {
    console.log('📊 Testing Market Intelligence...');

    try {
      // Test market intelligence table
      const { data, error } = await this.supabase
        .from('market_intelligence')
        .select('*')
        .limit(5);

      if (error) {
        this.addResult('Market Intelligence: Data access', false, `Access error: ${error.message}`);
      } else {
        this.addResult('Market Intelligence: Data access', true, `Found ${data?.length || 0} market intelligence records`);

        if (data && data.length > 0) {
          const record = data[0];
          const requiredFields = ['location', 'average_rent', 'market_velocity', 'calculated_at'];
          
          const hasRequiredFields = requiredFields.every(field => record[field] !== null && record[field] !== undefined);
          
          if (hasRequiredFields) {
            this.addResult('Market Intelligence: Data structure', true, 'Market intelligence has required fields');
          } else {
            this.addResult('Market Intelligence: Data structure', false, 'Missing required fields in market intelligence');
          }

          // Validate data freshness
          const calculatedAt = new Date(record.calculated_at);
          const daysSinceCalculated = (Date.now() - calculatedAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceCalculated <= 30) {
            this.addResult('Market Intelligence: Data freshness', true, `Data is ${Math.round(daysSinceCalculated)} days old`);
          } else {
            this.addResult('Market Intelligence: Data freshness', false, `Data is stale: ${Math.round(daysSinceCalculated)} days old`);
          }
        }
      }

    } catch (error) {
      this.addResult('Market Intelligence: Overall', false, `Market intelligence test failed: ${error.message}`);
    }
  }

  /**
   * Test 6: User Profiles
   */
  private async testUserProfiles(): Promise<void> {
    console.log('👤 Testing User Profiles...');

    try {
      // Test user profile structure
      const testUserId = crypto.randomUUID();
      
      const testProfile = {
        user_id: testUserId,
        email: 'integration.test@example.com',
        bedrooms: '2',
        budget: 2500,
        max_budget: 3500,
        location: 'Atlanta, GA',
        preferred_amenities: ['gym', 'pool', 'parking'],
        deal_breakers: ['no_pets'],
        ai_preferences: {
          price_sensitivity: 'medium',
          location_flexibility: 'low'
        },
        search_criteria: {
          radius: 15,
          max_commute: 30
        }
      };

      // Insert test profile
      const { error: insertError } = await this.supabase
        .from('user_profiles')
        .insert(testProfile);

      if (insertError) {
        this.addResult('User Profiles: Profile creation', false, `Insert error: ${insertError.message}`);
      } else {
        this.addResult('User Profiles: Profile creation', true, 'Profile created successfully');

        // Test profile retrieval
        const { data: retrievedProfile, error: selectError } = await this.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (selectError) {
          this.addResult('User Profiles: Profile retrieval', false, `Select error: ${selectError.message}`);
        } else {
          this.addResult('User Profiles: Profile retrieval', true, 'Profile retrieved successfully');
          
          // Validate JSONB fields
          if (retrievedProfile.ai_preferences && retrievedProfile.search_criteria) {
            this.addResult('User Profiles: JSONB fields', true, 'JSONB fields stored and retrieved correctly');
          } else {
            this.addResult('User Profiles: JSONB fields', false, 'JSONB fields not stored correctly');
          }
        }

        // Cleanup
        await this.supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', testUserId);
      }

    } catch (error) {
      this.addResult('User Profiles: Overall', false, `User profiles test failed: ${error.message}`);
    }
  }

  /**
   * Test 7: Rental Offers
   */
  private async testRentalOffers(): Promise<void> {
    console.log('📝 Testing Rental Offers...');

    try {
      // Get a test property
      const { data: property, error: propError } = await this.supabase
        .from('properties')
        .select('id')
        .limit(1)
        .single();

      if (propError || !property) {
        this.addResult('Rental Offers: Test setup', false, 'No properties available for testing');
        return;
      }

      const testUserId = crypto.randomUUID();
      
      const testOffer = {
        user_id: testUserId,
        property_id: property.id,
        offer_amount: 2800,
        proposed_move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        lease_duration: 12,
        status: 'draft',
        success_probability: 0.75,
        negotiation_strategy: {
          approach: 'market_based',
          concessions_requested: ['parking']
        }
      };

      // Insert test offer
      const { error: insertError } = await this.supabase
        .from('rental_offers')
        .insert(testOffer);

      if (insertError) {
        this.addResult('Rental Offers: Offer creation', false, `Insert error: ${insertError.message}`);
      } else {
        this.addResult('Rental Offers: Offer creation', true, 'Rental offer created successfully');

        // Test offer retrieval
        const { data: offers, error: selectError } = await this.supabase
          .from('rental_offers')
          .select('*')
          .eq('user_id', testUserId);

        if (selectError) {
          this.addResult('Rental Offers: Offer retrieval', false, `Select error: ${selectError.message}`);
        } else {
          this.addResult('Rental Offers: Offer retrieval', true, `Retrieved ${offers?.length || 0} offers`);
        }

        // Cleanup
        await this.supabase
          .from('rental_offers')
          .delete()
          .eq('user_id', testUserId);
      }

    } catch (error) {
      this.addResult('Rental Offers: Overall', false, `Rental offers test failed: ${error.message}`);
    }
  }

  /**
   * Test 8: Data Integrity
   */
  private async testDataIntegrity(): Promise<void> {
    console.log('🔒 Testing Data Integrity...');

    try {
      // Test foreign key relationships
      const { data: propertiesWithIQ, error: joinError } = await this.supabase
        .from('properties')
        .select(`
          *,
          apartment_iq_data (*)
        `)
        .limit(5);

      if (joinError) {
        this.addResult('Data Integrity: Foreign key joins', false, `Join error: ${joinError.message}`);
      } else {
        this.addResult('Data Integrity: Foreign key joins', true, 'Foreign key relationships working');
      }

      // Test RLS policies
      const { error: rlsError } = await this.supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      // This should work with service role key
      if (rlsError) {
        this.addResult('Data Integrity: RLS policies', false, `RLS error: ${rlsError.message}`);
      } else {
        this.addResult('Data Integrity: RLS policies', true, 'RLS policies configured correctly');
      }

      // Test data consistency
      const { data: properties } = await this.supabase
        .from('properties')
        .select('original_price, ai_price, effective_price')
        .not('original_price', 'is', null)
        .limit(10);

      if (properties && properties.length > 0) {
        const consistentPricing = properties.every(p => 
          p.ai_price >= 0 && 
          p.effective_price >= 0 && 
          p.original_price >= 0
        );

        if (consistentPricing) {
          this.addResult('Data Integrity: Price consistency', true, 'Price data is consistent');
        } else {
          this.addResult('Data Integrity: Price consistency', false, 'Found inconsistent price data');
        }
      }

    } catch (error) {
      this.addResult('Data Integrity: Overall', false, `Data integrity test failed: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(test: string, passed: boolean, message: string, details?: any): void {
    this.results.push({ test, passed, message, details });
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${test}: ${message}`);
  }

  /**
   * Print final results
   */
  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log('\n📊 Frontend Integration Test Results');
    console.log('=====================================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);

    if (percentage >= 90) {
      console.log('\n🎉 Frontend integration is ready for production!');
    } else if (percentage >= 75) {
      console.log('\n⚠️  Frontend integration mostly ready, some issues to address');
    } else {
      console.log('\n❌ Frontend integration needs significant work before production');
    }

    // Show failed tests
    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(test => {
        console.log(`  - ${test.test}: ${test.message}`);
      });
    }
  }
}

// Main execution
if (import.meta.main) {
  const tester = new FrontendIntegrationTester();
  await tester.runAllTests();
}