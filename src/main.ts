import { ApartmentScraper } from './scraper/index.ts';

async function main() {
    const scraper = new ApartmentScraper();
    const listings = await scraper.scrapeListings();
    
    listings.forEach(listing => {
        console.log(listing);
    });
}

main();