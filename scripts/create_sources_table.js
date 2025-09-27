const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.argv.find(arg => arg.startsWith('--url=')).split('=')[1];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv.find(arg => arg.startsWith('--key=')).split('=')[1];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createSourcesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.sources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Error creating table:', error);
  } else {
    console.log('Sources table created or already exists.');
  }
}

createSourcesTable();