import { ApartmentScraper } from './scraper/index';

async function main() {
    const scraper = new ApartmentScraper({ source: 'local', maxListings: 50 });
    const listings = await scraper.scrapeListings();
    
    listings.forEach(listing => {
        console.log(listing);
    });
}

main();