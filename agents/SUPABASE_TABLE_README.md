# Create `training_results` table in Supabase

If you received a 404 when pushing extraction results, the `training_results` table likely does not exist in your Supabase project. Use the SQL below in the Supabase SQL editor to create the table.

1. Open your Supabase project
2. Go to **SQL** → **New query**
3. Paste the contents of `create_training_results_table.sql` and run it

If your Supabase project does not support `gen_random_uuid()` you can replace the `id` definition with:

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

or create it as `id serial PRIMARY KEY` depending on your preference.

After creating the table, re-run the push from the `agents` folder using PowerShell:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"; $env:SUPABASE_KEY="<service-role-key>"; $env:SUPABASE_TABLE="training_results"; python run_extraction_and_push.py
```

The script will write the push response to `agents/extraction_results/supabase_push_result.json`.
