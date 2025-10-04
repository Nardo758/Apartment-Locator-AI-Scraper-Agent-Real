import json
from pathlib import Path
import run_extraction_and_push as runner

ROOT = Path(__file__).resolve().parent
combined = ROOT / 'extraction_results' / 'combined_extractions.json'
if not combined.exists():
    print('combined_extractions.json not found')
    raise SystemExit(1)

data = json.loads(combined.read_text(encoding='utf-8'))
records = data.get('reports', [])
res = runner.push_to_supabase(records)
out = ROOT / 'extraction_results' / 'supabase_push_result.json'
out.write_text(json.dumps(res, indent=2), encoding='utf-8')
print('Wrote', out)
