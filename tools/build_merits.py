import json, re, html, hashlib, sys
sys.path.insert(0, '/home/claude/work')
W = '/home/claude/work'

def text(h):
    t = re.sub(r'<[^>]+>', ' ', h or '')
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def first_sentences(t, limit=200):
    t = t.strip()
    if len(t) <= limit: return t
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z“"(])', t)
    out = ''
    for s in parts:
        if not out: out = s
        elif len(out) + len(s) + 1 <= limit: out += ' ' + s
        else: break
    if len(out) > limit + 60: out = out[:limit].rsplit(' ', 1)[0] + '…'
    return out

def strip_head(h, name, section=False):
    nm = re.escape(name).replace(r'\ ', r'\s+')
    D = r'(?:\(\s*)?[•\+]+(?:\s*(?:TO|OR|to|or)\s*[•\+]+)?(?:\s*\))?'
    PT = r'\(\s*[\d\s,or\-–to]+\s*pt\.?\s*(?:Merit|Flaw)s?\)'
    pats = [
        r'^<p class="dots"><span class="d">•+</span>\s*(?:<strong>)?\s*' + nm + r'\s*:?\s*(?:</strong>)?\s*',
        r'^<p>(?:<strong>)?\s*Flaw:\s*\(•+\)\s*(?:' + nm + r')?\.?\s*(?:</strong>)?\s*',
        r'^<p>(?:<strong>)?\s*' + nm + r'\s*' + PT + r'\s*(?:</strong>)?\s*',
        r'^<p>(?:<strong>)?\s*' + nm + r'\s*' + D + r'\s*(?:</strong>)?\s*',
        r'^<p><strong>\s*' + nm + r'\s*:?\s*</strong>\s*',
        r'^<p>\s*' + nm + r'\s*:\s*',
        r'^<p>\s*' + nm + r'\s+(?=[A-Z“])',
    ]
    if not section:
        for p in pats:
            h2 = re.sub(p, '<p>', h, count=1, flags=re.I)
            if h2 != h:
                h = h2; break
    h = re.sub(r'^<p>\s*(?:<strong>\s*</strong>)?\s*</p>\n?', '', h)
    h = re.sub(r'^<p>\s+', '<p>', h)
    h = re.sub(r'^<p></strong>\s*', '<p>', h)
    h = re.sub(r'^<p>[:\.]\s*', '<p>', h)
    return h

def slug(s):
    s = s.lower().replace('’', '').replace("'", '')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

ml = json.load(open(f'{W}/masterlist.json'))
def ml_sum(name):
    for k, v in ml.items():
        if k.lower() == name.lower() or k.lower() == name.lower().replace('farmer', 'vegan'):
            s = v['sum']
            s = re.split(r'\s+(?:Haven|Caitiff|Ghoul|Thin-Blood) (?:Merits|Flaws)\b|\s+Merits$|\s+Flaws$|;\s*V:tM|;\s*p\.', s)[0]
            s = re.sub(r'\s*\(V:tM,\s*p\.\s*\d+\)', '', s)
            return s.strip().rstrip('.') + '.' if s.strip() else ''
    return ''

core = json.load(open(f'{W}/merits_v5core.json'))
pg = json.load(open(f'{W}/merits_v5pg.json'))
v20 = json.load(open(f'{W}/merits_v20.json'))

# master-list dot ranges (Players Guide updates some Corebook ranges)
ML_DOTS = {'Dark Secret': [1, 2, 3, 4], 'Adversary': [1, 2, 3], 'Enemies': [1, 2, 3, 4], 'Infamy': [1, 2, 3, 4, 5]}
items = []
for it in core:
    if it['n'] in ML_DOTS: it['dots'] = ML_DOTS[it['n']]
    note = pg['notes'].get(it['n'])
    if note:
        it['html'] = it['html'] + '\n<h4>Players Guide notes</h4>\n' + note
        it['src2'] = {'book': 'Vampire: The Masquerade Players Guide', 'page': ''}
    items.append(it)
items += pg['items']
for it in v20:
    items.append(it)

seen = {}
out = []
for it in items:
    h = strip_head(it['html'], it['n'].replace(' (Thin-Blood)', ''), section=(it['kind']=='background' and it.get('cat')==it['n']))
    it['html'] = h
    s = it.get('sum') or (ml_sum(it['n']) if it['ed'] == 'v5' else '') or first_sentences(text(h))
    it['sum'] = s
    base = f"{it['ed']}-{slug(it['n'])}"
    if base in seen:
        seen[base] += 1; base += f'-{seen[base]}'
    else:
        seen[base] = 1
    it['id'] = base
    out.append(it)

with open(f'{W}/app/data/advantages.js', 'w') as f:
    f.write('window.VTMB=window.VTMB||{};window.VTMB.adv=')
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
from collections import Counter
print(len(out), Counter(i['ed'] for i in out), Counter(i['kind'] for i in out))
for it in out[:5] + out[90:95]:
    print(it['id'], '|', it['sum'][:120], '|', it['html'][:160].replace('\n', ' '))
