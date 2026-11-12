"""Read-only PDF inspection plus local raster previews, using PyMuPDF."""
from pathlib import Path
import sys
import pymupdf as fitz

folder = Path(sys.argv[1])
for name in ['sample', 'long']:
    doc = fitz.open(folder / f'{name}.pdf')
    text = ''.join(page.get_text() for page in doc)
    for expected in ['林知夏', '教育背景', '专业技能', 'Figma', '产品设计师']:
        assert expected in text, (name, 'missing text', expected)
    assert '\ufffd' not in text and '\x00' not in text, (name, 'invalid glyphs')
    assert len(doc) == 1 if name == 'sample' else len(doc) >= 2
    for page in doc:
        assert abs(page.rect.width - 595.28) < 1 and abs(page.rect.height - 841.89) < 1
        assert any('ResumeStudio' in font[3] for font in page.get_fonts()), 'embedded font missing'
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                x0, y0, x1, y1 = line['bbox']
                assert x0 >= 20 and y0 >= 15 and x1 <= page.rect.width - 20 and y1 <= page.rect.height - 12, (name, page.number, line['bbox'])
    doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(folder / f'{name}-first.png')
    if len(doc) > 1:
        doc[-1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(folder / f'{name}-last.png')
    print(f'{name}: {len(doc)} page(s), A4, embedded Chinese font and extractable text verified')
