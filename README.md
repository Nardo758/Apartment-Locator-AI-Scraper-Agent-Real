<<<<<<< HEAD
# Apartment-Locator-AI-Scraper-Agent-Real
=======
# Apartment Scraper

## Overview
The Apartment Scraper is a TypeScript-based application designed to scrape apartment listings from various sources. It provides a structured way to gather, parse, and manage apartment data efficiently.

## Project Structure
```
apartment-scraper
├── src
│   ├── main.ts
# Apartment-Locator-AI-Scraper-Agent-Real

## Apartment Scraper — Overview
The Apartment Scraper is a TypeScript-based application designed to scrape apartment listings from various sources. It provides a structured way to gather, parse, and manage apartment data efficiently.

## Project Structure
```
apartment-scraper
├── src
│   ├── main.ts
# Apartment-Locator-AI-Scraper-Agent-Real

## Apartment Scraper — Overview
The Apartment Scraper is a TypeScript-based application designed to scrape apartment listings from various sources. It provides a structured way to gather, parse, and manage apartment data efficiently.

## Project Structure
```
apartment-scraper
├── src
│   ├── main.ts
│   ├── scraper
│   │   └── index.ts
│   ├── utils
│   │   └── index.ts
│   └── types
│       └── index.ts
├── .vscode
│   └── settings.json
├── apartment-scraper.code-workspace
├── deno.json
└── README.md
```

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd apartment-scraper
   ```
3. Install / run using Deno:
   ```bash
   deno run --allow-net --allow-read --allow-write src/main.ts
   ```

## Usage
To run the scraper:
```bash
deno run --allow-net --allow-read --allow-write src/main.ts
```

## Contributing
Contributions welcome—fork and submit a PR.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Secrets & env
Do not commit secret keys. Use `.env.example` as a template and create `.env.local` for dev; add them to `.gitignore`.

Example workflow:
```powershell
cp .env.example .env.local
# edit .env.local with your secrets
```
