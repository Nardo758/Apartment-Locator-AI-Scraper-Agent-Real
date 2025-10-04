"""
Simple wrapper to validate a single candidate file (by stem) headful for debugging.
Usage: python validate_single.py "Amli Arts Center "
"""
import sys
from pathlib import Path
from validate_candidates import main as validate_main

if __name__ == '__main__':
    stem = sys.argv[1] if len(sys.argv) > 1 else None
    if not stem:
        print('Usage: python validate_single.py "<candidate_stem>"')
        sys.exit(1)
    # call validate_candidates.main but restrict to single file by name
    from validate_candidates import CANDIDATES_DIR, VIDEO_TO_URL
    cf = CANDIDATES_DIR / (stem + '.candidates.json')
    if not cf.exists():
        print('Candidate file not found:', cf)
        sys.exit(1)
    # run headful validation for this single file
    import validate_candidates
    with validate_candidates.sync_playwright() as p:
        r = validate_candidates.validate_site(p, validate_candidates.VIDEO_TO_URL.get(stem), cf, headful=True)
        # sanitize stem for directory name (strip trailing spaces, remove illegal chars)
        safe_stem = stem.strip()
        for ch in '<>:"/\\|?*':
            safe_stem = safe_stem.replace(ch, '_')
        out = Path(validate_candidates.VALIDATED_DIR) / safe_stem
        out.mkdir(parents=True, exist_ok=True)
        (out / 'validation.json').write_text(__import__('json').dumps(r, indent=2), encoding='utf-8')
        print('Wrote', out / 'validation.json')
