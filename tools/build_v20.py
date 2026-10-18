import json, re, sys
sys.path.insert(0, '/home/claude/work')
import segment as SG
from segment import load_stream, segment

lines = load_stream('/home/claude/work/v20_stream.txt')
BOOK = 'Vampire: The Masquerade 20th Anniversary Edition'
# merge wrapped <E> headings
merged = []
for L in lines:
    if merged and L['t'].startswith('<E>') and merged[-1]['t'].startswith('<E>') and not re.search(r'(Merit|Flaw)\)\s*</E>\s*$', merged[-1]['t']):
        merged[-1]['t'] = merged[-1]['t'].replace('</E>', '') + ' ' + L['t'].replace('<E>', '')
        continue
    merged.append(dict(L))
lines = merged
cat = None
T = []
for i, L in enumerate(lines):
    t = L['t']
    m = re.match(r'^<H>(Physical|Mental|Social|Supernatural)</H>', t)
    if m: cat = m.group(1); continue
    if t.startswith('<H>Ghouls'): break
    if t.startswith('<E>'):
        h = re.sub(r'</?E>', '', t).strip()
        m = re.match(r'^(.*?)\s*\(([\d\s,or\-–to]+)\s*pt\.?\s*(Merit|Flaw)s?\)\s*$', h)
        if not m:
            print('UNPARSED', h); continue
        name, pts, kind = m.group(1).strip(), m.group(2), m.group(3).lower()
        nums = [int(x) for x in re.findall(r'\d+', pts)]
        if re.search(r'[-–]|to', pts): dots = list(range(nums[0], nums[-1] + 1))
        else: dots = sorted(set(nums))
        T.append({'a': '^' + re.escape(t) + '$', 'n': name, 'kind': kind, 'dots': dots, 'cat': cat, 'anywhere': True,
                  'end': r'^<E>|^<H>'})
SG.CLEAN += []
found = segment(lines, T, BOOK)
out = []
for e in found:
    out.append({'n': e['n'], 'ed': 'v20', 'kind': e['kind'], 'dots': e['dots'], 'cat': e['cat'], 'html': e['html'],
                'src': {'book': BOOK, 'page': str(e['pg'] - 7)}})
json.dump(out, open('/home/claude/work/merits_v20.json', 'w'), ensure_ascii=False, indent=1)
print(len(out))
for it in out:
    print(f"{it['cat']:12} {it['n']:30} {it['kind']:6} {it['dots']} p{it['src']['page']} | {re.sub('<[^>]+>','',it['html'])[:100]}")
