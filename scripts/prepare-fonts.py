"""Produce static, renamed TTF fonts from a pinned OFL-licensed source.

Run once when updating bundled fonts, using the resumestudio environment.
The application never downloads fonts from third parties at runtime.
"""
from pathlib import Path
from urllib.request import urlretrieve
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'a85815a42757630ce188fdad368c2dfc444d4773'
BASE = f'https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/notosanssc/'
cache = ROOT / '.tools/fonts'
output = ROOT / 'public/fonts'
cache.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
source = cache / 'NotoSansSC-VF.ttf'
if not source.exists():
    urlretrieve(BASE + 'NotoSansSC%5Bwght%5D.ttf', source)
if not (output / 'OFL.txt').exists():
    urlretrieve(BASE + 'OFL.txt', output / 'OFL.txt')
hashes = {}
for weight, label in [(400, 'Regular'), (700, 'Bold')]:
    font = instantiateVariableFont(TTFont(source), {'wght': weight}, inplace=True)
    names = {1: 'ResumeStudio Sans', 2: label, 3: f'ResumeStudioSans-{label}', 4: f'ResumeStudio Sans {label}', 6: f'ResumeStudioSans-{label}', 16: 'ResumeStudio Sans', 17: label}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.flavor = None
    target = output / f'ResumeStudioSans-{label}.ttf'
    font.save(target)
    hashes[target.name] = hashlib.sha256(target.read_bytes()).hexdigest()
    print(target.name, target.stat().st_size)
(output / 'provenance.json').write_text(json.dumps({
    'source': BASE + 'NotoSansSC%5Bwght%5D.ttf',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'modifications': 'Static TTF instances at weights 400 and 700; renamed ResumeStudio Sans. No glyph subset removed.',
    'license': 'OFL-1.1', 'files': hashes,
}, ensure_ascii=False, indent=2) + '\n')
