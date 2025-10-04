import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
ANALYSIS_DIR = ROOT / 'video_analysis'
CANDIDATES_DIR = ROOT / 'candidates'

CANDIDATES_DIR.mkdir(exist_ok=True)


def text_to_candidate_selectors(text):
    """Given text (from OCR), produce a small set of candidate selectors.
    Heuristics:
    - If text contains keywords like Apply / Availability / Floor Plan produce text-match XPaths
    - Produce lowercased token matches for simpler CSS selectors
    """
    if not text:
        return []
    text = text.strip()
    # normalize
    norm = re.sub(r'[^\w\s-]', ' ', text).strip()
    tokens = [t for t in re.split(r'\s+', norm) if t]
    tokens = tokens[:6]

    candidates = []
    keywords = ['apply', 'availability', 'floor', 'plan', 'availability', 'rent', 'price', 'tour']
    joined = ' '.join(tokens).lower()
    for k in keywords:
        if k in joined:
            # text-based XPath
            expr = "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '%s')]" % k
            candidates.append({'type': 'xpath_text_contains', 'expr': expr})

    # general token-based candidate xpaths
    for t in tokens:
        t_l = t.lower()
        if len(t_l) < 3:
            continue
        expr = "//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '%s')]" % t_l
        candidates.append({'type': 'xpath_text_token', 'expr': expr})

    # dedupe by expr
    seen = set()
    out = []
    for c in candidates:
        e = c['expr']
        if e in seen:
            continue
        seen.add(e)
        out.append(c)
    return out


def generate_for_analysis_dir(dirpath: Path):
    summary = dirpath / 'summary.json'
    if not summary.exists():
        return
    data = json.loads(summary.read_text(encoding='utf-8'))
    top_frames = data.get('top_frames', [])
    candidates = []
    for tf in top_frames:
        ocr = tf.get('ocr')
        candidates_from_text = text_to_candidate_selectors(ocr or '')
        candidates.append({'time': tf.get('time'), 'motion': tf.get('motion'), 'ocr': ocr, 'candidates': candidates_from_text, 'image': tf.get('image')})

    out_path = CANDIDATES_DIR / (dirpath.stem + '.candidates.json')
    out_path.write_text(json.dumps({'analysis_dir': str(dirpath.name), 'candidates': candidates}, indent=2), encoding='utf-8')
    print('Wrote', out_path)


def main():
    for d in sorted(ANALYSIS_DIR.iterdir()):
        if d.is_dir() and d.name.endswith('_top_frames'):
            generate_for_analysis_dir(d)


if __name__ == '__main__':
    main()
