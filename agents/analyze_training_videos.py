import json
import os
from pathlib import Path
import sys

# Optional heavy deps. If missing, we will show a helpful message instead of crashing.
try:
    import cv2
except Exception:
    cv2 = None

try:
    import numpy as np
except Exception:
    np = None

try:
    import pytesseract
except Exception:
    pytesseract = None

ROOT = Path(__file__).resolve().parent
VIDEOS_DIR = ROOT / 'videos'
ANALYSIS_DIR = ROOT / 'video_analysis'


def ensure_dirs():
    VIDEOS_DIR.mkdir(exist_ok=True)
    ANALYSIS_DIR.mkdir(exist_ok=True)


def analyze_video(path: Path, sample_rate=1.0):
    if cv2 is None or np is None:
        raise RuntimeError('Missing dependencies: please install opencv-python and numpy to analyze videos. See README or run: pip install opencv-python numpy')

    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps else 0

    samples = []
    prev_gray = None

    idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        t = idx / fps
        # sample according to sample_rate (samples per second)
        if sample_rate > 0 and (t % (1.0 / sample_rate) > 1e-6):
            idx += 1
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        motion = 0.0
        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray)
            motion = float(np.mean(diff))

        text = None
        if pytesseract is not None:
            try:
                text = pytesseract.image_to_string(gray)
                text = text.strip() if text else None
            except Exception:
                text = None

        samples.append({'time': t, 'motion': motion, 'ocr': text})
        prev_gray = gray
        idx += 1

    cap.release()

    return {
        'file': str(path.name),
        'fps': fps,
        'frame_count': frame_count,
        'duration': duration,
        'samples': samples,
    }


def main():
    ensure_dirs()
    vids = sorted(VIDEOS_DIR.glob('*.webm')) + sorted(VIDEOS_DIR.glob('*.mp4'))
    if not vids:
        print('No videos found in', VIDEOS_DIR)
        return

    for v in vids:
        print('Analyzing', v)
        try:
            out = analyze_video(v, sample_rate=1.0)
        except RuntimeError as e:
            print('Error analyzing', v, '-', e)
            print('\nQuick install on Windows PowerShell:')
            print('  pip install opencv-python numpy pytesseract')
            print('Also install the Tesseract engine separately (https://github.com/tesseract-ocr/tesseract) and ensure it is on PATH if you want OCR.')
            return
        out_path = ANALYSIS_DIR / (v.stem + '.analysis.json')
        out_path.write_text(json.dumps(out, indent=2), encoding='utf-8')
        print('Wrote', out_path)


if __name__ == '__main__':
    main()
