import json, re, sys
sys.path.insert(0, '/home/claude/work')
import segment as SG
from segment import load_stream, segment
SG.CLEAN += [(r'^Junkiejunkie$',''), (r'^[Mm]afioso$',''), (r'^<C>(?:weak|average|gifted|deadly)</C><C> </C><C>mortal</C>\s*',''), (r'^<C>(?:geographical|chasse|equivalent)</C>.*','')]

lines = load_stream('/home/claude/work/v5core_stream.txt')
BOOK = 'Vampire: The Masquerade 5th Edition Corebook'

def E(a, n, kind, dots, cat, **kw):
    d = {'a': a, 'n': n, 'kind': kind, 'dots': dots, 'cat': cat, 'anywhere': True}
    d.update(kw); return d

R = lambda a, b: list(range(a, b + 1))
F = lambda name: r'<B>Flaw: \(•+\) ' + re.escape(name)
M = lambda name: r'<B>\s*' + re.escape(name)

T = [
    E(r'<C>linguistics</C>', 'Linguistics', 'merit', R(1, 5), 'Linguistics', sum='One additional language per dot.'),
    E(F('Illiterate'), 'Illiterate', 'flaw', [2], 'Linguistics'),
    E(F('Repulsive'), 'Repulsive', 'flaw', [2], 'Looks'),
    E(F('Ugly'), 'Ugly', 'flaw', [1], 'Looks'),
    E(M('Beautiful:'), 'Beautiful', 'merit', [2], 'Looks'),
    E(r'Stunning:', 'Stunning', 'merit', [4], 'Looks'),
    E(F('Hopeless Addiction'), 'Hopeless Addiction', 'flaw', [2], 'Substance Use'),
    E(F('Addiction'), 'Addiction', 'flaw', [1], 'Substance Use'),
    E(M('High-Functioning Addict:'), 'High-Functioning Addict', 'merit', [1], 'Substance Use'),
    E(F('Archaic'), 'Archaic', 'flaw', [2], 'Archaic', req='Ancillae or older only'),
    E(F('Living in the Past'), 'Living in the Past', 'flaw', [1], 'Archaic', req='Ancillae or older only'),
    E(F('Bondslave'), 'Bondslave', 'flaw', [2], 'Bonding'),
    E(F('Bond Junkie'), 'Bond Junkie', 'flaw', [1], 'Bonding'),
    E(F('Long Bond'), 'Long Bond', 'flaw', [1], 'Bonding'),
    E(M('Bond Resistance:'), 'Bond Resistance', 'merit', R(1, 3), 'Bonding'),
    E(M('Short Bond:'), 'Short Bond', 'merit', [2], 'Bonding'),
    E(r'Unbondable:', 'Unbondable', 'merit', [5], 'Bonding'),
    E(F('Farmer'), 'Farmer', 'flaw', [2], 'Feeding', notClan=['Ventrue']),
    E(F('Organovore'), 'Organovore', 'flaw', [2], 'Feeding'),
    E(F('Methuselah’s Thirst'), 'Methuselah’s Thirst', 'flaw', [1], 'Feeding'),
    E(F('Prey Exclusion'), 'Prey Exclusion', 'flaw', [1], 'Feeding', multi=True),
    E(M('Bloodhound:'), 'Bloodhound', 'merit', [1], 'Feeding'),
    E(r'Iron Gullet', 'Iron Gullet', 'merit', [3], 'Feeding', notClan=['Ventrue']),
    E(F('Stake Bait'), 'Stake Bait', 'flaw', [2], 'Mythic'),
    E(F('Folkloric Bane'), 'Folkloric Bane', 'flaw', [1], 'Mythic', multi=True),
    E(F('Folkloric Block'), 'Folkloric Block', 'flaw', [1], 'Mythic', multi=True),
    E(F('Stigmata'), 'Stigmata', 'flaw', [1], 'Mythic'),
    E(M('Eat food:'), 'Eat Food', 'merit', [2], 'Mythic'),
    # thin-blood
    E(M('Baby Teeth:'), 'Baby Teeth', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Bestial Temper:'), 'Bestial Temper', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Branded by the Camarilla:'), 'Branded by the Camarilla', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Clan Curse:'), 'Clan Curse (Thin-Blood)', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Dead Flesh:'), 'Dead Flesh', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Mortal Frailty:'), 'Mortal Frailty', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Shunned by the Anarchs:'), 'Shunned by the Anarchs', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Vitae Dependency:'), 'Vitae Dependency', 'flaw', [0], 'Thin-Blood', thin=True),
    E(M('Anarch Comrades:'), 'Anarch Comrades', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Camarilla Contact:'), 'Camarilla Contact', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Catenating Blood:'), 'Catenating Blood', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Day Drinker:'), 'Day Drinker', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Discipline Affinity:'), 'Discipline Affinity', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Lifelike:'), 'Lifelike', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Thin-blood Alchemist:'), 'Thin-Blood Alchemist', 'merit', [0], 'Thin-Blood', thin=True),
    E(M('Vampiric Resilience:'), 'Vampiric Resilience', 'merit', [0], 'Thin-Blood', thin=True),
    # backgrounds
    E(r'^<H2>Allies</H2>', 'Allies', 'background', R(1, 6), 'Allies', section=True),
    E(r'^<H2>Contacts</H2>', 'Contacts', 'background', R(1, 3), 'Contacts', section=True),
    E(r'^<H2>Fame</H2>', 'Fame', 'background', R(1, 5), 'Fame', section=True),
    E(r'<C>infamy</C>', 'Infamy', 'flaw', R(1, 5), 'Fame'),
    E(r'<C>dark</C>', 'Dark Secret', 'flaw', R(1, 2), 'Fame', end=r'^•'),
    E(r'^<H2>Influence</H2>', 'Influence', 'background', R(1, 5), 'Influence', section=True),
    E(F('Despised'), 'Despised', 'flaw', [2], 'Influence'),
    E(F('Disliked'), 'Disliked', 'flaw', [1], 'Influence'),
    E(r'^<H2>Haven</H2>', 'Haven', 'background', R(1, 3), 'Haven', section=True),
    E(F('No Haven'), 'No Haven', 'flaw', [1], 'Haven'),
    E(F('Compromised'), 'Compromised', 'flaw', [2], 'Haven'),
    E(F('Creepy'), 'Creepy', 'flaw', [1], 'Haven'),
    E(F('Haunted'), 'Haunted', 'flaw', R(1, 5), 'Haven'),
    E(M('Hidden Armory:'), 'Hidden Armory', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(M('Cell:'), 'Cell', 'background', R(1, 5), 'Haven', req='Haven merit; Haven ••+'),
    E(M('Watchmen:'), 'Watchmen', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(M('Laboratory:'), 'Laboratory', 'background', R(1, 5), 'Haven', req='Haven merit; Haven ••+'),
    E(M('Library:'), 'Library', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(M('Location:'), 'Location', 'background', [1], 'Haven', req='Haven merit'),
    E(M('Luxury:'), 'Luxury', 'background', [1], 'Haven', req='Haven merit'),
    E(M('Postern:'), 'Postern', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(M('Security System:'), 'Security System', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(M('Surgery:'), 'Surgery', 'background', [1], 'Haven', req='Haven merit; Haven ••+'),
    E(M('Warding:'), 'Warding', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(r'^<H2>Herd</H2>', 'Herd', 'background', R(1, 5), 'Herd', section=True),
    E(F('Obvious Predator'), 'Obvious Predator', 'flaw', [2], 'Herd'),
    E(r'^<H2>Mask</H2>', 'Mask', 'background', R(1, 2), 'Mask', section=True, end=r'^(?:<H2?>|<B>• )', multi=True),
    E(F('Known Blankbody'), 'Known Blankbody', 'flaw', [2], 'Mask'),
    E(F('Known Corpse'), 'Known Corpse', 'flaw', [1], 'Mask'),
    E(M('Zeroed:'), 'Zeroed', 'merit', [1], 'Mask', req='Mask ••'),
    E(M('Cobbler:'), 'Cobbler', 'merit', R(1, 5), 'Mask', req='Mask ••'),
    E(r'^<H2>Mawla</H2>', 'Mawla', 'background', R(1, 5), 'Mawla', section=True, multi=True),
    E(r'<C>adversary</C>', 'Adversary', 'flaw', R(1, 5), 'Mawla', end=r'^•', multi=True),
    E(r'^<H2>Resources</H2>', 'Resources', 'background', R(1, 5), 'Resources', section=True),
    E(F('Destitute'), 'Destitute', 'flaw', [1], 'Resources'),
    E(r'^<H2>Retainers</H2>', 'Retainers', 'background', R(1, 3), 'Retainers', section=True, multi=True),
    E(F('Stalkers'), 'Stalkers', 'flaw', [1], 'Retainers'),
    E(r'^<H2>Status</H2>', 'Status', 'background', R(1, 5), 'Status', section=True, multi=True),
    E(F('Shunned'), 'Shunned', 'flaw', [2], 'Status'),
    E(F('Suspect'), 'Suspect', 'flaw', [1], 'Status'),
]
found = segment(lines, T, BOOK)
by = {e['n']: e for e in found}
out = []
for e in found:
    item = {'n': e['n'], 'ed': 'v5', 'kind': e['kind'], 'dots': e['dots'], 'cat': e['cat'], 'html': e['html'],
            'src': {'book': BOOK, 'page': str(e['pg'] - 2)}}
    for k in ('req', 'thin', 'multi', 'notClan', 'sum'):
        if k in e: item[k] = e[k]
    out.append(item)
# derived entries that share text
def clone(base, **kw):
    b = dict(by[base]); it = {'n': kw['n'], 'ed': 'v5', 'kind': kw['kind'], 'dots': kw['dots'], 'cat': kw['cat'],
                             'html': b['html'], 'src': {'book': BOOK, 'page': str(b['pg'] - 2)}}
    it.update({k: v for k, v in kw.items() if k not in it}); return it
out.append(clone('Allies', n='Enemies', kind='flaw', dots=R(1, 5), cat='Allies', multi=True,
                 sum='Mortal foes who work against you; rated two dots below their Effectiveness (see Allies).'))
out.append(clone('Mawla', n='Minor Boon', kind='background', dots=R(1, 3), cat='Mawla', multi=True,
                 sum='A favor owed to you by another Kindred; costs half (rounded up) of the equivalent Mawla. Character creation only.'))
for it in out:
    if it['kind'] in ('background',) and it.get('cat') == it['n']:
        it['multi'] = True
json.dump(out, open('/home/claude/work/merits_v5core.json', 'w'), ensure_ascii=False, indent=1)
print(len(out))
for it in out:
    print(f"{it['n']:28} {it['kind']:10} {it['dots']} p{it['src']['page']} | {re.sub('<[^>]+>','',it['html'])[:150]}")
