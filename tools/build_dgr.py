#!/usr/bin/env python3
"""Build VTM Builder data files from the Dark Gifts Restored Foundry module dumps."""
import json, re, html, os, shutil
from collections import defaultdict

W = '/home/claude/work'
OUT = f'{W}/app/data'
os.makedirs(OUT, exist_ok=True)

def load(p):
    d = json.load(open(f'{W}/dump/{p}.json'))
    items = {v['_id']: v for k, v in d.items() if k.startswith('!items!')}
    folders = {v['_id']: v for k, v in d.items() if k.startswith('!folders!')}
    return d, items, folders

def fpath(folders, fid):
    p = []
    while fid:
        f = folders.get(fid)
        if not f: break
        p.insert(0, f['name']); fid = f.get('folder')
    return p

def text(h):
    t = re.sub(r'<br\s*/?>', ' ', h or '')
    t = re.sub(r'</p>|</li>|</h\d>', ' ', t)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()

def field(h, *names):
    for n in names:
        m = re.search(r'<strong>\s*' + re.escape(n) + r'\s*:?\s*</strong>\s*:?\s*(.*?)</p>', h, re.S)
        if m: return text(m.group(1))
    return ''

def first_sentences(t, limit=220):
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

def lead_text(h):
    """First descriptive paragraph(s), skipping ■ fields and italic flavour lines."""
    paras = re.findall(r'<p>(.*?)</p>', h or '', re.S)
    for p in paras:
        if '■' in p: continue
        t = text(p)
        if len(t) < 25: continue
        if re.match(r'^<em>.*</em>$', p.strip()) and len(t) < 120: continue
        return t
    return text(h)[:300]

DOTS = {'•': 1, '••': 2, '•••': 3, '••••': 4, '•••••': 5}

# ------------------------------------------------------------------ discipline registry
DISC = [
    # key, name, icon, kind
    ('animalism', 'Animalism', 'animalism', 'disc'),
    ('auspex', 'Auspex', 'auspex', 'disc'),
    ('bardo', 'Bardo', 'bardo', 'disc'),
    ('celerity', 'Celerity', 'celerity', 'disc'),
    ('chimerstry', 'Chimerstry', 'chimerstry', 'disc'),
    ('daimonion', 'Daimonion', 'daimonion', 'disc'),
    ('dementation', 'Dementation', 'dementation', 'disc'),
    ('dominate', 'Dominate', 'dominate', 'disc'),
    ('flight', 'Flight', 'flight', 'disc'),
    ('fortitude', 'Fortitude', 'fortitude', 'disc'),
    ('melpominee', 'Melpominee', 'melpominee', 'disc'),
    ('mytherceria', 'Mytherceria', 'mytherceria', 'disc'),
    ('obfuscate', 'Obfuscate', 'obfuscate', 'disc'),
    ('obtenebration', 'Obtenebration', 'obtenebration', 'disc'),
    ('potence', 'Potence', 'potence', 'disc'),
    ('presence', 'Presence', 'presence', 'disc'),
    ('protean', 'Protean', 'protean', 'disc'),
    ('quietusanimae', 'Quietus (Animae)', 'quietus', 'disc'),
    ('quietuscruciatus', 'Quietus (Cruciatus)', 'quietus', 'disc'),
    ('quietussanguinis', 'Quietus (Sanguinis)', 'quietus', 'disc'),
    ('serpentis', 'Serpentis', 'serpentis', 'disc'),
    ('spiritus', 'Spiritus', 'spiritus', 'disc'),
    ('temporis', 'Temporis', 'temporis', 'disc'),
    ('thanatosis', 'Thanatosis', 'thanatosis', 'disc'),
    ('valerenhealer', 'Valeren (Healer)', 'valeren-healer', 'disc'),
    ('valerenwarrior', 'Valeren (Warrior)', 'valeren-warrior', 'disc'),
    ('valerenwatcher', 'Valeren (Watcher)', 'valeren-watcher', 'disc'),
    ('vicissitude', 'Vicissitude', 'vicissitude', 'disc'),
    ('alchemy', 'Thin-Blood Alchemy', 'alchemy', 'alchemy'),
]
SCHOOLS = {  # slug: (item name, icon)
    'hermetic': 'School: Hermetic Thaumaturgy', 'koldunism': 'School: Koldunism', 'mortis': 'School: Mortis',
    'akhu': 'School: Akhu', 'durank': 'School: Dur-An-Ki', 'sihr': 'School: Sihr', 'abyss': 'School: Abyss Mysticism',
    'sielanic': 'School: Sielanic Thaumaturgy', 'hacktivist': 'School: Hacktivist Thaumaturgy',
    'dibu': 'School: Dibu e Debu', 'mechanical': 'School: Mechanical Thaumaturgy', 'fjolkynngi': 'School: Fjölkynngi',
    'witchcraft': 'School: Blood Witchcraft',
}

# rules journal → discipline description
_, _, _ = None, None, None
rules = json.load(open(f'{W}/dump/rules.json'))
jr = {v['_id']: v for k, v in rules.items() if k.startswith('!journal!')}
rpages = {}
for k, v in rules.items():
    if k.startswith('!journal.pages!'):
        jid = k.split('!')[2].split('.')[0]
        rpages[(jr[jid]['name'], v['name'])] = v['text']['content']
GIFTS = 'Gifts of the Blood: Discipline Rules'

def disc_meta(h):
    out = {}
    for lab in ['Type', 'Masquerade Threat', 'Masquerade threat', 'Blood Resonance', 'Nicknames', 'Common Specialties']:
        v = field(h, lab)
        if v: out[lab.lower().replace(' ', '_')] = v
    return out

# ------------------------------------------------------------------ powers
dd, ditems, dfold = load('disciplines')
powers = {}
fdocs = {}  # foundry docs by id

def clean_doc(it, pack):
    doc = {k: it[k] for k in ('name', 'type', 'img', 'system')}
    doc['effects'] = it.get('effects', [])
    doc['flags'] = {}
    doc['_src'] = f'Compendium.dark-gifts-restored.{pack}.Item.{it["_id"]}'
    return doc

DISC_ALIASES = {
    'animalism': 'animalism', 'auspex': 'auspex', 'celerity': 'celerity', 'dominate': 'dominate', 'fortitude': 'fortitude',
    'obfuscate': 'obfuscate', 'potence': 'potence', 'presence': 'presence', 'protean': 'protean', 'bardo': 'bardo',
    'chimerstry': 'chimerstry', 'daimonion': 'daimonion', 'dementation': 'dementation', 'flight': 'flight',
    'melpominee': 'melpominee', 'mytherceria': 'mytherceria', 'obtenebration': 'obtenebration', 'serpentis': 'serpentis',
    'spiritus': 'spiritus', 'temporis': 'temporis', 'thanatosis': 'thanatosis', 'vicissitude': 'vicissitude',
    'quietus cruciatus': 'quietuscruciatus', 'quietus sanguinis': 'quietussanguinis', 'quietus animae': 'quietusanimae',
    'mortis': 'school:mortis',
}
PATHNAMES = {}  # filled later: lowercase path name -> path key

def parse_req(s):
    """Parse an amalgam string into alternatives [[{kind,key,level}]]; returns None when not understood."""
    s0 = s
    s = s.replace('(any Path)', '').replace('(Any Path)', '')
    alts = re.split(r'\s+or\s+|/', s)
    res = []
    for a in alts:
        a = a.strip().strip('.,()')
        m = re.match(r'^(.*?)\s*(•+|\d)\s*(\(.*\))?$', a)
        if not m:
            return None
        name, lv = m.group(1).strip().lower(), m.group(2)
        lv = len(lv) if lv.startswith('•') else int(lv)
        name = re.sub(r'^any\s+', 'any ', name)
        if name in DISC_ALIASES:
            res.append({'k': DISC_ALIASES[name], 'l': lv})
        elif name in ('valeren',):
            res.append({'k': 'any:valeren', 'l': lv})
        elif name in ('quietus',):
            res.append({'k': 'any:quietus', 'l': lv})
        elif name.startswith('any blood sorcery path'):
            res.append({'k': 'any:path', 'l': lv})
        elif name.endswith(' path'):
            res.append({'k': 'path:' + name[:-5].strip(), 'l': lv})
        elif name in ('bloodlife path',):
            res.append({'k': 'path:bloodlife', 'l': lv})
        elif name in ('ephemera path',):
            res.append({'k': 'path:ephemera', 'l': lv})
        else:
            return None
    return res

for pid, it in ditems.items():
    s = it['system']; h = s['description']
    disc = s['discipline']
    am = field(h, 'Amalgam')
    pre = field(h, 'Prerequisite', 'Prerequisit')
    p = {
        'id': pid, 'n': it['name'], 'd': disc, 'lv': s['level'],
        'cost': field(h, 'Cost', 'Activation Cost'), 'pool': field(h, 'Dice Pools', 'Dice Pool'),
        'dur': field(h, 'Duration'), 'act': field(h, 'Action'),
        'am': am, 'pre': pre, 'ing': field(h, 'Ingredients'),
        'sum': first_sentences(lead_text(h)), 'src': s.get('source', {}),
    }
    if am:
        p['amr'] = parse_req(am)
    if pre:
        p['prer'] = [x.strip() for x in re.split(r'\s+or\s+', re.sub(r'\(.*?\)', '', pre)) if len(x.strip()) < 40]
    powers[pid] = {k: v for k, v in p.items() if v not in ('', None, [], {})}
    fdocs[pid] = clean_doc(it, 'disciplines')

# ------------------------------------------------------------------ sorcery
sd, sitems, sfold = load('blood-sorcery')
paths = {}  # key -> {key,name,intro,effects:[],rituals:[]}
schools = {}

def slug(n):
    return re.sub(r'[^a-z0-9]+', '', n.lower())

for pid, it in sitems.items():
    fp = fpath(sfold, it.get('folder'))
    s = it['system']; h = s['description']
    fdocs[pid] = clean_doc(it, 'blood-sorcery')
    if fp[-1] == 'Schools of Sorcery':
        continue
    pname = fp[1] if len(fp) > 1 else fp[0]
    key = slug(pname)
    P = paths.setdefault(key, {'key': key, 'n': pname, 'intro': None, 'fx': [], 'rit': []})
    entry = {
        'id': pid, 'n': it['name'], 'd': s['discipline'], 'lv': s['level'], 'path': key,
        'sum': first_sentences(lead_text(h)), 'src': s.get('source', {}),
        'cost': field(h, 'Cost', 'Activation Cost'), 'pool': field(h, 'Dice Pools', 'Dice Pool', 'Casting Roll'),
        'dur': field(h, 'Duration'), 'aspects': field(h, 'Aspects'), 'seq': field(h, 'Sequela'),
    }
    m = re.match(r'^<p><em>(.*?)</em></p>', h)
    if m: entry['tag'] = text(m.group(1))
    entry = {k: v for k, v in entry.items() if v not in ('', None)}
    powers[pid] = entry
    if fp[-1] == 'Rituals':
        P['rit'].append(pid)
    elif it['name'].endswith('(Path)'):
        P['intro'] = pid
    else:
        P['fx'].append(pid)
for P in paths.values():
    PATHNAMES[P['n'].lower()] = P['key']
    P['fx'].sort(key=lambda i: (powers[i]['lv'], powers[i]['n']))
    P['rit'].sort(key=lambda i: (powers[i]['lv'], powers[i]['n']))
    if P['intro']:
        P['icon'] = os.path.basename(fdocs[P['intro']]['img'])
        P['sum'] = powers[P['intro']]['sum']

PATH_ALIAS = {
    'elemental mastery': 'elementalforces', 'enchanting': 'enchantment', 'coveyance': 'conveyance',
    'mastery over the mortal shell': 'masteryofthemortalshell', 'green path': 'thegreenpath',
    'the green path': 'thegreenpath', 'binding, summoning, warding': 'bindingsummoningandwarding',
    'binding, summoning and warding': 'bindingsummoningandwarding',
}
KRAINA = ['blackseakraina', 'transylvaniankraina']
missing_paths = defaultdict(list)
for sk, sname in SCHOOLS.items():
    it = next(i for i in sitems.values() if i['name'] == sname)
    h = it['system']['description']
    # bullets after the "Paths of" heading (or the last heading)
    idx = h.find('Paths of')
    if idx < 0: idx = h.rfind('<h3>')
    tail = h[idx:]
    plist = []
    for b in re.findall(r'<p>•\s*(.*?)</p>', tail):
        b = text(b)
        nm = re.split(r'\s*\(|\s+p\.|\.|\s{2,}', b)[0].strip()
        low = nm.lower()
        key = PATH_ALIAS.get(low) or slug(nm)
        if key in paths:
            if key not in plist: plist.append(key)
        else:
            # try prefix match (e.g. "Haunting Mostly practiced …", "Ephemera Ephemera of Akhu …")
            hit = [k for k in paths if low.startswith(paths[k]['n'].lower())]
            if hit:
                if hit[0] not in plist: plist.append(hit[0])
            else:
                missing_paths[sk].append(nm)
    if sk in ('koldunism', 'sielanic'):
        for k in KRAINA + (['geniusloci'] if sk == 'koldunism' else []):
            if k not in plist: plist.append(k)
    m = re.search(r'Casting (?:Roll|Pool|Test):\s*</strong>\s*(.*?)</p>', h) or re.search(r'Casting (?:Roll|Pool|Test):\s*(.*?)</p>', h)
    cast = text(m.group(1)) if m else 'Intelligence + Occult'
    schools[sk] = {'key': 'school:' + sk, 'id': it['_id'], 'n': sname.replace('School: ', ''),
                   'icon': os.path.basename(it['img']), 'paths': plist, 'cast': cast,
                   'sum': first_sentences(lead_text(h), 300), 'src': it['system'].get('source', {})}
    powers[it['_id']] = {'id': it['_id'], 'n': sname, 'd': 'sorcery', 'lv': 0, 'sum': schools[sk]['sum'],
                         'src': it['system'].get('source', {})}

AM_OVR = {
 'Bloodlife Path or Quietus •••• (any Path)': [{'k':'path:lifeblood','l':4},{'k':'any:quietus','l':4}],
 'Daimonion/Spiritus/Ephemera or Necromancy Path 2': [{'k':'daimonion','l':2},{'k':'spiritus','l':2},{'k':'path:ephemera','l':2},{'k':'path:necromancy','l':2}],
 'Mortis 1 (or some other school of sorcery with necromantic Paths at 1 dot)': [{'k':'school:mortis','l':1},{'k':'path:necromancy','l':1}],
 'Mortis 2 or some other necromantic sorcery at 2': [{'k':'school:mortis','l':2},{'k':'path:necromancy','l':2}],
}
for p in powers.values():
    if p.get('am') in AM_OVR: p['amr'] = AM_OVR[p['am']]
# resolve path-name amalgams
for p in powers.values():
    for alt in (p.get('amr') or []):
        if alt['k'].startswith('path:'):
            nm = alt['k'][5:]
            alt['k'] = 'path:' + (PATH_ALIAS.get(nm) or PATHNAMES.get(nm) or slug(nm))

def disc_lead(h, name):
    base = name.split(' (')[0].lower()
    for p in re.findall(r'<p>(.*?)</p>', h, re.S):
        t = text(p)
        if '■' in p or len(t) < 60: continue
        if t[:1] in '“"‘\'': continue
        if base in t.lower(): return t
    return lead_text(h)

# ------------------------------------------------------------------ discipline list + descriptions
disciplines = []
for key, name, icon, kind in DISC:
    page = None
    for (jn, pn), c in rpages.items():
        if jn == GIFTS and pn.lower() == name.lower():
            page = c
    if key.startswith('quietus') and not page:
        page = rpages.get((GIFTS, 'Quietus'))
    if key.startswith('valeren') and not page:
        page = rpages.get((GIFTS, 'Valeren'))
    general = None
    if key.startswith('quietus'): general = rpages.get((GIFTS, 'Quietus'))
    if key.startswith('valeren'): general = rpages.get((GIFTS, 'Valeren'))
    pw = sorted([p for p in powers.values() if p['d'] == key], key=lambda p: (p['lv'], p['n']))
    h = (general or '') + (page or '') if general and page and general != page else (page or general or '')
    disciplines.append({
        'key': key, 'n': name, 'icon': icon + '.png', 'kind': kind,
        'sum': first_sentences(disc_lead(h, name), 320) if h else '',
        'meta': disc_meta(h) if h else {}, 'html': h,
        'powers': [p['id'] for p in pw],
    })

# ------------------------------------------------------------------ clans
cd, citems, cfold = load('clans')
C = lambda *a: list(a)
CLAN_DISC = {
    'Banu Haqim': {'castes': [('Sorcerer Caste', C('auspex', 'school:durank', 'quietussanguinis')),
                              ('Vizier Caste', C('auspex', 'celerity', 'quietusanimae')),
                              ('Warrior Caste', C('celerity', 'obfuscate', 'quietuscruciatus'))]},
    'Brujah': C('celerity', 'potence', 'presence'),
    'Caitiff': {'caitiff': True},
    'Gangrel': C('animalism', 'fortitude', 'protean'),
    'Giovanni': C('dominate', 'fortitude', 'school:mortis'),
    'Hecata': C('auspex', 'fortitude', 'school:mortis'),
    'Lasombra': C('dominate', 'obtenebration', 'potence'),
    'Malkavian': C('auspex', 'dementation', 'obfuscate'),
    'Nosferatu': C('animalism', 'obfuscate', 'potence'),
    'Ravnos': C('animalism', 'chimerstry', 'fortitude'),
    'Salubri': {'castes': [('Healer Caste', C('auspex', 'presence', 'valerenhealer')),
                           ('Warrior Caste', C('auspex', 'fortitude', 'valerenwarrior')),
                           ('Watcher Caste', C('auspex', 'obfuscate', 'valerenwatcher'))]},
    'The Ministry': {'castes': [('Priest Caste', C('obfuscate', 'presence', 'serpentis')),
                                ('Warrior Caste', C('obfuscate', 'potence', 'serpentis')),
                                ('Witch Caste', C('animalism', 'presence', 'school:akhu'))]},
    'Thin-Blooded': {'thin': True},
    'Toreador': C('auspex', 'celerity', 'presence'),
    'Tremere': C('auspex', 'dominate', 'school:hermetic'),
    'Tzimisce': C('animalism', 'auspex', 'vicissitude'),
    'Ventrue': C('dominate', 'fortitude', 'presence'),
    'Ahrimanes': C('animalism', 'potence', 'spiritus'),
    'Anda': C('animalism', 'fortitude', 'protean'),
    'Angellis Ater': C('daimonion', 'dominate', 'obtenebration'),
    'Assamite Antitribu': C('celerity', 'obfuscate', 'quietuscruciatus'),
    'Assamite Sorcerers': C('auspex', 'school:durank', 'quietussanguinis'),
    'Assamite Viziers': C('auspex', 'celerity', 'quietusanimae'),
    'Baali': C('daimonion', 'obfuscate', 'presence'),
    'Blood Brothers': {'disc': C('fortitude', 'potence'), 'note': 'Sanguinus has no Dark Gifts version; the bloodline has two in-clan Disciplines here.'},
    'Brahman': C('animalism', 'auspex', 'chimerstry'),
    'Brujah Antitribu': C('celerity', 'potence', 'presence'),
    'Cappadocians': C('auspex', 'fortitude', 'school:mortis'),
    'Children of Osiris': {'disc': C('bardo'), 'pick': 2, 'note': 'Bardo plus two Disciplines of the original clan or bloodline (pick them below).'},
    'City Gangrel': C('fortitude', 'obfuscate', 'protean'),
    'Country Gangrel': C('animalism', 'fortitude', 'protean'),
    'Daitya': C('obfuscate', 'presence', 'serpentis'),
    'Daughters of Cacophony': C('fortitude', 'melpominee', 'presence'),
    'Gargoyles': {'disc': C('flight', 'fortitude', 'potence'), 'note': 'Visceratika has no Dark Gifts version.'},
    'Giovanni ': None,
    'Harbingers of Skulls': C('auspex', 'fortitude', 'school:mortis'),
    'Kiasyd': {'castes': [('Dominate', C('dominate', 'mytherceria', 'obtenebration')),
                          ('Mortis', C('school:mortis', 'mytherceria', 'obtenebration'))]},
    'Kolduns': {'castes': [('Old Clan', C('animalism', 'auspex', 'dominate')),
                           ('Vicissitude', C('animalism', 'auspex', 'vicissitude'))],
                'note': 'Koldunic Sorcery is learned out-of-clan.'},
    'Lamia': C('fortitude', 'school:mortis', 'potence'),
    'Lasombra Antitribu': C('dominate', 'obtenebration', 'potence'),
    'Lhiannan': C('animalism', 'school:koldunism', 'presence'),
    'Malkavian Antitribu': C('auspex', 'dementation', 'obfuscate'),
    'Mariners': C('animalism', 'fortitude', 'protean'),
    'Nagaraja': C('auspex', 'dominate', 'school:mortis'),
    'Noiad': C('animalism', 'auspex', 'protean'),
    'Nosferatu Antitribu': C('animalism', 'obfuscate', 'potence'),
    'Old Clan Tzimisce': C('animalism', 'auspex', 'protean'),
    'Panders': {'caitiff': True},
    'Ravnos Antitribu': C('animalism', 'chimerstry', 'fortitude'),
    'Salubri Antitribu': C('auspex', 'fortitude', 'valerenwarrior'),
    'Samedi': C('fortitude', 'obfuscate', 'thanatosis'),
    'Serpents of the Light': C('obfuscate', 'presence', 'serpentis'),
    'Telyavelic Tremere': C('auspex', 'dominate', 'school:sielanic'),
    'Tlacique': C('obfuscate', 'presence', 'protean'),
    'Toreador Antitribu': C('auspex', 'celerity', 'presence'),
    'Tremere Antitribu': C('auspex', 'dominate', 'school:hermetic'),
    'True Brujah': C('potence', 'presence', 'temporis'),
    'Ventrue Antitribu': C('dominate', 'fortitude', 'presence'),
    'Warrior Setites': C('obfuscate', 'potence', 'serpentis'),
    'Wu Zao': {'castes': [('Obeah (Healer)', C('auspex', 'fortitude', 'valerenhealer')),
                          ('Valeren (Warrior)', C('auspex', 'fortitude', 'valerenwarrior'))]},
}
ART = {
    'Brujah': 'brujah', 'Gangrel': 'gangrel', 'Malkavian': 'malkavian', 'Nosferatu': 'nosferatu', 'Toreador': 'toreador',
    'Tremere': 'tremere', 'Ventrue': 'ventrue', 'Lasombra': 'lasombra', 'Tzimisce': 'tzimisce', 'Ravnos': 'ravnos',
    'Banu Haqim': 'assamite', 'The Ministry': 'setite', 'Giovanni': 'giovanni', 'Hecata': 'giovanni',
    'Assamite Antitribu': 'assamiteantitribu', 'Blood Brothers': 'bloodbrothers', 'Brujah Antitribu': 'brujahantitribu',
    'City Gangrel': 'gangrelantitribu', 'Country Gangrel': 'gangrelantitribu', 'Harbingers of Skulls': 'harbingers',
    'Kiasyd': 'kiasyd', 'Malkavian Antitribu': 'malkavianantitribu', 'Nosferatu Antitribu': 'nosferatuantitribu',
    'Panders': 'panders', 'Ravnos Antitribu': 'ravnosantitribu', 'Salubri Antitribu': 'salubriantitribu',
    'Serpents of the Light': 'serpents', 'Toreador Antitribu': 'toreadorantitribu', 'Ventrue Antitribu': 'ventrueantitribu',
}
ART_SRC = {k: 'Vampire: The Masquerade Revised Edition' for k in
           ['brujah', 'gangrel', 'malkavian', 'nosferatu', 'toreador', 'tremere', 'ventrue', 'lasombra', 'tzimisce',
            'ravnos', 'assamite', 'setite', 'giovanni']}
for k in ART.values():
    ART_SRC.setdefault(k, 'Guide to the Sabbat (Revised)')

clans = []
for cid, it in citems.items():
    s = it['system']; h = s['description']
    grp = fpath(cfold, it.get('folder'))
    group = grp[-1] if grp else 'Clans'
    cfg = CLAN_DISC.get(it['name'])
    if isinstance(cfg, list): cfg = {'disc': cfg}
    cfg = dict(cfg or {})
    if 'castes' in cfg:
        cfg['castes'] = [{'n': n, 'disc': d} for n, d in cfg['castes']]
    # banes
    banes = []
    for m in re.finditer(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', s.get('bane', ''), re.S):
        label = text(m.group(1)); body = m.group(2).strip()
        kind = 'v20' if 'V20' in label else ('variant' if 'Variant' in label else 'v5')
        banes.append({'id': f'{cid}:{len(banes)}', 'label': label, 'kind': kind, 'html': body,
                      'sum': first_sentences(text(body), 260)})
    # description without the discipline headers
    desc = re.sub(r'^(?:<h5>.*?</h5>\s*(?:<ul>.*?</ul>)?\s*)+', '', h, flags=re.S)
    nick = re.split(r'\s+\(', field(h, 'Nickname'))[0].strip().rstrip('.')
    sect = field(h, 'Sect')
    clans.append({
        'id': cid, 'n': it['name'], 'group': group, 'logo': os.path.basename(it['img']),
        'art': (ART.get(it['name']) + '.webp') if it['name'] in ART else None,
        'artSrc': ART_SRC.get(ART.get(it['name'], ''), None),
        'nick': nick, 'sect': sect, 'sum': first_sentences(lead_text(desc), 320),
        'html': desc, 'discHtml': h[:len(h) - len(desc)], 'banes': banes, 'src': s.get('source', {}), **cfg,
    })
    fdocs[cid] = clean_doc(it, 'clans')
ORDER = ['Clans', 'Sabbat Antitribu', 'Other Bloodlines', 'Bloodlines']
clans.sort(key=lambda c: (0 if c['group'] in (None, 'Clans') else 1, c['n']))
for c in clans:
    if c['group'] not in ('Sabbat Antitribu', 'Other Bloodlines', 'Bloodlines'): c['group'] = 'Clans'

# ------------------------------------------------------------------ predator types
pd_, pitems, _ = load('predator-types')
PRED = {
    # name: grants
    'Alleycat': {'spec': ['Intimidation (Stickups)', 'Brawl (Grappling)'], 'disc': ['celerity', 'potence'], 'hum': -1,
                 'bg': [('Contacts', 3, 'criminal')]},
    'Bagger': {'notClan': ['Ventrue', 'Ventrue Antitribu'], 'spec': ['Larceny (Lockpicking)', 'Streetwise (Black Market)'], 'disc': ['@sorcery', 'obfuscate'],
               'merit': [('Iron Gullet', 3)], 'flaw': [('Enemies', 2, 'someone believes you owe them')]},
    'Blood Leech': {'spec': ['Brawl (Kindred)', 'Stealth (against Kindred)'], 'disc': ['celerity', 'protean'], 'hum': -1,
                    'bp': 1, 'choice': [[('flaw', 'Dark Secret', 2, 'Diablerist'), ('flaw', 'Shunned', 2, '')]],
                    'flaw': [('Prey Exclusion', 2, 'mortals')]},
    'Cleaver': {'spec': ['Persuasion (Gaslighting)', 'Subterfuge (Coverups)'], 'disc': ['dominate', 'animalism'],
                'flaw': [('Dark Secret', 1, 'Cleaver')], 'bg': [('Herd', 2, '')]},
    'Consensualist': {'spec': ['Medicine (Phlebotomy)', 'Persuasion (Victims)'], 'disc': ['auspex', 'fortitude'], 'hum': 1,
                      'flaw': [('Dark Secret', 1, 'Masquerade Breacher'), ('Prey Exclusion', 1, 'non-consenting')]},
    'Extortionist': {'spec': ['Intimidation (Coercion)', 'Larceny (Security)'], 'disc': ['dominate', 'potence'],
                     'spread': [{'pts': 3, 'opts': ['Contacts', 'Resources'], 'kind': 'bg'}],
                     'flaw': [('Enemies', 2, 'the police or a victim who escaped')]},
    'Farmer': {'notClan': ['Ventrue', 'Ventrue Antitribu'], 'spec': ['Animal Ken (specific animal)', 'Survival (Hunting)'], 'disc': ['animalism', 'protean'], 'hum': 1,
               'flaw': [('Farmer', 2, '')]},
    'Graverobber': {'spec': ['Occult (Grave Rituals)', 'Medicine (Cadavers)'], 'disc': ['fortitude', '@oblivion'],
                    'merit': [('Iron Gullet', 3)], 'bg': [('Haven', 1, '')], 'flaw': [('Obvious Predator', 2, '')]},
    'Grim Reaper': {'spec': ['Awareness (Death)', 'Larceny (Forgery)'], 'disc': ['auspex', '@oblivion'], 'hum': 1,
                    'choice': [[('bg', 'Allies', 1, 'medical community'), ('bg', 'Influence', 1, 'medical community')]],
                    'flaw': [('Prey Exclusion', 1, 'healthy mortals')]},
    'Montero': {'spec': ['Leadership (Hunting Pack)', 'Stealth (Stakeout)'], 'disc': ['dominate', 'obfuscate'], 'hum': -1,
                'bg': [('Retainers', 2, '')]},
    'Osiris': {'spec': ['Occult (specific tradition)', 'Performance (specific field)'], 'disc': ['@sorcery', 'presence'],
               'spread': [{'pts': 3, 'opts': ['Fame', 'Herd'], 'kind': 'bg'},
                          {'pts': 2, 'opts': ['Enemies', 'Mythic Flaws'], 'kind': 'flaw'}]},
    'Pursuer': {'spec': ['Investigation (Profiling)', 'Stealth (Shadowing)'], 'disc': ['animalism', 'auspex'], 'hum': -1,
                'merit': [('Bloodhound', 1)], 'bg': [('Contacts', 1, 'morally flexible habitués of your hunting ground')]},
    'Roadside Killer': {'spec': ['Survival (the road)', 'Investigation (vampire cant)'], 'disc': ['fortitude', 'protean'],
                        'bg': [('Herd', 2, 'migrating')], 'flaw': [('Prey Exclusion', 1, 'locals')]},
    'Sandman': {'spec': ['Medicine (Anesthetics)', 'Stealth (Break-in)'], 'disc': ['auspex', 'obfuscate'],
                'bg': [('Resources', 1, '')]},
    'Scene Queen': {'spec': ['Etiquette (specific scene)', 'Leadership (specific scene)', 'Streetwise (specific scene)'],
                    'disc': ['dominate', 'potence'], 'bg': [('Fame', 1, ''), ('Contacts', 1, '')],
                    'choice': [[('flaw', 'Disliked', 1, 'outside your subculture'),
                                ('flaw', 'Prey Exclusion', 1, 'a different subculture')]]},
    'Siren': {'spec': ['Persuasion (Seduction)', 'Subterfuge (Seduction)'], 'disc': ['fortitude', 'presence'],
              'merit': [('Beautiful', 2)], 'flaw': [('Enemies', 1, 'a spurned lover or jealous partner')]},
    'Tithe Collector': {'spec': ['Intimidation (Kindred)', 'Leadership (Kindred)'], 'disc': ['dominate', 'presence'],
                        'spread': [{'pts': 3, 'opts': ['Domain', 'Status'], 'kind': 'bg'}],
                        'flaw': [('Adversary', 2, 'not everyone appreciates your influence')]},
    'Trapdoor': {'spec': ['Persuasion (Marketing)', 'Stealth (Ambushes or Traps)'], 'disc': ['protean', 'obfuscate'],
                 'bg': [('Haven', 1, '')],
                 'choice': [[('bg', 'Retainers', 1, ''), ('bg', 'Herd', 1, ''), ('bg', 'Haven', 1, 'second dot')],
                            [('flaw', 'Creepy', 1, 'Haven Flaw'), ('flaw', 'Haunted', 1, 'Haven Flaw')]]},
}
predators = []
for pid, it in pitems.items():
    s = it['system']; h = s['description']
    g = PRED[it['name']]
    pool = ''
    m = re.search(r'Predator Pool:</strong>\s*(.*?)</p>', h)
    if m: pool = text(m.group(1))
    predators.append({'id': pid, 'n': it['name'], 'sum': first_sentences(lead_text(h), 260), 'pool': pool,
                      'html': h, 'src': s.get('source', {}), 'g': g})
    fdocs[pid] = clean_doc(it, 'predator-types')
predators.sort(key=lambda p: p['n'])

# ------------------------------------------------------------------ DGR advantages
ad, aitems, afold = load('advantages')
advantages = []
for aid, it in aitems.items():
    s = it['system']; h = s['description']
    fp = fpath(afold, it.get('folder'))
    m = re.match(r'^<p><em>(.*?)</em></p>', h)
    tag = text(m.group(1)) if m else ''
    dots = []
    mm = re.search(r'\((•[•\s–\-to+or,]*)\)', tag)
    if mm:
        seg = mm.group(1)
        nums = [len(x) for x in re.findall(r'•+', seg)]
        if 'to' in seg or '–' in seg or '-' in seg:
            dots = list(range(min(nums), max(nums) + 1))
        else:
            dots = sorted(set(nums))
        if '+' in seg: dots = list(range(min(nums), 6))
    if not dots and s.get('points'): dots = [s['points']]
    if not dots and 'Ingrained' in ' '.join(fp): dots = [0]
    advantages.append({
        'id': aid, 'n': it['name'], 'ed': 'dgr', 'kind': s.get('featuretype', 'merit'),
        'cat': ' / '.join(fp[1:]) if len(fp) > 1 else fp[0] if fp else '', 'tag': tag, 'dots': dots,
        'sum': first_sentences(lead_text(re.sub(r'^<p><em>.*?</em></p>', '', h)), 240), 'html': h,
        'src': s.get('source', {}),
    })
    fdocs[aid] = clean_doc(it, 'advantages')

# ------------------------------------------------------------------ write
os.makedirs(f'{OUT}', exist_ok=True)
def jsfile(name, var, obj):
    with open(f'{OUT}/{name}', 'w') as f:
        f.write(f'window.VTMB=window.VTMB||{{}};window.VTMB.{var}=')
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

core = {'disciplines': disciplines, 'schools': schools, 'paths': paths, 'clans': clans, 'predators': predators,
        'missingPaths': missing_paths}
jsfile('core.js', 'core', core)
jsfile('powers.js', 'powers', powers)
jsfile('dgr-advantages.js', 'dgrAdv', advantages)
# Foundry documents: strip descriptions already stored? keep full system for fidelity
jsfile('foundry-dgr.js', 'fdocs', fdocs)
print('disciplines', len(disciplines), 'powers', len(powers), 'paths', len(paths), 'schools', len(schools),
      'clans', len(clans), 'predators', len(predators), 'dgr adv', len(advantages))
print('missing paths', dict(missing_paths))
unparsed = sorted({p['am'] for p in powers.values() if p.get('am') and not p.get('amr')})
print('unparsed amalgams', unparsed)
for f in os.listdir(OUT): print(f, os.path.getsize(f'{OUT}/{f}'))
