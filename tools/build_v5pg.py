import json, re, sys
sys.path.insert(0, '/home/claude/work')
import segment as SG
from segment import load_stream, segment

lines = load_stream('/home/claude/work/pg_stream.txt')
BOOK = 'Vampire: The Masquerade Players Guide'
R = lambda a, b: list(range(a, b + 1))
# convert <E> heading tags into bold entry starts for the generic boundary logic
for L in lines:
    L['t'] = L['t'].replace('<E>', '<B>').replace('</E>', '</B>')

def E(a, n, kind, dots, cat, **kw):
    d = {'a': a, 'n': n, 'kind': kind, 'dots': dots, 'cat': cat, 'anywhere': True}
    d.update(kw); return d
B = lambda name: r'^<B>\s*' + re.escape(name)
P = lambda name: r'^' + re.escape(name) + r'(\s*\(?[•\s]*(to\s*•+)?\)?\s*)$'
SEC = r'^(?:<H2?>|<B>)'

T = [
    # Players Guide commentary on Corebook backgrounds (appended to the core entries)
    E(r'^<H>Allies</H>', '@Allies', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Enemies</H2>', '@Enemies', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Contacts</H>', '@Contacts', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Fame</H>', '@Fame', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Infamy</H2>', '@Infamy', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Haven</H>', '@Haven', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Herd</H>', '@Herd', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Influence', '@Influence', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Despised and Disliked', '@Despised|Disliked', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Mask</H>', '@Mask', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Zeroed and Cobbler', '@Zeroed|Cobbler', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Known Blankbody', '@Known Blankbody|Known Corpse', 'note', [], '', section=True, end=r'^(?:<H>|<B>|<H2>Mawla)'),
    E(r'^<H>Mawla</H>', '@Mawla', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Adversary</H2>', '@Adversary', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Boons and Debts', '@Minor Boon|Major Boon|Minor Debt|Major Debt|Life Debt', 'note', [], '', section=True, end=r'^<H>Resources'),
    E(r'^<H>Resources</H>', '@Resources', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Retainers</H>', '@Retainers', 'note', [], '', section=True, end=SEC),
    E(r'^<H2>Stalkers</H2>', '@Stalkers', 'note', [], '', section=True, end=SEC),
    E(r'^<H>Status</H>', '@Status', 'note', [], '', section=True, end=SEC),
    # new backgrounds / haven merits
    E(B('BUSINESS ESTABLISHMENT'), 'Business Establishment', 'background', [2, 3], 'Haven', req='Haven merit'),
    E(B('FURCUS'), 'Furcus', 'background', R(1, 3), 'Haven', req='Haven merit'),
    E(B('MACHINE SHOP'), 'Machine Shop', 'background', R(1, 5), 'Haven', req='Haven merit'),
    E(B('SHARED'), 'Shared', 'flaw', [1, 2], 'Haven'),
    E(B('CITY SECRETS'), 'City Secrets', 'background', [1], 'Influence', multi=True, end=r'^<H>'),
    # merits
    E(B('FAMOUS FACE'), 'Famous Face', 'merit', [1], 'Looks'),
    E(B('INGÉNUE'), 'Ingénue', 'merit', [1], 'Looks'),
    E(B('REMARKABLE FEATURE'), 'Remarkable Feature', 'merit', [1], 'Looks'),
    E(B('VESSEL RECOGNITION'), 'Vessel Recognition', 'merit', [1], 'Feeding'),
    E(B('LUCK OF THE DEVIL'), 'Luck of the Devil', 'merit', [4], 'Mythic'),
    E(B('NUIT MODE'), 'Nuit Mode', 'merit', [2], 'Mythic', req='Blood Potency 1 or lower'),
    E(B('CHECK THE TRUNK'), 'Check the Trunk', 'merit', [1], 'Other'),
    E(B('SIDE HUSTLER'), 'Side Hustler', 'merit', [2], 'Other'),
    E(B('TEMPERED WILL'), 'Tempered Will', 'merit', [3], 'Other', req='No dots in Dominate or Presence'),
    E(B('UNTOUCHABLE'), 'Untouchable', 'merit', [5], 'Other'),
    E(B('STENCH'), 'Stench', 'flaw', [1], 'Looks'),
    E(B('TRANSPARENT'), 'Transparent', 'flaw', [1], 'Looks'),
    E(B('VEIN TAPPER'), 'Vein Tapper', 'flaw', [1], 'Feeding'),
    E(B('STARVING DECAY'), 'Starving Decay', 'flaw', [2], 'Mythic'),
    E(B('TWICE-CURSED'), 'Twice-Cursed', 'flaw', [2], 'Mythic'),
    E(B('KNOWLEDGE HUNGRY'), 'Knowledge Hungry', 'flaw', [1], 'Other'),
    E(B('PRESTATION DEBTS'), 'Prestation Debts', 'flaw', [1], 'Other'),
    E(B('RISK-TAKER'), 'Risk-Taker', 'flaw', [1], 'Other'),
    E(B('WEAK-WILLED'), 'Weak-Willed', 'flaw', [2], 'Other', end=r'^<H>'),
    # caitiff
    E(P('Favored Blood ••••'), 'Favored Blood', 'merit', [4], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Mark of Caine ••'), 'Mark of Caine', 'merit', [2], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Mockingbird •••'), 'Mockingbird', 'merit', [3], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Sun-Scarred •••••'), 'Sun-Scarred', 'merit', [5], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Uncle Fangs •••'), 'Uncle Fangs', 'merit', [3], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Befouling Vitae (••)'), 'Befouling Vitae', 'flaw', [2], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Clan Curse (••)'), 'Clan Curse', 'flaw', [2], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Debt Peon (••)'), 'Debt Peon', 'flaw', [2], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Liquidator (•)'), 'Liquidator', 'flaw', [1], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Muddled Blood (•)'), 'Muddled Blood', 'flaw', [1], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Walking Omen (••)'), 'Walking Omen', 'flaw', [2], 'Caitiff', clan=['Caitiff', 'Panders']),
    E(P('Word-Scarred (•)'), 'Word-Scarred', 'flaw', [1], 'Caitiff', clan=['Caitiff', 'Panders']),
    # thin-blood
    E(r'^Heliophobia$', 'Heliophobia', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Night Terrors$', 'Night Terrors', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Plague Bearer$', 'Plague Bearer', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Sloppy Drinker$', 'Sloppy Drinker', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Sun-Faded$', 'Sun-Faded', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Supernatural Tell$', 'Supernatural Tell', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Twilight Presence$', 'Twilight Presence', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Unending Hunger$', 'Unending Hunger', 'flaw', [0], 'Thin-Blood', thin=True),
    E(r'^Abhorrent Blood$', 'Abhorrent Blood', 'merit', [0], 'Thin-Blood', thin=True),
    E(r'^Faith-Proof$', 'Faith-Proof', 'merit', [0], 'Thin-Blood', thin=True),
    E(r'^Low Appetite$', 'Low Appetite', 'merit', [0], 'Thin-Blood', thin=True),
    E(r'^Lucid Dreamer$', 'Lucid Dreamer', 'merit', [0], 'Thin-Blood', thin=True),
    E(r'^Mortality’s Mien$', 'Mortality’s Mien', 'merit', [0], 'Thin-Blood', thin=True),
    E(r'^Swift Feeder$', 'Swift Feeder', 'merit', [0], 'Thin-Blood', thin=True, end=r'^In the World of Darkness'),
    # ghouls
    E(P('Blood Empathy ••'), 'Blood Empathy', 'merit', [2], 'Ghoul', ghoul=True),
    E(P('Unseemly Aura ••'), 'Unseemly Aura', 'merit', [2], 'Ghoul', ghoul=True),
    E(r'^Baneful Blood', 'Baneful Blood', 'flaw', [1, 2], 'Ghoul', ghoul=True),
    E(P('Crone’s Curse (••)'), 'Crone’s Curse', 'flaw', [2], 'Ghoul', ghoul=True),
    E(P('Distressing Fangs (•)'), 'Distressing Fangs', 'flaw', [1], 'Ghoul', ghoul=True),
]
found = segment(lines, T, BOOK)
out = []; notes = {}
for e in found:
    if e['kind'] == 'note':
        for n in e['n'][1:].split('|'):
            notes[n] = e['html']
        continue
    h = re.sub(r'^<p><strong>[^<]*</strong></p>\n?', '', e['html'])  # drop the heading line itself
    h = re.sub(r'^<p>' + re.escape(e['n']) + r'\s*\(?[•\s]*(to\s*•+)?\)?\s*</p>\n?', '', h)
    item = {'n': e['n'], 'ed': 'v5', 'kind': e['kind'], 'dots': e['dots'], 'cat': e['cat'], 'html': h,
            'src': {'book': BOOK, 'page': str(e['pg'] - 1)}}
    for k in ('req', 'thin', 'multi', 'clan', 'ghoul'):
        if k in e: item[k] = e[k]
    out.append(item)
# Players Guide items without body text in the PDF
out.append({'n': 'Death-Proof', 'ed': 'v5', 'kind': 'merit', 'dots': [1], 'cat': 'Caitiff', 'clan': ['Caitiff', 'Panders'],
            'html': '<p>You cannot learn Oblivion, but you are immune to it. <em>(The Players Guide lists this Merit in its Advantages Master List; its full text is missing from the book.)</em></p>',
            'src': {'book': BOOK, 'page': '126'}})
# Boons & debts from the Players Guide table
bd = notes.get('Minor Boon', '')
for n, kind, dots, s in [
    ('Major Boon', 'background', R(2, 4), 'A major favor owed to you by another Kindred; costs one dot more than the Minor Boon from the same creditor. Character creation only.'),
    ('Minor Debt', 'flaw', [1, 2], 'You owe another Kindred a minor boon (• for neonate–elder creditors, •• for Prince/Baron).'),
    ('Major Debt', 'flaw', [1, 2, 3], 'You owe a major boon; once per story your creditor can demand a favor you cannot refuse.'),
    ('Life Debt', 'flaw', [2, 3], 'You owe someone your unlife; a high-Status creditor may as well Blood Bond you.'),
]:
    out.append({'n': n, 'ed': 'v5', 'kind': kind, 'dots': dots, 'cat': 'Mawla', 'html': bd, 'sum': s, 'multi': True,
                'src': {'book': BOOK, 'page': '115'}})
json.dump({'items': out, 'notes': notes}, open('/home/claude/work/merits_v5pg.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'notes', list(notes))
for it in out:
    print(f"{it['n']:24} {it['kind']:10} {it['dots']} p{it['src']['page']} | {re.sub('<[^>]+>','',it['html'])[:130]}")
