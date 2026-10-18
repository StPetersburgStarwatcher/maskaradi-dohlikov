"""Font-aware text stream extraction from PDFs.

stream(pdf_path, page_from, page_to, rules) -> list of lines (dict: p=page index, x, y, t=text, spans=[(font,size,flags,text)])
Columns are handled by sorting blocks by column (x) then y, which matches the layout of WoD books.
"""
import pymupdf as fitz, re

def page_lines(page, skip=lambda font, size: False):
    W = page.rect.width
    out = []
    d = page.get_text('dict')
    for b in d['blocks']:
        for l in b.get('lines', []):
            spans = [(s['font'], round(s['size'], 1), s['flags'], s['text']) for s in l['spans'] if s['text'].strip() != '' or s['text'] == ' ']
            spans = [(f.split('+')[-1], sz, fl, t) for f, sz, fl, t in spans]
            spans = [s for s in spans if not skip(s[0], s[1])]
            if not spans: continue
            x0, y0, x1, y1 = l['bbox']
            if y0 < 45 or y0 > page.rect.height - 40: continue
            out.append({'x': x0, 'y': y0, 'x1': x1, 'spans': spans, 'bx': b['bbox'][0]})
    return out

def ordered(page, skip, ncols=2):
    lines = page_lines(page, skip)
    xs = sorted({round(l['x']) for l in lines})
    cols = []  # list of (lo, hi)
    for x in xs:
        if cols and x - cols[-1][1] <= 50: cols[-1][1] = x
        else: cols.append([x, x])
    def col(l):
        x = round(l['x'])
        for i, (lo, hi) in enumerate(cols):
            if lo <= x <= hi: return i
        return 0
    lines.sort(key=lambda l: (col(l), round(l['y'], 0), l['x']))
    return lines

def join_text(spans):
    return ''.join(s[3] for s in spans)

def dehyphen(text):
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)
    text = re.sub(r'(\w)- (\w)', lambda m: m.group(1) + m.group(2) if m.group(2).islower() else m.group(0), text)
    return text
