import json
import time
from pathlib import Path
import uuid


class Recorder:
    def __init__(self, out_dir: Path, session_id: str = None):
        self.out_dir = out_dir
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.session_id = session_id or uuid.uuid4().hex
        self.jl = out_dir / f"{self.session_id}.jsonl"
        self.step = 0

    def _write(self, record: dict):
        with self.jl.open('a', encoding='utf-8') as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def record_action(self, action_type: str, page_url: str, selector: dict = None, screenshot: str = None, page_html: str = None, visible_text: str = None, extra: dict = None):
        rec = {
            'session_id': self.session_id,
            'step': self.step,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()),
            'action_type': action_type,
            'page_url': page_url,
            'selector': selector,
            'screenshot': screenshot,
            'page_html': page_html,
            'visible_text': (visible_text[:8000] if visible_text else None),
            'extra': extra or {}
        }
        self._write(rec)
        self.step += 1
