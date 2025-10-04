import json
from pathlib import Path
import statistics
import sys

ROOT = Path(__file__).resolve().parent
VIDEOS_DIR = ROOT / 'videos'
ANALYSIS_DIR = ROOT / 'video_analysis'

try:
    import cv2
except Exception:
    cv2 = None


def find_video_file(name):
    p = VIDEOS_DIR / name
    if p.exists():
        return p
    # try variations
    for ext in ['.mp4', '.webm', '.mov']:
        q = VIDEOS_DIR / (Path(name).stem + ext)
        if q.exists():
            return q
    # try prefix match
    for q in VIDEOS_DIR.iterdir():
        if q.stem.startswith(Path(name).stem):
            return q
    return None


def extract_frames_for_analysis(analysis_path: Path, top_n=3):
    data = json.loads(analysis_path.read_text(encoding='utf-8'))
    video_name = data.get('file')
    samples = data.get('samples', [])

    out_dir = ANALYSIS_DIR / (analysis_path.stem + '_top_frames')
    out_dir.mkdir(parents=True, exist_ok=True)

    timeline_lines = []
    timeline_lines.append(f"Analysis for {analysis_path.name}")
    timeline_lines.append(f"Video file: {video_name}")
    timeline_lines.append(f"Duration: {data.get('duration')}s, fps: {data.get('fps')}, frames: {data.get('frame_count')}")
    timeline_lines.append('')

    if not samples:
        timeline_lines.append('No samples available')
        (out_dir / 'timeline.txt').write_text('\n'.join(timeline_lines), encoding='utf-8')
        return

    # compute stats
    motions = [s.get('motion', 0) for s in samples]
    mean = statistics.mean(motions) if motions else 0
    stdev = statistics.pstdev(motions) if motions else 0

    # pick top N by motion
    ranked = sorted(samples, key=lambda s: s.get('motion', 0), reverse=True)
    top = ranked[:top_n]

    timeline_lines.append('Top motion samples:')
    for s in top:
        timeline_lines.append(f" - t={s['time']:.1f}s motion={s['motion']:.2f} ocr={repr(s.get('ocr'))}")

    timeline_lines.append('\nFull sample timeline (time, motion, ocr):')
    for s in samples:
        timeline_lines.append(f"{s['time']:.1f}s | motion={s['motion']:.2f} | ocr={repr(s.get('ocr'))}")

    # write timeline
    (out_dir / 'timeline.txt').write_text('\n'.join(timeline_lines), encoding='utf-8')

    # extract frames
    video_path = find_video_file(video_name)
    summary = {'video': video_name, 'top_frames': []}

    if video_path is None:
        timeline_lines.append('\nWarning: video file not found in videos/; skipping frame extraction')
        (out_dir / 'timeline.txt').write_text('\n'.join(timeline_lines), encoding='utf-8')
        return

    if cv2 is None:
        timeline_lines.append('\nOpenCV not available; cannot extract frames. Install opencv-python to enable this feature.')
        (out_dir / 'timeline.txt').write_text('\n'.join(timeline_lines), encoding='utf-8')
        return

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    for i, s in enumerate(top):
        t = s['time']
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ret, frame = cap.read()
        if not ret:
            continue
        out_name = out_dir / f"frame_top{i+1}_{int(t*1000)}ms.png"
        cv2.imwrite(str(out_name), frame)
        summary['top_frames'].append({'time': t, 'motion': s.get('motion'), 'ocr': s.get('ocr'), 'image': str(out_name.relative_to(ROOT))})

    cap.release()
    (out_dir / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    # rewrite timeline with any new notes
    (out_dir / 'timeline.txt').write_text('\n'.join(timeline_lines), encoding='utf-8')


def main():
    ANALYSIS_DIR.mkdir(exist_ok=True)
    files = sorted(ANALYSIS_DIR.glob('*.analysis.json'))
    if not files:
        print('No analysis JSON files found in', ANALYSIS_DIR)
        return
    for f in files:
        print('Processing', f.name)
        try:
            extract_frames_for_analysis(f, top_n=3)
            print('Done', f.name)
        except Exception as e:
            print('Error processing', f.name, e)


if __name__ == '__main__':
    main()
