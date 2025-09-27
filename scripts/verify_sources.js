const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.argv.find(arg => arg.startsWith('--url=')).split('=')[1];
const SUPABASE_KEY = process.argv.find(arg => arg.startsWith('--key=')).split('=')[1];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing --url or --key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifySources() {
  // Count total rows
  const { count, error: countError } = await supabase
    .from('sources')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting rows:', countError);
    return;
  }

  console.log(`Total sources in table: ${count}`);

  // Get first 5 rows
  const { data, error } = await supabase
    .from('sources')
    .select('name, url, priority')
    .limit(5);

  if (error) {
    console.error('Error fetching rows:', error);
    return;
  }

  console.log('Sample rows:');
  data.forEach(row => console.log(`- ${row.name}: ${row.url} (${row.priority})`));
}

verifySources();