"""Produce static, renamed TTF fonts from a pinned OFL-licensed source.

Run once when updating bundled fonts, using the resumestudio environment.
The application never downloads fonts from third parties at runtime.
"""
from pathlib import Path
from urllib.request import urlretrieve
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'a85815a42757630ce188fdad368c2dfc444d4773'
SOURCE_SHA256 = 'a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da'
BASE = f'https://raw.githubusercontent.com/google/fonts/{COMMIT}/ofl/notosanssc/'
cache = ROOT / '.tools/fonts'
output = ROOT / 'public/fonts'
cache.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--rebuild-full', action='store_true', help='Rebuild bundled full fonts from the pinned upstream source')
rebuild = args.parse_args().rebuild_full
source = cache / 'NotoSansSC-VF.ttf'


def rename(font, family, label):
    postscript = family.replace(' ', '') + '-' + label
    names = {1: family, 2: label, 3: postscript, 4: f'{family} {label}', 6: postscript, 16: family, 17: label}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ranges(codepoints):
    result = []
    for cp in sorted(codepoints):
        if result and cp == result[-1][1] + 1:
            result[-1][1] = cp
        else:
            result.append([cp, cp])
    return result


labels = [(400, 'Regular'), (700, 'Bold')]
full_paths = [output / f'ResumeStudioSans-{label}.ttf' for _, label in labels]
if rebuild or not all(path.exists() for path in full_paths):
    if not source.exists():
        urlretrieve(BASE + 'NotoSansSC%5Bwght%5D.ttf', source)
    if digest(source) != SOURCE_SHA256:
        raise ValueError('Pinned font source SHA-256 mismatch')
    for weight, label in labels:
        font = instantiateVariableFont(TTFont(source, recalcTimestamp=False), {'wght': weight}, inplace=True)
        rename(font, 'ResumeStudio Sans', label)
        font.flavor = None
        font.save(output / f'ResumeStudioSans-{label}.ttf')
elif (output / 'provenance.json').exists():
    previous = json.loads((output / 'provenance.json').read_text())
    for path in full_paths:
        if digest(path) != previous['files'][path.name]:
            raise ValueError(f'Bundled full font hash mismatch: {path.name}')

if not (output / 'OFL.txt').exists():
    urlretrieve(BASE + 'OFL.txt', output / 'OFL.txt')

# GB2312's repertoire plus the source's Latin, symbols and punctuation.
# Selection checks actual cmap coverage; all other characters retain the full fallback.
common = set(range(0x3000)) | set(range(0x3000, 0x3040)) | set(range(0xff00, 0xfff0))
for first in range(0xa1, 0xf8):
    for second in range(0xa1, 0xff):
        try:
            common.add(ord(bytes([first, second]).decode('gb2312')))
        except UnicodeError:
            pass

manifest = {}
hashes = {}
full_coverage = common_coverage = None
new_common_files = set()
for weight, label in labels:
    path = output / f'ResumeStudioSans-{label}.ttf'
    font = TTFont(path, recalcTimestamp=False)
    coverage = set(font.getBestCmap())
    if full_coverage is not None:
        assert full_coverage == coverage, 'Full weight coverage mismatch'
    full_coverage = coverage
    hashes[path.name] = digest(path)
    manifest.setdefault('full', {'family': 'ResumeStudio Sans', 'files': {}, 'ranges': ranges(coverage)})['files'][label] = path.name

    options = subset.Options()
    options.name_IDs = ['*']  # Preserve copyright and OFL notices in the font.
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=common & coverage)
    subsetter.subset(font)
    subset_cmap = set(font.getBestCmap())
    assert subset_cmap == common & coverage, 'Common character coverage changed'
    if common_coverage is not None:
        assert common_coverage == subset_cmap, 'Common weight coverage mismatch'
    common_coverage = subset_cmap
    rename(font, 'ResumeStudio Sans Common', label)
    temporary = cache / f'common-{label}.ttf'
    font.save(temporary)
    sha = digest(temporary)
    name = f'ResumeStudioSans-Common-{label}-{sha[:12]}.ttf'
    (output / name).write_bytes(temporary.read_bytes())
    new_common_files.add(name)
    hashes[name] = sha
    manifest.setdefault('common', {'family': 'ResumeStudio Sans Common', 'files': {}, 'ranges': ranges(subset_cmap)})['files'][label] = name
    print(f'{label}: full {path.stat().st_size:,} bytes; common {temporary.stat().st_size:,} bytes')

for old in output.glob('ResumeStudioSans-Common-*.ttf'):
    if old.name not in new_common_files:
        old.unlink()
generated = ROOT / 'src/templates/font-manifest.json'
generated.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
(output / 'provenance.json').write_text(json.dumps({
    'source': BASE + 'NotoSansSC%5Bwght%5D.ttf',
    'sourceSha256': SOURCE_SHA256,
    'modifications': 'Static TTF weights 400/700, renamed ResumeStudio Sans. Full fonts preserve original coverage. Common fonts are renamed subsets: GB2312 plus available Latin, symbols and punctuation; full fonts remain available on demand.',
    'license': 'OFL-1.1', 'files': hashes,
}, ensure_ascii=False, indent=2) + '\n')
