"""Keep caption cues readable: at most two lines of about 42 characters."""
import re
import textwrap
from pathlib import Path


def seconds(value):
    h, m, s = value.replace(',', '.').split(':')
    return int(h) * 3600 + int(m) * 60 + float(s)


def stamp(value):
    ms = round(value * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}'


for file in sorted(Path('videos').glob('*.srt')):
    output, index = [], 1
    for cue in re.split(r'\n\s*\n', file.read_text().strip()):
        lines = cue.splitlines()
        start, end = [seconds(t) for t in lines[1].split(' --> ')]
        wrapped = textwrap.wrap(' '.join(lines[2:]), width=42)
        chunks = ['\n'.join(wrapped[i:i + 2]) for i in range(0, len(wrapped), 2)]
        weights = [len(c.replace('\n', ' ')) for c in chunks]
        cursor = start
        for chunk, weight in zip(chunks, weights):
            finish = min(end, cursor + (end - start) * weight / sum(weights))
            output.append(f'{index}\n{stamp(cursor)} --> {stamp(finish)}\n{chunk}\n')
            cursor, index = finish, index + 1
    file.write_text('\n'.join(output))
    print(f'{file}: {index - 1} readable cues')
