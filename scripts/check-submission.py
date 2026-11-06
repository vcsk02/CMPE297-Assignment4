"""Fail visibly while mandatory external/video deliverables remain incomplete."""
import json
import re
from pathlib import Path
manifest = json.loads(Path('videos/manifest.json').read_text())
missing = []
for part in manifest['parts']:
    if not Path(part['file']).is_file():
        missing.append(f"{part['title']}: MP4 missing")
    if not re.match(r'^https://(?:youtu\.be/|(?:www\.)?youtube\.com/watch\?v=)[A-Za-z0-9_-]{11}(?:[?&].*)?$', part.get('youtube_url') or ''):
        missing.append(f"{part['title']}: valid YouTube URL missing")
    if not part.get('student_explanation_recorded'):
        missing.append(f"{part['title']}: student explanation not recorded/confirmed")
print('\n'.join(missing) if missing else 'All six video entries are ready for your final submission review.')
raise SystemExit(bool(missing))
