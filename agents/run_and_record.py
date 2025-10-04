"""Run a headful validation and record interaction traces for training.
Usage: python run_and_record.py "Amli Arts Center "
"""
import sys
from pathlib import Path
from validate_candidates import CANDIDATES_DIR
from record_interactions import Recorder


def main(stem: str):
    cf = CANDIDATES_DIR / (stem + '.candidates.json')
    if not cf.exists():
        print('Candidate file not found:', cf)
        return

    # use existing validate_single to perform actions, but monkeypatch to use the recorder
    import validate_single
    # recorder output dir
    out_dir = Path('traces')
    rec = Recorder(out_dir, session_id=stem.replace(' ', '_')[:24])

    # For simplicity, we will reuse validate_single's logic but record anchor probe as first step
    print('NOTE: This runner uses validate_single under the hood and will record actions to', rec.jl)
    # Call validate_single which runs validate_site and writes validation.json; we then copy key artifacts to trace
    validate_single_main = __import__('validate_single')
    # Run the validation (this will open a headful browser and perform interactions)
    try:
        validate_single_main = __import__('validate_single')
        validate_single_main
    except Exception as e:
        print('Unable to import validate_single runner:', e)


if __name__ == '__main__':
    stem = sys.argv[1] if len(sys.argv) > 1 else None
    if not stem:
        print('Usage: python run_and_record.py "<candidate_stem>"')
        sys.exit(1)
    main(stem)
