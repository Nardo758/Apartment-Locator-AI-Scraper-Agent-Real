// scripts/enqueue_urls.js
// Enqueue provided property URLs into scraping_queue with required fields

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const urls = [
  { name: 'AMLI Arts Center', url: 'https://www.amli.com/apartments/atlanta/midtown-apartments/amli-arts-center' },
  { name: 'AMLI Midtown', url: 'https://www.amli.com/apartments/atlanta/midtown-apartments' },
  { name: 'Atlantic House', url: 'https://atlantichousemidtown.com' },
  { name: 'Novel Midtown Atlanta', url: 'https://novelmidtownatl.com' },
  { name: 'Sentral West Midtown at Star Metals', url: 'https://sentral.com/atlanta/west-midtown' },
  { name: 'Windsor at Midtown', url: 'https://www.windsoratmidtown.com' },
  { name: 'Broadstone 2Thirty Apartments', url: 'https://www.broadstone2thirty.com' },
  { name: 'Centennial Place', url: 'https://www.centennialplaceapts.com' },
  { name: 'The Grace Residences', url: 'https://www.thegraceresidences.com' },
  { name: 'The Standard at Atlanta', url: 'https://www.thestandardatl.com' },
  { name: 'The Vue at Midtown Atlanta', url: 'https://www.vuemidtown.com' },
  { name: 'Novel West Midtown Apartments', url: 'https://www.novelwestmidtown.com' },
  { name: 'Porter Westside', url: 'https://www.porterwestside.com' },
  { name: 'The Exchange at West End', url: 'https://www.exchangewestend.com' },
  { name: 'Cortland Brookhaven', url: 'https://cortland.com/apartments/atlanta-metro/cortland-brookhaven' },
  { name: 'MAA Brookhaven', url: 'https://www.maac.com/georgia/atlanta/maa-brookhaven' },
  { name: 'Post Brookhaven', url: 'https://www.postbrookhaven.com' },
  { name: 'The Reserve at Brookhaven', url: 'https://www.reservebrookhaven.com' },
  { name: 'MAA Milstead', url: 'https://www.maac.com/georgia/atlanta/maa-milstead' },
];

function toSource(url) {
  try { const u = new URL(url); return u.hostname.replace(/^www\./, ''); } catch { return 'web'; }
}

(async () => {
  try {
    const rows = urls.map((item, idx) => {
      const domain = toSource(item.url);
      const external = `${domain}_${Date.now()}_${idx}`;
      return {
        external_id: external,
        property_id: external,
        unit_number: '1',
        url: item.url,
        source: domain,
        status: 'pending',
        priority_score: 85,
      };
    });

    const { data, error } = await supabase.from('scraping_queue').insert(rows).select();
    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }
    console.log(`Inserted ${data.length} jobs`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
