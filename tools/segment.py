"""Turn a tagged PDF stream into HTML segments for manually listed entries.

Stream lines look like  "x|text with <B>bold</B> <I>italic</I> <C>cat</C> <H>head</H> <H2>sub</H2>"
and "#### PAGE n" separators.
"""
import re, html as H

def load_stream(path):
    lines = []
    page = None
    for raw in open(path).read().split('\n'):
        if raw.startswith('#### PAGE'):
            page = int(raw.split()[-1]); continue
        if '|' not in raw: continue
        x, t = raw.split('|', 1)
        lines.append({'p': page, 'x': int(x), 't': t})
    return lines

DOTS_RE = re.compile(r'^(?:<B>)?\s*(•+)\s*(?:</B>)?\s*(?:\t|\s)*')
BOUND_RE = re.compile(r'^(?:<H>|<H2>|<C>)')

def _clean(t):
    for a, b in CLEAN:
        t = re.sub(a, b, t)
    return t

def is_dots_line(t):
    s = re.sub(r'</?B>', '', t).strip()
    return bool(re.match(r'^•+(\s|\t|$)', s))

def is_bold_start(t):
    return t.lstrip().startswith('<B>') and not is_dots_line(t)

def tagconv(t):
    t = H.escape(t, quote=False)
    t = t.replace('&lt;B&gt;', '<strong>').replace('&lt;/B&gt;', '</strong>')
    t = t.replace('&lt;I&gt;', '<em>').replace('&lt;/I&gt;', '</em>')
    t = re.sub(r'&lt;C&gt;(.*?)&lt;/C&gt;', lambda m: '<strong>' + m.group(1).upper() + '</strong>', t)
    t = re.sub(r'&lt;/?H2?&gt;', '', t)
    t = re.sub(r'&lt;/?[A-Z0-9]+&gt;', '', t)
    t = t.replace('</strong><strong>', '').replace('</em><em>', '')
    return t

CLEAN = []
def to_html(lines, skip_first_heading=True):
    lines = [dict(L, t=_clean(L['t'])) for L in lines]
    lines = [L for L in lines if L['t'].strip()]
    paras = []  # list of [kind, text]
    cur = None
    base = None; prevx = None
    ladder_x = None
    for i, L in enumerate(lines):
        t = L['t'].replace('\t', ' ')
        x = L['x']
        if skip_first_heading and i == 0 and re.match(r'^<H2?>', t):
            continue
        if re.match(r'^<H2?>.*</H2?>\s*$', t):
            # inner heading → own paragraph
            cur = ['h', re.sub(r'</?H2?>', '', t).strip()]; paras.append(cur); cur = None; base = None; ladder_x = None
            continue
        if (prevx is not None and abs(x - prevx) > 60) or (i > 0 and L.get('p') != lines[i-1].get('p')):
            base = None  # column/page change
        if base is None or x < base: base = x
        new = False; kind = 'p'
        if is_dots_line(t):
            new = True; kind = 'li'; ladder_x = x
        elif t.strip().startswith('◻'):
            new = True; kind = 'sub'
        elif ladder_x is not None and x > ladder_x + 8 and cur and cur[0] in ('li',):
            new = False
        elif cur and cur[0] == 'sub' and x > base + 8:
            new = False
        else:
            ladder_x = None
            if cur is None: new = True
            elif x - base >= 9 and not (cur and cur[0] == 'li') and re.search(r'[.!?”"\)]\s*(</[A-Z]+>)?\s*$', cur[1]): new = True
            elif is_bold_start(t) or BOUND_RE.match(t.strip()): new = True
            elif cur and cur[0] == 'li' and x <= (ladder_x or x): new = True
        if new:
            cur = [kind, t.strip()]; paras.append(cur)
        else:
            prev = cur[1]
            if re.search(r'[A-Za-z]-\s*$', re.sub(r'<[^>]+>', '', prev)) and re.match(r'^(<[A-Z]+>)?[a-z]', t.strip()):
                cur[1] = re.sub(r'-\s*((?:</[A-Z]+>)?)\s*$', r'\1', prev) + t.strip()
            else:
                cur[1] = prev.rstrip() + ' ' + t.strip()
        prevx = x
    out = []
    for kind, t in paras:
        t = tagconv(t).strip()
        t = re.sub(r'\s+', ' ', t)
        if not t or t in ('◻',): continue
        if kind == 'h': out.append(f'<h4>{t}</h4>')
        elif kind == 'sub': out.append('<p class="sub">' + t.replace('◻', '▫', 1) + '</p>')
        elif kind == 'li':
            m = re.match(r'^(?:<strong>)?\s*(•+)\s*(?:</strong>)?\s*', t)
            dots = m.group(1); rest = t[m.end():].strip()
            rest = re.sub(r'^<strong>\s*</strong>', '', rest).strip()
            out.append(f'<p class="dots"><span class="d">{dots}</span> {rest}</p>')
        else:
            t = re.sub(r'^(?:<strong>)?\s*•+\s*(?:</strong>)?\s*(?=\S)', '', t)
            t = re.sub(r'</strong>(?=[A-Za-z])', '</strong> ', t)
            out.append(f'<p>{t}</p>')
    # merge orphan sub bullets
    return '\n'.join(out)

def find_line(lines, start, pat, page_min=None):
    rx = re.compile(pat)
    for i in range(start, len(lines)):
        if page_min is not None and lines[i]['p'] < page_min: continue
        if rx.search(lines[i]['t']): return i
    return None

def segment(lines, entries, book, default_page_offset=0):
    """entries: list of dicts {a: anchor regex, n: name, section: bool, end: regex(optional), p: page(optional)}
    Anchors are located in order. Returns entries with 'html' and 'pg' (pdf page)."""
    pos = 0
    found = []
    for e in entries:
        i = find_line(lines, pos if not e.get('anywhere') else 0, e['a'], e.get('pmin'))
        if i is None:
            raise SystemExit(f'anchor not found: {e["n"]} {e["a"]} after line {pos} (page {lines[pos]["p"] if pos < len(lines) else "?"})')
        e['_i'] = i
        if not e.get('anywhere'): pos = i + 1
        found.append(e)
    starts = sorted(e['_i'] for e in found)
    for e in found:
        i = e['_i']
        if e.get('section'):
            j = i + 1
            endrx = re.compile(e.get('end', r'^<H2?>'))
            while j < len(lines) and not endrx.match(lines[j]['t'].strip()):
                j += 1
            rng = [k for k in range(i, j)]
            # remove other entries' lines
            others = [o for o in found if o is not e and i < o['_i'] < j]
            drop = set()
            for o in others:
                drop.update(range(o['_i'], o['_end']) if '_end' in o else [])
            e['_lines'] = rng; e['_drop_from'] = others
        else:
            j = i + 1
            endrx = re.compile(e['end']) if e.get('end') else None
            while j < len(lines):
                t = lines[j]['t'].strip()
                if j in starts: break
                if endrx is not None:
                    if endrx.search(t): break
                else:
                    if BOUND_RE.match(t) or is_bold_start(t) or is_dots_line(t): break
                j += 1
            e['_end'] = j
            e['_lines'] = list(range(i, j))
    for e in found:
        if e.get('section'):
            drop = set()
            for o in e['_drop_from']:
                if '_end' in o: drop.update(range(o['_i'], o['_end']))
                elif '_lines' in o: drop.update(o['_lines'])
            e['_lines'] = [k for k in e['_lines'] if k not in drop]
        sel = [lines[k] for k in e['_lines']]
        e['html'] = to_html(sel)
        e['pg'] = lines[e['_i']]['p']
    return found
