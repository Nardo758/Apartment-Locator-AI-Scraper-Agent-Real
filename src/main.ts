import { ApartmentScraper } from './scraper/index';
import { startMetricsServer } from './observability/server';
import process from "node:process";

async function main() {
    const enableMetrics = String(process.env.ENABLE_METRICS || 'false').toLowerCase() === 'true';
    const metricsPort = Number(process.env.METRICS_PORT || 9090);
    if (enableMetrics) startMetricsServer({ port: metricsPort, enabled: true });

    const scraper = new ApartmentScraper({ source: 'local', maxListings: 50 });
    const listings = await scraper.scrapeListings();
    
    listings.forEach(listing => {
        console.log(listing);
    });
}

main();