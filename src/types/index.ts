export interface ApartmentListing {
    id: string;
    title: string;
    price: number;
    location: string;
    description: string;
    url: string;
    images: string[];
}

export interface ScraperOptions {
    source: string;
    maxListings: number;
    filters?: {
        priceRange?: [number, number];
        bedrooms?: number;
        bathrooms?: number;
    };
}

export type { Apartment } from './apartment'