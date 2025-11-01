#!/usr/bin/env node

/**
 * Simple test script to scrape a real apartment website
 * Tests basic scraping functionality without full Supabase setup
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

async function testRealWebsiteScraping() {
    console.log("🏠 Testing Real Apartment Website Scraping");
    console.log("=" * 50);
    
    // Test URLs - real apartment websites
    const testUrls = [
        "https://www.apartments.com/atlanta-ga/",
        "https://www.rent.com/georgia/atlanta-apartments",
        "https://www.forrent.com/find/GA/metro-Atlanta"
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`\n🔍 Testing: ${url}`);
            
            // Set up headers to mimic a real browser
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                }
            });
            
            if (!response.ok) {
                console.log(`❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`);
                continue;
            }
            
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            // Basic scraping - look for common apartment listing elements
            const results = {
                title: document.title,
                priceElements: document.querySelectorAll('[class*="price"], [class*="rent"], [data-testid*="price"]').length,
                propertyElements: document.querySelectorAll('[class*="property"], [class*="listing"], [class*="apartment"]').length,
                linkElements: document.querySelectorAll('a[href*="apartment"], a[href*="property"]').length,
                imageElements: document.querySelectorAll('img[src*="apartment"], img[src*="property"], img[alt*="apartment"]').length
            };
            
            console.log("✅ Scraping Results:");
            console.log(`   Page Title: ${results.title}`);
            console.log(`   💰 Price Elements: ${results.priceElements}`);
            console.log(`   🏠 Property Elements: ${results.propertyElements}`);
            console.log(`   🔗 Property Links: ${results.linkElements}`);
            console.log(`   📸 Property Images: ${results.imageElements}`);
            
            // Extract some sample data
            const samplePrices = Array.from(document.querySelectorAll('[class*="price"], [class*="rent"]'))
                .slice(0, 3)
                .map(el => el.textContent?.trim())
                .filter(text => text && text.includes('$'));
                
            if (samplePrices.length > 0) {
                console.log(`   Sample Prices: ${samplePrices.join(', ')}`);
            }
            
        } catch (error) {
            console.log(`❌ Error scraping ${url}: ${error.message}`);
        }
    }
}

// Test a specific apartment property page
async function testSpecificProperty() {
    console.log("\n🎯 Testing Specific Property Page");
    console.log("=" * 40);
    
    // Vue Midtown - the same site from our call script
    const propertyUrl = "https://www.vuemidtown.com";
    
    try {
        console.log(`🔍 Testing: ${propertyUrl}`);
        
        const response = await fetch(propertyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        console.log("✅ Successfully loaded Vue Midtown");
        console.log(`   Title: ${document.title}`);
        console.log(`   Content Length: ${html.length} characters`);
        
        // Look for apartment-specific data
        const floorPlanElements = document.querySelectorAll('[class*="floor"], [class*="plan"], [class*="unit"]').length;
        const amenityElements = document.querySelectorAll('[class*="amenity"], [class*="feature"]').length;
        const contactElements = document.querySelectorAll('[class*="contact"], [class*="phone"], [class*="email"]').length;
        
        console.log(`   🏗️  Floor Plan Elements: ${floorPlanElements}`);
        console.log(`   ✨ Amenity Elements: ${amenityElements}`);
        console.log(`   📞 Contact Elements: ${contactElements}`);
        
        // Extract meta description
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        if (metaDescription) {
            console.log(`   📝 Description: ${metaDescription.substring(0, 100)}...`);
        }
        
    } catch (error) {
        console.log(`❌ Error testing ${propertyUrl}: ${error.message}`);
    }
}

// Run the tests
async function runTests() {
    try {
        await testRealWebsiteScraping();
        await testSpecificProperty();
        console.log("\n🎉 Scraping tests completed!");
    } catch (error) {
        console.error("❌ Test suite failed:", error);
    }
}

runTests();