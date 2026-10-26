/* VTM Builder — rules engine (V5 character creation with Dark Gifts Restored disciplines) */
(function () {
  'use strict';
  const D = window.VTMB;
  const R = (D.rules = {});

  R.ATTRS = {
    physical: ['strength', 'dexterity', 'stamina'],
    social: ['charisma', 'manipulation', 'composure'],
    mental: ['intelligence', 'wits', 'resolve'],
  };
  R.ATTR_LIST = [].concat(R.ATTRS.physical, R.ATTRS.social, R.ATTRS.mental);
  R.SKILLS = {
    physical: ['athletics', 'brawl', 'craft', 'drive', 'firearms', 'larceny', 'melee', 'stealth', 'survival'],
    social: ['animalken', 'etiquette', 'insight', 'intimidation', 'leadership', 'performance', 'persuasion', 'streetwise', 'subterfuge'],
    mental: ['academics', 'awareness', 'finance', 'investigation', 'medicine', 'occult', 'politics', 'science', 'technology'],
  };
  R.SKILL_LIST = [].concat(R.SKILLS.physical, R.SKILLS.social, R.SKILLS.mental);
  R.SKILL_NAMES = {
    athletics: 'Athletics', brawl: 'Brawl', craft: 'Craft', drive: 'Drive', firearms: 'Firearms', larceny: 'Larceny',
    melee: 'Melee', stealth: 'Stealth', survival: 'Survival', animalken: 'Animal Ken', etiquette: 'Etiquette',
    insight: 'Insight', intimidation: 'Intimidation', leadership: 'Leadership', performance: 'Performance',
    persuasion: 'Persuasion', streetwise: 'Streetwise', subterfuge: 'Subterfuge', academics: 'Academics',
    awareness: 'Awareness', finance: 'Finance', investigation: 'Investigation', medicine: 'Medicine', occult: 'Occult',
    politics: 'Politics', science: 'Science', technology: 'Technology',
  };
  R.ATTR_NAMES = {
    strength: 'Strength', dexterity: 'Dexterity', stamina: 'Stamina', charisma: 'Charisma', manipulation: 'Manipulation',
    composure: 'Composure', intelligence: 'Intelligence', wits: 'Wits', resolve: 'Resolve',
  };
  R.ATTR_SPREAD = [4, 3, 3, 3, 2, 2, 2, 2, 1];
  R.SKILL_DISTS = {
    jack: { label: 'Jack of all trades', need: { 3: 1, 2: 8, 1: 10 } },
    balanced: { label: 'Balanced', need: { 3: 3, 2: 5, 1: 7 } },
    specialist: { label: 'Specialist', need: { 4: 1, 3: 3, 2: 3, 1: 3 } },
  };
  R.FREE_SPEC_SKILLS = ['academics', 'craft', 'performance', 'science'];
  // Mortals and ghouls: a player character (V5 Players Guide p. 141, Companion pp. 44–55) or one of the
  // Storyteller templates (V5 Corebook, 2021 printing, p. 184). Templates: attribute spread, skill counts, specialties,
  // Advantage points and the Flaw points to take (Flaws are required and buy nothing).
  R.TEMPLATES = {
    pc: { label: 'Player character', note: 'Built like a vampire: same Attributes, Skills and Advantages, no Disciplines of their own.' },
    weak: { label: 'Weak', attrs: [2, 2, 1, 1, 1, 1, 1, 1, 1], skills: { 2: 3, 1: 5 }, specs: 0, adv: 0, flawMax: 0, note: 'Bystanders, victims, the herd.' },
    average: { label: 'Average', attrs: [3, 3, 2, 2, 2, 1, 1, 1, 1], skills: { 3: 3, 2: 4, 1: 5 }, specs: 0, adv: 3, flawMax: 2, note: 'Cops, guards, competent professionals.' },
    gifted: { label: 'Gifted', attrs: [4, 3, 3, 2, 2, 1, 1, 1, 1], skills: { 4: 2, 3: 4, 2: 4, 1: 4 }, specs: 1, specOn4: true, adv: 10, flawMax: 4, note: 'Experts, veterans, serious rivals.' },
    deadly: { label: 'Deadly', attrs: [5, 5, 4, 4, 3, 3, 2, 2, 2], skills: { 5: 1, 4: 3, 3: 5, 2: 6 }, specs: 3, adv: 15, flawMax: 0, note: 'Elite hunters, the best in the world at what they do.' },
  };

  R.AGES = {
    childe: { label: 'Childe', era: 'Embraced within the last 15 years', gens: ['12', '13'], thinGens: ['14', '15', '16'], bp: 1, thinBp: 0, xp: 0, adv: 0, flaw: 0, hum: 0 },
    neonate: { label: 'Neonate', era: 'Embraced between 1940 and a decade ago', gens: ['12', '13'], bp: 1, xp: 15, adv: 0, flaw: 0, hum: 0 },
    ancilla: { label: 'Ancilla', era: 'Embraced between 1780 and 1940', gens: ['10', '11'], bp: 2, xp: 35, adv: 2, flaw: 2, hum: -1 },
  };
  // Blood Potency table (V5 Corebook, 2021 printing, p. 216)
  R.BP = [
    { surge: 1, mend: 1, bonus: 0, reroll: 0, bane: 0, feed: 'No effect' },
    { surge: 2, mend: 1, bonus: 0, reroll: 1, bane: 2, feed: 'No effect' },
    { surge: 2, mend: 2, bonus: 1, reroll: 1, bane: 2, feed: 'Animal and bagged blood slakes half Hunger' },
    { surge: 3, mend: 2, bonus: 1, reroll: 2, bane: 3, feed: 'Animal and bagged blood slakes no Hunger' },
    { surge: 3, mend: 3, bonus: 2, reroll: 2, bane: 3, feed: 'Animal and bagged blood slakes no Hunger; slake 1 less from humans' },
    { surge: 4, mend: 3, bonus: 2, reroll: 3, bane: 4, feed: 'Animal and bagged blood slakes no Hunger; slake 1 less from humans; must drain and kill to reduce below 2' },
    { surge: 4, mend: 3, bonus: 3, reroll: 3, bane: 4, feed: 'Slake 2 less Hunger per human; must drain and kill to reduce below 2' },
    { surge: 5, mend: 3, bonus: 3, reroll: 4, bane: 5, feed: 'Slake 2 less Hunger per human; must drain and kill to reduce below 2' },
    { surge: 5, mend: 4, bonus: 4, reroll: 4, bane: 5, feed: 'Slake 2 less Hunger per human; must drain and kill to reduce below 3' },
    { surge: 6, mend: 4, bonus: 4, reroll: 5, bane: 6, feed: 'Slake 2 less Hunger per human; must drain and kill to reduce below 3' },
    { surge: 6, mend: 5, bonus: 5, reroll: 5, bane: 6, feed: 'Slake 3 less Hunger per human; must drain and kill to reduce below 3' },
  ];

  // ------------------------------------------------------------------ lookups
  const core = D.core;
  const L = D.lore || {};
  R.clan = (id) => core.clans.find((c) => c.id === id);
  R.clanByName = (n) => core.clans.find((c) => c.n === n);

  // ------------------------------------------------------------------ clan preprocessing (lore, banes, castes)
  (function prepClans() {
    const byName = {}; core.clans.forEach((c) => (byName[c.n] = c));
    const decorate = (b, clanName) => {
      const m = /\(p\. ([^)]+)\)/.exec(b.label || ''); const page = m ? m[1] : '';
      const book = /^V20/.test(b.label) ? 'V20 Core' : /Players Guide/.test(b.label) ? 'V5 Players Guide' : 'V5 Core';
      const vm = /Variant: (.*?) \(p\./.exec(b.label || '');
      const names = (L.baneNames || {})[clanName] || {};
      b.title = vm ? vm[1] : names[b.kind] || (b.kind === 'v20' ? 'Weakness' : 'Bane');
      b.book = book; b.page = page;
      b.srcLine = book + (page ? ' · p. ' + page : '');
      b.mech = (D.baneMech || {})[b.id] || '';
    };
    core.clans.forEach((cl) => cl.banes.forEach((b) => decorate(b, cl.n)));
    core.clans.forEach((cl) => {
      const lore = (L.clans || {})[cl.n] || {};
      cl.dn = (L.displayName || {})[cl.n] || cl.n;
      cl.hook = lore.hook || '';
      cl.flavor = lore.flavor || cl.sum || '';
      cl.play = lore.play || '';
      cl.hidden = (L.hidden || []).includes(cl.n);
      cl.sabbatOnly = (L.sabbatOnly || []).includes(cl.n);
      // castes: fixed order, own write-up and weakness
      if (cl.castes) {
        const order = (L.casteOrder || {})[cl.n];
        if (order) cl.castes.sort((a, b) => order.indexOf(a.n) - order.indexOf(b.n));
        const srcs = (L.casteSrc || {})[cl.n] || {};
        const own = (L.casteOwnV20 || {})[cl.n];
        cl.castes.forEach((ca) => {
          const cl2 = byName[srcs[ca.n]];
          const cl2lore = (lore.castes || {})[ca.n] || {};
          ca.flavor = cl2lore.flavor || ''; ca.play = cl2lore.play || '';
          if (cl2) { ca.html = cl2.html; ca.src = cl2.src; ca.art = cl2.art; }
          if (cl2 && own) cl2.banes.forEach((b, i) => cl.banes.push(Object.assign({}, b, { id: cl.id + ':c:' + ca.n + ':' + i, caste: ca.n })));
        });
        if (own) cl.banes.forEach((b) => { if (b.kind === 'v20' && !b.caste) b.caste = own; });
      }
      // antitribu also get their parent clan's V5 bane and Players Guide variant
      const par = byName[(L.parent || {})[cl.n]];
      if (par) {
        const inh = par.banes.filter((b) => (b.kind === 'v5' || b.kind === 'variant') && !b.caste)
          .map((b, i) => Object.assign({}, b, { id: cl.id + ':p' + i, inherited: par.n, srcLine: b.srcLine + ' · ' + ((L.displayName || {})[par.n] || par.n) }));
        cl.banes = inh.concat(cl.banes);
      }
    });
    // V20 weaknesses that only restate the V5 bane are dropped (the Storyteller's call); copies that say
    // "same weakness as the parent clan" follow their parent. Lasombra and Tzimisce keep both.
    const V5_ONLY = ['Ventrue', 'Nosferatu', 'Brujah', 'Gangrel', 'Malkavian', 'The Ministry',
      'Ventrue Antitribu', 'Nosferatu Antitribu', 'Brujah Antitribu', 'City Gangrel', 'Country Gangrel', 'Malkavian Antitribu', 'Serpents of the Light'];
    V5_ONLY.forEach((n) => { const cl = byName[n]; if (cl) cl.banes = cl.banes.filter((b) => b.kind !== 'v20' || b.caste); });
    // Giovanni take the Hecata V5 bane (the painful Kiss) in place of their V20 weakness
    const gio = byName.Giovanni, hec = byName.Hecata;
    const hv = hec && hec.banes.find((b) => b.kind === 'v5');
    if (gio && hv) {
      // the texts name the Giovanni, not the Hecata
      const swap = (t) => (typeof t === 'string' ? t.replace(/Hecata|Lazarenes?/g, 'Giovanni') : t);
      const port = hec.banes.filter((b) => (b.kind === 'v5' || b.kind === 'variant') && !b.caste)
        .map((b, i) => { const x = Object.assign({}, b, { id: gio.id + ':hecata' + (i ? i : '') }); ['html', 'sum', 'mech', 'title', 'label'].forEach((f) => (x[f] = swap(x[f]))); delete x.inherited; return x; });
      gio.banes = port.concat(gio.banes.filter((b) => b.kind !== 'v20'));
    }
    // the counterpart map works both ways
    R.COUNTER = {};
    Object.entries(L.counterpart || {}).forEach(([a, b]) => { R.COUNTER[a] = b; if (!R.COUNTER[b]) R.COUNTER[b] = a; });
    R.COUNTER['Country Gangrel'] = 'Gangrel';
  })();
  core.predators.forEach((p) => { if ((L.predators || {})[p.n]) p.sum = L.predators[p.n]; });
  R.casteOf = (c) => { const cl = R.clan(c.clan); return cl && cl.castes ? cl.castes[c.caste || 0] || cl.castes[0] : null; };
  R.banesFor = (c) => {
    const cl = R.clan(c.clan); if (!cl) return [];
    const ca = R.casteOf(c);
    return cl.banes.filter((b) => !b.caste || (ca && b.caste === ca.n));
  };
  // clan picker layout for the current sect
  R.clanSections = (c) => {
    const sab = !!c.sabbat;
    const get = (n) => R.clanByName(n);
    const main = (L.groups[sab ? 'sabbat' : 'normal'] || []).map((g) => ({ id: g.id, n: g.n, main: true, clans: g.clans.map(get).filter(Boolean) }));
    const rest = (L.sections || []).map((s) => ({ id: s.id, n: s.n, main: false, clans: s.clans.map(get).filter((cl) => cl && (sab || !cl.sabbatOnly)) }));
    return main.concat(rest);
  };
  R.clanAvailable = (c, cl) => {
    if (!cl || cl.hidden) return false;
    if (cl.thin && !R.preset().thinAllowed) return false;
    return R.clanSections(c).some((s) => s.clans.includes(cl));
  };
  R.disc = (key) => core.disciplines.find((d) => d.key === key);
  R.school = (key) => core.schools[(key || '').replace('school:', '')];
  R.path = (key) => core.paths[key];
  // Storyteller notes that the DGR module stores as path entries; not choosable powers.
  const POW_NOTE = new Set(['dWyn0JwpwxV6Sysi', 'Jy99Zq1qzhEnQLtv', 'ETWbW4OvJN4SjgKt']);
  R.power = (id) => (POW_NOTE.has(id) ? null : D.powers[id]);
  R.NO_PRED = 'none';
  R.predator = (id) => (id && id !== R.NO_PRED ? core.predators.find((p) => p.id === id) || null : null);
  R.predName = (c) => (c.predator === R.NO_PRED ? 'No predator type' : (R.predator(c.predator) || {}).n || '');
  // ------------------------------------------------------------------ advantages: one pool, duplicates resolved
  // Decided with the Storyteller: V20 entries with a V5 or Dark Gifts counterpart are hidden;
  // Dark Gifts wins over V20 and over V5 where both exist; Stench becomes V20's Smell of the Grave.
  const HIDE = new Set([
    'v20|Eat Food', 'v20|Unbondable', 'v20|Prey Exclusion', 'v20|Dark Secret',
    'v20|Weak-Willed', 'v20|Iron Will', 'v20|Enemy', 'v20|Boon', 'v20|Addiction', 'v20|Language',
    'v20|Repulsed by Garlic', 'v20|Repelled by Crosses', 'v20|Can’t Cross Running Water',
    'v20|Thin Blood', 'v20|Fourteenth Generation', 'v20|Fifteenth Generation',
    'v20|Huge Size', 'v20|Eidetic Memory', 'v20|Concentration', 'v20|Common Sense', 'v20|Coldly Logical', 'v20|Ambidextrous',
    'v20|Medium', 'v20|Inoffensive to Animals', 'v20|Magic Resistance', 'v20|Oracular Ability', 'v20|Short', 'v20|Permanent Wound',
    'v20|Permanent Fangs', 'v20|Deaf', 'v20|Blind', 'v20|Mute', 'v20|Lame', 'v20|Phobia', 'v20|Amnesia', 'v20|Vengeful', 'v20|Nightmares',
    'v20|Blush of Health', 'v20|Catlike Balance',
    'v20|Beacon of the Unholy',
    'v5|Nuit Mode', 'v5|Crone’s Curse', 'v5|Distressing Fangs', 'v5|Blood Empathy', 'v5|Stench',
  ]);
  const DGR_FIX = {
    'Coldy Logical': 'Coldly Logical', 'Ambidexterous': 'Ambidextrous', 'Monsterous Skin (Serpentis)': 'Monstrous Skin (Serpentis)',
    'Lepper': 'Leper', 'Resistant to Pyshics': 'Resistant to Psychics', 'Untained (Thrall Only)': 'Untainted (Thrall Only)',
    'Viccissitude Alterations': 'Vicissitude Alterations', 'Blood Empathy (Ghoul)': 'Blood Empathy', 'Realisation (Daimonion)': 'Realization (Daimonion)',
  };
  const DGR_BG = {
    'Mawla': { n: 'Demon Master', bg: 'Mawla', dots: [1, 2, 3, 4, 5], sum: 'A demon you serve as a thrall, trading Faith and service for its favours. A Dark Gifts type of Mawla.' },
    'Retainer': { n: 'Unusual Retainers', bg: 'Retainers', dots: [1, 2, 3, 4, 5], sum: 'Dark Gifts retainer types: animal companions, bound spirits, ghosts, necromantic constructs, revenants and familiars.' },
    'Domain': { n: 'Sanctum', bg: 'Sanctum', dots: [1, 2, 3, 4, 5], sum: 'A place of magical power that resonates with your sorcery: bonus dice to magic and no magical mishaps within it.' },
    'Infernal Rituals': { bg: 'Infernal Rituals', dots: [1, 2, 3, 4, 5, 6] },
  };
  const ADV = {};
  D.allAdv = [];
  (D.adv || []).forEach((a) => {
    if (a.ed === 'v20' && a.n === 'Smell of the Grave') {
      a = Object.assign({}, a, {
        adapted: true, dots: [1],
        sum: 'You smell of damp earth and the grave. Lose one die from Social pools where scent matters, and two dice from Stealth pools against anyone who can smell you, unless you are upwind.',
        html: a.html + '<h4>In V5</h4><p>Use the V5 Stench rules: lose one die from seduction and similar Social dice pools, and lose two dice from Stealth pools against opponents who can smell, unless you are upwind.</p>',
      });
    }
    if (a.n === 'Natural Linguist') a = Object.assign({}, a, { cat: 'Linguistics' });
    ADV[a.id] = a;
    if (!HIDE.has(a.ed + '|' + a.n)) D.allAdv.push(a);
  });
  (D.dgrAdv || []).forEach((a) => {
    const id = 'dgr-' + a.id;
    const x = Object.assign({}, a, { id, fid: a.id, ed: 'dgr' });
    if (DGR_FIX[x.n]) x.n = DGR_FIX[x.n];
    if (x.kind === 'background' && DGR_BG[a.n]) Object.assign(x, DGR_BG[a.n]);
    if (!x.dots || !x.dots.length) x.dots = [1];
    ADV[id] = x; D.allAdv.push(x);
  });
  // Sect restrictions on V20 Corebook entries: these say "Sabbat vampires cannot take this"
  ['v20-broken-bond', 'v20-bound', 'v20-loathsome-regnant'].forEach((id) => { if (ADV[id]) ADV[id].noSabbat = true; });
  R.adv = (id) => ADV[id];
  // The player's own Merits and Flaws live on the character; register them so they work like any other entry
  R.syncCustom = (c) => {
    (c.customAdv || []).forEach((d) => {
      const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      ADV['custom:' + d.uid] = { id: 'custom:' + d.uid, n: d.n || 'Custom', ed: 'custom', kind: d.kind === 'flaw' ? 'flaw' : 'merit', dots: [d.dots || 1],
        cat: d.cat || 'Custom', sum: d.text || '', html: (d.text ? String(d.text).split(/\n+/).map((l) => '<p>' + esc(l) + '</p>').join('') : '') + '<p><em>Custom entry, agreed with the Storyteller.</em></p>', custom: true, src: { book: 'Custom', page: '' } };
    });
  };
  // Backgrounds: each group lists the Background itself and its own Merits and Flaws
  R.BG_GROUPS = ['Allies', 'Contacts', 'Fame', 'Haven', 'Herd', 'Influence', 'Mask', 'Mawla', 'Resources', 'Retainers', 'Status', 'Sanctum', 'Infernal Rituals'];
  R.bgGroup = (a) => a.bg || (R.BG_GROUPS.includes(a.cat) ? a.cat : null);
  R.isBgEntry = (a) => !!R.bgGroup(a);
  // Merits and Flaws: V5, V20 and Dark Gifts share categories
  R.MF_CATS = ['Clan & Bloodline', 'Physical', 'Looks', 'Mental', 'Psychological', 'Linguistics', 'Social', 'Supernatural', 'Mythic', 'Numen', 'Magic', 'Infernal',
    'Ingrained Discipline', 'Substance Use', 'Archaic', 'Bonding', 'Blood Ties', 'Feeding', 'Diablerie', 'Cult', 'Other', 'Caitiff', 'Thin-Blood', 'Ghoul & Revenant'];
  R.mfCat = (a) => (a.n === 'Vicissitude Alterations' ? 'Physical' : a.cat === 'Ghoul' || a.cat === 'Ghoul and Revenant' ? 'Ghoul & Revenant' : a.cat || 'Other');
  R.KINDS = { vampire: 'Vampire', ghoul: 'Ghoul', mortal: 'Mortal', revenant: 'Revenant' };
  // mortals and ghouls have their own creation rules; revenants still use the vampire steps
  R.isMortalKind = (c) => c.kind === 'mortal' || c.kind === 'ghoul';
  R.isGhoul = (c) => c.kind === 'ghoul';
  R.tmplKey = (c) => (R.isMortalKind(c) && R.TEMPLATES[c.tmpl] ? c.tmpl : 'pc');
  R.tmpl = (c) => R.TEMPLATES[R.tmplKey(c)];
  R.attrSpread = (c) => R.tmpl(c).attrs || R.ATTR_SPREAD;
  R.skillNeed = (c) => R.tmpl(c).skills || R.SKILL_DISTS[c.skillDist].need;
  const NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  // "one at 4, three at 3, four at 2 and one at 1"
  R.spreadText = (need) => {
    const parts = Object.keys(need).map(Number).sort((a, b) => b - a).map((v) => `${NUMW[need[v]] || need[v]} at ${v}`);
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0] || '';
  };
  R.countsOf = (arr) => { const o = {}; arr.forEach((v) => (o[v] = (o[v] || 0) + 1)); return o; };
  // Entries that need an undead body, the Beast, a sire, Blood Potency or Disciplines of one's own: Kindred only
  // (Companion p. 53: ghouls and mortals have no Beast and can't take Kindred-exclusive Advantages)
  const KINDRED_ONLY = new Set([
    'v5-known-blankbody', 'v5-known-corpse', 'v5-furcus', 'v5-zealotry', 'v5-crisis-of-faith', 'v5-unholy-will', 'v5-beacon-of-profanity',
    'v5-soothed-beast', 'v5-false-love', 'v5-up-all-night', 'v5-unblinking-visage', 'v5-mortal-pretender', 'v5-semblance-of-the-methuselah',
    'v5-bonds-of-fealty', 'v5-enduring-bond', 'v5-fire-resistant', 'v5-ashe-addiction', 'v5-gardener', 'v5-shameful-childe',
    'v20-efficient-digestion', 'v20-smell-of-the-grave', 'v20-dulled-bite', 'v20-infectious-bite', 'v20-open-wound', 'v20-glowing-eyes',
    'v20-slow-healing', 'v20-disease-carrier', 'v20-flesh-of-the-corpse', 'v20-infertile-vitae', 'v20-early-riser', 'v20-discerning-palate',
    'v20-light-sleeper', 'v20-deep-sleeper', 'v20-calm-heart', 'v20-lunacy', 'v20-short-fuse', 'v20-territorial', 'v20-thirst-for-innocence',
    'v20-victim-of-the-masquerade', 'v20-conspicuous-consumption', 'v20-guilt-wracked', 'v20-hemetic', 'v20-feeding-fetish', 'v20-face-the-flames',
    'v20-spoiled-beast', 'v20-unrepentant-beast', 'v20-former-ghoul', 'v20-prestigious-sire', 'v20-infamous-sire', 'v20-sires-resentment',
    'v20-rival-sires', 'v20-black-sheep', 'v20-new-kid', 'v20-disgrace-to-the-blood', 'v20-former-prince', 'v20-escaped-target', 'v20-blood-feud',
    'v20-healing-touch', 'v20-hidden-diablerie', 'v20-additional-discipline', 'v20-deceptive-aura', 'v20-cast-no-reflection',
    'v20-grip-of-the-damned', 'v20-light-sensitive', 'v20-initiate-of-the-road', 'v20-cloaked-in-shadow', 'v20-harbinger-of-the-abyss',
    'v20-indomitable-soul', 'v20-uninvited', 'v20-apostate', 'v20-kiss-of-death', 'v20-lord-of-the-night', 'v20-psychic-leech',
    'v20-vassal-of-the-clan', 'v20-blasphemous-pact', 'v20-profane-trappings', 'v20-the-scourge', 'v20-kashaph', 'v20-trophy-allegiance',
    'v20-trophy-arrogance', 'dgr-320ZxBZUGQeVnafL', 'dgr-t5jtTwArs4lLOHE1',
    // prestation is between Kindred; curses written for the undead
    'v5-minor-boon', 'v5-major-boon', 'v5-minor-debt', 'v5-major-debt', 'v5-life-debt', 'v5-prestation-debts',
    'v20-cold-breeze', 'v20-touch-of-frost', 'v20-eerie-presence', 'v20-lord-of-the-flies', 'v20-deathsight', 'v20-unholy-stain', 'v20-devils-mark', 'v20-vulnerability-to-silver'
  ]);
  // mortals' and ghouls' own entries from the Revised Players Guide and Ghouls & Revenants that suit any living character
  const LIVING_ONLY = new Set(['v20-bitter-blood', 'v20-night-vision', 'v20-vampiric-recognition', 'v20-vigorous', 'v20-criminal-record', 'v20-deluded', 'v20-gullible', 'v20-insomniac', 'v20-duplicitous', 'v20-loose-lips']);
  // Disciplines of one's own: ghouls have some, mortals none
  const NEEDS_DISCIPLINES = new Set(['v20-power-fetish']);
  // standing at court, in a sect or a clan: a ghoul comes along with their domitor, a mortal has none
  const COURT = new Set(['v20-elysium-regular', 'v20-rising-star', 'v20-primogen-bishop-friendship', 'v20-clan-friendship', 'v20-clan-enmity', 'v20-botched-presentation',
    'v20-blood-hunted', 'v20-red-list', 'v20-laughingstock', 'v20-probationary-sect-member', 'v20-expendable', 'v20-sympathizer', 'v20-failure', 'v20-sleeping-with-the-enemy',
    'v20-expiration-date', 'v20-prized-patch', 'v20-soapbox', 'v20-sugar-daddy', 'v20-loyalty']);
  // Merit and Flaw categories only the Kindred can take
  const KINDRED_CATS = new Set(['Feeding', 'Mythic', 'Thin-Blood', 'Caitiff', 'Clan & Bloodline', 'Ingrained Discipline', 'Blood Ties', 'Diablerie']);
  // the Disciplines a ghoul can draw on: their domitor's (any, for a Caitiff), never Blood Sorcery
  R.ghoulDiscs = (c) => {
    if (!c.clan) return [];
    const ks = R.isCaitiff(c) ? R.allDiscKeys() : R.clanDisc(c);
    return [...new Set(ks)].filter((k) => !R.isSchool(k) && k !== 'alchemy' && R.disc(k) && !R.discBanned(k));
  };
  R.ghoulPowers = (c) => c.powers.concat(c.xp.gpow || []);
  // Storyteller bans: single entries, or a whole category (Background group, or Merit / Flaw category)
  R.advCatKey = (a) => (R.isBgEntry(a) ? 'bg:' + R.bgGroup(a) : (a.kind === 'flaw' ? 'f:' : 'm:') + R.mfCat(a));
  R.advBanned = (a) => { const P = R.preset(); return P.bannedAdv.includes(a.id) || (P.bannedAdvCats || []).includes(R.advCatKey(a)); };
  // whole Disciplines, Blood Sorcery schools ("school:x") and Paths ("path:x")
  R.discBanned = (k) => (R.preset().bannedDiscs || []).includes(k);
  R.powerBanned = (id) => {
    const P = R.preset(); if (P.bannedPowers.includes(id)) return true;
    const p = R.power(id); if (!p) return false;
    return R.discBanned(p.d) || (p.path ? R.discBanned('path:' + p.path) : false);
  };
  // Is this entry offered to this character at all? (Restrictions that hide rather than grey out.)
  R.advShown = (c, a) => {
    const P = R.preset();
    if (a.ed === 'v20' && !P.allowV20) return false;
    if (a.ed === 'dgr' && !P.allowDGR) return false;
    // Entries from other settings stay hidden until the Storyteller switches that setting on
    if (a.setting === 'da' && !P.settingDA) return false;
    if (a.setting === 'laibon' && !P.settingLaibon) return false;
    // Entries that need a Path of Enlightenment wait for the Dark Ages template
    if (/Path of Enlightenment/.test(a.req || '') && !P.settingPaths) return false;
    // Sabbat-only entries need the Sabbat toggle, unless the Storyteller lifts the restriction
    if (a.sabbat && !c.sabbat && !P.sabbatAdvAnyone) return false;
    if (a.noSabbat && c.sabbat && !P.sabbatAdvAnyone) return false;
    const kind = c.kind || 'vampire';
    const living = kind !== 'vampire';
    const mk = kind === 'mortal' || kind === 'ghoul';
    if (a.n === 'Vicissitude Alterations') return !mk;
    if (LIVING_ONLY.has(a.id)) return living;
    if (a.ghoul || R.mfCat(a) === 'Ghoul & Revenant' || /Domitor/.test(a.n)) return kind === 'ghoul' || kind === 'revenant';
    if (R.mfCat(a) === 'Magic' || /\((Mortal|Thrall) only\)/i.test(a.n)) return living;
    if (/\(Vampire( only)?\)/i.test(a.n)) return !living;
    if (mk) {
      // no Kindred-only entries, no Herd or Domain; mortals also go without Archaic and Kindred Status
      if (a.thin || a.clan || a.ingrained || KINDRED_CATS.has(R.mfCat(a)) || KINDRED_ONLY.has(a.id)) return false;
      if (kind === 'mortal' && (NEEDS_DISCIPLINES.has(a.id) || COURT.has(a.id))) return false;
      const g = R.bgGroup(a);
      if (g === 'Herd' || g === 'Domain') return false;
      if (kind === 'mortal' && (g === 'Status' || R.mfCat(a) === 'Archaic')) return false;
      if (a.notClan && R.clanIn(c, a.notClan)) return false;
      return true;
    }
    if (a.thin) return R.isThin(c);
    if (a.clan && a.clan.includes('Caitiff')) return R.isCaitiff(c);
    if (a.clan) return R.clanIn(c, a.clan);
    if (a.notClan && R.clanIn(c, a.notClan)) return false;
    return true;
  };
  // Is the character's clan (or the clan its line descends from) in this list? Clan-only entries stay hidden until a clan is chosen.
  const LINEAGE = { 'Assamite Sorcerers': 'Banu Haqim', 'Assamite Viziers': 'Banu Haqim', 'Warrior Setites': 'The Ministry', 'Old Clan Tzimisce': 'Tzimisce', 'Kolduns': 'Tzimisce', 'Telyavelic Tremere': 'Tremere', 'Hecata': 'Giovanni' };
  R.clanIn = (c, list) => {
    const cl = R.clan(c.clan); if (!cl) return false;
    const L = (D.lore || {}).parent || {};
    const names = [cl.n, L[cl.n], LINEAGE[cl.n], LINEAGE[L[cl.n]]].filter(Boolean);
    return names.some((n) => list.includes(n));
  };
  R.discName = (key) => {
    if (!key) return '';
    if (key.startsWith('school:')) return (R.school(key) || {}).n || key;
    if (key.startsWith('path:')) return ((R.path(key.slice(5)) || {}).n || key.slice(5)) + ' (Path)';
    if (key === 'any:valeren') return 'any Valeren path';
    if (key === 'any:quietus') return 'any Quietus path';
    if (key === 'any:path') return 'any Blood Sorcery path';
    return (R.disc(key) || {}).n || key;
  };
  R.allDiscKeys = () => core.disciplines.filter((d) => d.kind === 'disc').map((d) => d.key)
    .concat(Object.keys(core.schools).map((k) => 'school:' + k));
  R.isSchool = (k) => typeof k === 'string' && k.startsWith('school:');

  // ------------------------------------------------------------------ DGR Ingrained Discipline Flaws
  // Taking one opens three levels' worth of extra powers in that Discipline, bought with XP at 2 × level,
  // never above the Discipline rating and without raising it. The Flaws are worth no points.
  // Vicissitude and Flight instead count their rating as one higher (up to 5).
  const ING = {};
  D.allAdv.filter((a) => a.ed === 'dgr' && a.cat === 'Ingrained Discipline').forEach((a) => {
    a.ingrained = true;
    const m = /\(([^)]+)\)\s*$/.exec(a.n); if (!m) return;
    const nm = m[1].toLowerCase();
    a.ingDiscs = core.disciplines.filter((d) => d.kind === 'disc' && (d.n.toLowerCase() === nm || d.n.toLowerCase().startsWith(nm + ' ('))).map((d) => d.key);
    a.ingDiscs.forEach((k) => (ING[k] = a.id));
  });
  R.ING_PER_FLAW = 3;
  R.RATING_ING = new Set(['vicissitude', 'flight']);
  R.ingrainedFor = (k) => (ING[k] ? R.adv(ING[k]) : null);
  R.ingrained = (c, k) => c.adv.filter((x) => x.src === 'ingrained' && (k == null || x.disc === k));
  R.ingBudget = (c, k) => (R.RATING_ING.has(k) ? 0 : R.ING_PER_FLAW * R.ingrained(c, k).length);
  R.ingPowers = (c, k) => (c.xp.ipow || []).filter((id) => (R.power(id) || {}).d === k);
  R.ingUsed = (c, k) => sum(R.ingPowers(c, k).map((id) => R.power(id).lv));
  // the rating that decides which powers you may pick and how many (Vicissitude / Flight Ingrained Flaws add one)
  R.effRating = (c, k) => { const t = R.discTotal(c, k); return R.RATING_ING.has(k) && t > 0 && R.ingrained(c, k).length ? Math.min(5, t + 1) : t; };
  // DGR Blood Potency: extra powers worth up to Blood Potency levels in each Discipline, also 2 XP × level,
  // counted separately from Ingrained Flaws. Not for Blood Sorcery or alchemy.
  R.bpPowers = (c, k) => (c.xp.bpow || []).filter((id) => (R.power(id) || {}).d === k);
  R.bpUsed = (c, k) => sum(R.bpPowers(c, k).map((id) => R.power(id).lv));
  R.bpBudget = (c, k) => (R.isSchool(k) || k === 'alchemy' ? 0 : R.bp(c));
  R.allPowerIds = (c) => R.isMortalKind(c) ? R.ghoulPowers(c) : c.powers.concat(c.xp.powers || [], c.xp.ipow || [], c.xp.bpow || []);

  // ------------------------------------------------------------------ defaults
  R.defaultPreset = () => ({
    v: 1, name: '', note: '', disabledClans: [], bannedPowers: [], bannedAdv: [], bannedAdvCats: [], bannedDiscs: [],
    maxDisc: 5, discCaps: {}, ages: ['childe', 'neonate', 'ancilla'], age: 'neonate', xpBonus: 0,
    meritPts: 7, flawPts: 2, bgBonus: 5, allowV20: true, v20Ratio: 1, allowDGR: true,
    baneKinds: ['v5', 'variant', 'v20'], noPredDefault: false, sabbatAdvAnyone: false, settingDA: false, settingLaibon: false, enforceAmalgams: true, thinAllowed: true, locked: false, sabbat: 'allow',
  });
  R.newChar = () => ({
    v: 1, kind: 'vampire', tmpl: 'pc', sabbat: false, name: '', player: '', concept: '', chronicle: '', ambition: '', desire: '', sire: '', notes: '',
    appearance: '', history: '',
    clan: null, caste: 0, pickDisc: [],
    attrs: Object.fromEntries(R.ATTR_LIST.map((a) => [a, 1])),
    skillDist: 'balanced', skills: Object.fromEntries(R.SKILL_LIST.map((s) => [s, 0])), specs: [],
    disc: {}, powers: [], school: null, paths: {}, sorc: [],
    predator: D.app && D.app.preset && D.app.preset.noPredDefault ? 'none' : null, pred: { spec: 0, disc: null, choices: {}, spread: {}, notes: {} },
    adv: [], customAdv: [], age: null, gen: null, bane: null, convictions: [{ c: '', t: '' }], npcs: {},
    xp: { attrs: {}, skills: {}, disc: {}, paths: {}, bp: 0, specs: [], powers: [], sorc: [], adv: [], ipow: [], bpow: [], gpow: [] },
  });

  // ------------------------------------------------------------------ helpers
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  R.preset = () => D.app.preset;
  R.ageOf = (c) => c.age || R.preset().age || 'neonate';
  R.isThin = (c) => { const cl = R.clan(c.clan); return !!(cl && cl.thin); };
  R.isCaitiff = (c) => { const cl = R.clan(c.clan); return !!(cl && cl.caitiff); };
  R.clanDisc = (c) => {
    const cl = R.clan(c.clan);
    if (!cl) return [];
    if (cl.castes) return (cl.castes[c.caste || 0] || cl.castes[0]).disc.slice();
    let d = (cl.disc || []).slice();
    if (cl.pick) d = d.concat((c.pickDisc || []).filter(Boolean).slice(0, cl.pick));
    return d;
  };
  R.inClan = (c, key) => R.isCaitiff(c) || R.clanDisc(c).includes(key);

  // predator discipline option resolution (DGR has no Oblivion; Blood Sorcery means the clan's school)
  R.predDiscOptions = (c) => {
    const p = R.predator(c.predator);
    if (!p) return [];
    const out = [];
    p.g.disc.forEach((k) => {
      if (k === '@sorcery') {
        const s = R.clanDisc(c).filter(R.isSchool);
        s.forEach((x) => out.push({ key: x, label: R.discName(x) }));
        if (!s.length) out.push({ key: null, label: 'Blood Sorcery (needs an in-clan school)', disabled: true });
      } else if (k === '@oblivion') {
        const cd = R.clanDisc(c);
        const opts = ['obtenebration', 'school:mortis', 'thanatosis'].filter((x) => cd.includes(x));
        (opts.length ? opts : ['obtenebration', 'school:mortis']).forEach((x) => out.push({ key: x, label: R.discName(x) + ' (for Oblivion)' }));
      } else out.push({ key: k, label: R.discName(k) });
    });
    return out;
  };

  // ------------------------------------------------------------------ totals
  R.attr = (c, a) => (c.attrs[a] || 0) + (c.xp.attrs[a] || 0);
  R.skill = (c, s) => (c.skills[s] || 0) + (c.xp.skills[s] || 0);
  R.predDisc = (c) => (!R.isMortalKind(c) && c.predator && c.pred.disc) || null;
  // a ghoul never has Discipline dots: each Discipline they have powers in counts as 1
  const ghoulDot = (c, k) => (R.ghoulPowers(c).some((id) => (R.power(id) || {}).d === k) ? 1 : 0);
  R.discBase = (c, k) => R.isMortalKind(c) ? ghoulDot(c, k) : (c.disc[k] || 0) + (R.predDisc(c) === k ? 1 : 0) + (R.thinAffinity(c) === k ? 1 : 0);
  R.discTotal = (c, k) => R.discBase(c, k) + (R.isMortalKind(c) ? 0 : c.xp.disc[k] || 0);
  R.thinAffinity = (c) => {
    const a = c.adv.find((x) => x.id === 'v5-discipline-affinity');
    return a && a.note ? a.note : null;
  };
  R.hasAlchemy = (c) => R.isThin(c) && c.adv.some((x) => x.id === 'v5-thin-blood-alchemist');
  R.activeDiscs = (c) => {
    if (R.isMortalKind(c)) return [...new Set(R.ghoulPowers(c).map((id) => (R.power(id) || {}).d).filter(Boolean))];
    const keys = new Set(Object.keys(c.disc).filter((k) => c.disc[k] > 0));
    Object.keys(c.xp.disc).forEach((k) => c.xp.disc[k] > 0 && keys.add(k));
    if (R.predDisc(c)) keys.add(R.predDisc(c));
    if (R.thinAffinity(c)) keys.add(R.thinAffinity(c));
    if (R.hasAlchemy(c)) keys.add('alchemy');
    return [...keys];
  };
  R.bp = (c) => {
    if (R.isMortalKind(c)) return 0;
    if (c.free && c.bpSet != null) return c.bpSet;
    const age = R.AGES[R.ageOf(c)];
    let b = R.isThin(c) ? 0 : (age.bp || 1);
    const p = R.predator(c.predator);
    if (p && p.g.bp) b += p.g.bp;
    return Math.min(10, b + (c.xp.bp || 0));
  };
  R.humanity = (c) => {
    if (c.free && c.hum != null) return c.hum;
    if (R.isMortalKind(c)) return 7;
    const age = R.AGES[R.ageOf(c)];
    const p = R.predator(c.predator);
    return 7 + (age.hum || 0) + ((p && p.g.hum) || 0);
  };
  R.health = (c) => R.attr(c, 'stamina') + 3;
  R.willpower = (c) => R.attr(c, 'composure') + R.attr(c, 'resolve');
  R.cap = (c, k) => {
    const P = R.preset();
    if (R.discBanned(k)) return 0;
    const own = P.discCaps && P.discCaps[k];
    return Math.min(P.maxDisc || 5, own != null && own !== '' ? +own : 5);
  };
  R.schoolKey = (c) => R.activeDiscs(c).find(R.isSchool) || null;
  R.pathDots = (c, p) => (c.paths[p] || 0) + (c.xp.paths[p] || 0);
  R.pathTotal = (c) => sum(Object.keys(c.paths).map((p) => c.paths[p] || 0));

  // ------------------------------------------------------------------ advantages accounting
  R.advCost = (c, a) => {
    const A = R.adv(a.id);
    if (!A) return 0;
    if (A.thin || A.kind === 'flaw') return 0;
    const pts = a.dots || 0;
    return A.ed === 'v20' ? pts * (R.preset().v20Ratio || 1) : pts;
  };
  R.advBudget = (c) => {
    const P = R.preset(); const age = R.isMortalKind(c) ? {} : R.AGES[R.ageOf(c)];
    const T = c.npcT || R.tmpl(c);
    // templates: one pool for Backgrounds and Merits, and exactly the template's Flaws
    if (T.attrs) return { merit: T.adv, flaw: T.flawMax, bg: 0, flawMax: T.flawMax };
    return { merit: (P.meritPts ?? 7) + (age.adv || 0), flaw: (P.flawPts ?? 2) + (age.flaw || 0), bg: P.bgBonus ?? 5 };
  };
  R.FLAW_CAP = 7;
  R.advTally = (c) => {
    const B = R.advBudget(c);
    let bg = 0, merit = 0, flaw = 0, tbM = 0, tbF = 0;
    c.adv.filter((a) => a.src !== 'pred' && a.src !== 'xp' && a.src !== 'ingrained').forEach((a) => {
      const A = R.adv(a.id); if (!A) return;
      if (A.thin) { A.kind === 'flaw' ? tbF++ : tbM++; return; }
      if (A.kind === 'flaw') flaw += a.dots || 0;
      else if (A.kind === 'background') bg += R.advCost(c, a);
      else merit += R.advCost(c, a);
    });
    const bgFromBonus = Math.min(bg, B.bg);
    // Optional rule (V20 p. 82, converted): Flaw dots beyond the required ones, up to 7 Flaw dots in all, buy Merits 1:1.
    // These extra points can only go into Merits, never Backgrounds.
    const extra = c.moreMerits && B.flawMax == null ? Math.max(0, Math.min(flaw, R.FLAW_CAP) - B.flaw) : 0;
    const meritFromExtra = Math.min(merit, extra);
    const used = merit - meritFromExtra + (bg - bgFromBonus);
    return { B, bg, merit, flaw, bgFromBonus, used, left: B.merit - used, bgLeft: B.bg - bgFromBonus, tbM, tbF,
      extra, extraLeft: extra - meritFromExtra, usedAll: merit + (bg - bgFromBonus), totalAll: B.merit + extra };
  };

  // ------------------------------------------------------------------ XP
  R.XP = {
    attr: (n) => n * 5, skill: (n) => n * 3, spec: () => 3, clanDisc: (n) => n * 5, otherDisc: (n) => n * 7,
    caitiffDisc: (n) => n * 6, ritual: (l) => l * 3, formula: (l) => l * 3, adv: (d) => d * 3, bp: (n) => n * 10,
    path: (n) => n * 5, effect: (l) => l, ingPower: (l) => l * 2, ghoulPower: () => 10,
  };
  R.discXPCost = (c, k, newLevel) => {
    if (k === 'school:abyss') return newLevel * 5;
    // Quietus / Valeren variant paths: cheaper up to the highest owned path of the same family
    const fam = /^quietus/.test(k) ? 'quietus' : /^valeren/.test(k) ? 'valeren' : null;
    if (fam && !R.inClan(c, k)) {
      const best = Math.max(0, ...R.activeDiscs(c).filter((x) => x !== k && x.startsWith(fam)).map((x) => R.discTotal(c, x)));
      if (newLevel <= best) return newLevel * 5;
    }
    if (R.isCaitiff(c)) return R.XP.caitiffDisc(newLevel);
    return R.inClan(c, k) ? R.XP.clanDisc(newLevel) : R.XP.otherDisc(newLevel);
  };
  R.xpSpent = (c) => {
    const rows = [];
    const X = c.xp;
    R.ATTR_LIST.forEach((a) => { for (let i = 1; i <= (X.attrs[a] || 0); i++) rows.push([R.ATTR_NAMES[a] + ' ' + (c.attrs[a] + i), R.XP.attr(c.attrs[a] + i)]); });
    R.SKILL_LIST.forEach((s) => { for (let i = 1; i <= (X.skills[s] || 0); i++) rows.push([R.SKILL_NAMES[s] + ' ' + (c.skills[s] + i), R.XP.skill(c.skills[s] + i)]); });
    X.specs.forEach((sp) => rows.push(['Specialty: ' + R.SKILL_NAMES[sp.skill] + ' (' + (sp.name || '…') + ')', 3]));
    if (R.isMortalKind(c)) {
      (X.gpow || []).forEach((id) => { const p = R.power(id); if (p) rows.push([R.discName(p.d) + ' power: ' + p.n, R.XP.ghoulPower()]); });
      c.adv.filter((a) => a.src === 'xp').forEach((a) => { const A = R.adv(a.id); if (A) rows.push([A.n + ' ' + '•'.repeat(a.dots || 0), R.XP.adv(a.dots || 0)]); });
      return rows;
    }
    Object.keys(X.disc).forEach((k) => { const b = R.discBase(c, k); for (let i = 1; i <= (X.disc[k] || 0); i++) rows.push([R.discName(k) + ' ' + (b + i), R.discXPCost(c, k, b + i)]); });
    Object.keys(X.paths).forEach((p) => { const b = c.paths[p] || 0; for (let i = 1; i <= (X.paths[p] || 0); i++) rows.push([R.discName('path:' + p) + ' ' + (b + i), R.XP.path(b + i)]); });
    for (let i = 1; i <= (X.bp || 0); i++) rows.push(['Blood Potency ' + (R.bp(c) - X.bp + i), R.XP.bp(R.bp(c) - X.bp + i)]);
    X.sorc.forEach((id) => { const p = R.power(id); if (p) rows.push([(p.d === 'rituals' ? 'Ritual: ' : 'Special Effect: ') + p.n, p.d === 'rituals' ? R.XP.ritual(p.lv) : R.XP.effect(p.lv)]); });
    X.powers.forEach((id) => { const p = R.power(id); if (p && p.d === 'alchemy') rows.push(['Formula: ' + p.n, R.XP.formula(p.lv)]); });
    (X.ipow || []).forEach((id) => { const p = R.power(id); if (p) rows.push([R.discName(p.d) + ' power (Ingrained Flaw): ' + p.n, R.XP.ingPower(p.lv)]); });
    (X.bpow || []).forEach((id) => { const p = R.power(id); if (p) rows.push([R.discName(p.d) + ' power (Blood Potency): ' + p.n, R.XP.ingPower(p.lv)]); });
    c.adv.filter((a) => a.src === 'xp').forEach((a) => { const A = R.adv(a.id); if (A) rows.push([A.n + ' ' + '•'.repeat(a.dots || 0), R.XP.adv(a.dots || 0)]); });
    return rows;
  };
  R.xpTotal = (c) => {
    const P = R.preset();
    return (R.isMortalKind(c) ? 0 : R.AGES[R.ageOf(c)].xp || 0) + (+P.xpBonus || 0);
  };

  // ------------------------------------------------------------------ powers
  R.powerSlots = (c, k) => R.effRating(c, k);
  R.chosenPowers = (c, k) => c.powers.filter((id) => (R.power(id) || {}).d === k);
  R.meetsReq = (c, alts) => {
    if (!alts || !alts.length) return true;
    return alts.some((r) => {
      if (r.k.startsWith('path:')) return R.pathDots(c, r.k.slice(5)) >= r.l;
      if (r.k === 'any:path') return Object.keys(core.paths).some((p) => R.pathDots(c, p) >= r.l);
      if (r.k === 'any:valeren') return ['valerenhealer', 'valerenwarrior', 'valerenwatcher'].some((x) => R.discTotal(c, x) >= r.l);
      if (r.k === 'any:quietus') return ['quietusanimae', 'quietuscruciatus', 'quietussanguinis'].some((x) => R.discTotal(c, x) >= r.l);
      return R.discTotal(c, r.k) >= r.l;
    });
  };
  R.prereqMet = (c, p) => {
    if (!p.prer || !p.prer.length) return true;
    const names = c.powers.map((id) => (R.power(id) || {}).n);
    return p.prer.some((n) => names.includes(n));
  };

  R.freeSpecAllowance = (c) => R.tmpl(c).attrs ? R.tmpl(c).specs : R.FREE_SPEC_SKILLS.filter((s) => c.skills[s] > 0).length + 1;
  const SKILL_BY_NAME = {};
  Object.keys(R.SKILL_NAMES).forEach((k) => (SKILL_BY_NAME[R.SKILL_NAMES[k].toLowerCase()] = k));
  R.parseSpec = (str) => {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(str);
    if (!m) return null;
    return { skill: SKILL_BY_NAME[m[1].trim().toLowerCase()], name: m[2].trim() };
  };
  // all specialties (chosen + predator)
  R.allSpecs = (c) => {
    const out = c.specs.concat(c.xp.specs.map((s) => Object.assign({ src: 'xp' }, s)));
    const p = !R.isMortalKind(c) && R.predator(c.predator);
    if (p) {
      const ps = R.parseSpec(p.g.spec[c.pred.spec || 0] || '');
      if (ps && ps.skill) out.push({ skill: ps.skill, name: c.pred.specName || ps.name, src: 'pred' });
    }
    return out;
  };
  const ADV_BY_NAME = {};
  (D.adv || []).forEach((a) => { if (a.ed === 'v5' && !ADV_BY_NAME[a.n.toLowerCase()]) ADV_BY_NAME[a.n.toLowerCase()] = a.id; });
  R.advIdByName = (n) => ADV_BY_NAME[(n || '').toLowerCase()] || null;
  // Advantages and Flaws granted by the predator type (do not cost points)
  R.predGrants = (c) => {
    const p = !R.isMortalKind(c) && R.predator(c.predator); if (!p) return [];
    const g = p.g, out = [];
    const add = (name, dots, note) => out.push({ id: R.advIdByName(name) || 'note:' + name, n: name, dots, note: note || '', src: 'pred' });
    (g.merit || []).forEach(([n, d]) => add(n, d));
    (g.bg || []).forEach(([n, d, note]) => add(n, d, note));
    (g.flaw || []).forEach(([n, d, note]) => add(n, d, note));
    (g.choice || []).forEach((opts, i) => {
      const k = c.pred.choices[i];
      if (k != null && opts[k]) { const [, n, d, note] = opts[k]; add(n, d, note); }
    });
    (g.spread || []).forEach((s, i) => {
      const sp = c.pred.spread[i] || {};
      Object.keys(sp).forEach((n) => sp[n] > 0 && add(n, sp[n], (c.pred.notes || {})[n]));
    });
    return out;
  };

  // ------------------------------------------------------------------ allies and retainers
  // Every Allies or Retainers entry (and predator grant) is a Storyteller character the player can build or leave to the Storyteller.
  // V5 Corebook (2021) p. 184: Effectiveness • Weak, •• Average (or a group of Weak), ••• Gifted (or a group of Average),
  // •••• Deadly (or Gifted with magic, or a group of Gifted). p. 193: Retainers • Weak mortal, •• Average mortal or a ghoul
  // with no Advantages, ••• a ghoul with Gifted traits.
  const TIERS = ['weak', 'average', 'gifted', 'deadly'];
  const newUid = () => Math.random().toString(36).slice(2, 9);
  R.companionSlots = (c) => {
    const out = [];
    c.adv.forEach((x) => {
      if (x.id !== 'v5-allies' && x.id !== 'v5-retainers') return;
      if (!x.uid) x.uid = newUid();
      if (x.id === 'v5-allies') out.push({ key: 'a:' + x.uid, type: 'ally', eff: x.eff != null ? x.eff : Math.max(1, Math.min(4, (x.dots || 2) - 1)), rel: x.rel != null ? x.rel : 1, note: x.note || '' });
      else out.push({ key: 'a:' + x.uid, type: 'retainer', dots: x.dots || 1, note: x.note || '' });
    });
    R.predGrants(c).forEach((g, i) => {
      if (g.n === 'Allies') out.push({ key: 'p:' + c.predator + ':' + i, type: 'ally', eff: Math.max(1, Math.min(4, g.dots)), rel: 0, note: g.note || '', pred: true });
      if (g.n === 'Retainers') out.push({ key: 'p:' + c.predator + ':' + i, type: 'retainer', dots: g.dots, note: g.note || '', pred: true });
    });
    return out;
  };
  // a retainer at •• or more may be a ghoul, if the character is a vampire who can be their domitor
  R.npcCanGhoul = (c, slot) => slot.type === 'retainer' && slot.dots >= 2 && !R.isMortalKind(c);
  R.npcKind = (c, slot, n) => (R.npcCanGhoul(c, slot) && (n.kind === 'ghoul' || (n.kind == null && slot.dots >= 3)) ? 'ghoul' : 'mortal');
  // Allies of Effectiveness •• or more can be a group: one template lower, on one sheet (a team that does one thing)
  // or as two or three people with sheets of their own
  R.npcCanGroup = (slot) => slot.type === 'ally' && slot.eff > 1;
  R.npcSize = (slot, n) => (R.npcCanGroup(slot) ? (n.size != null ? n.size : n.group ? 'group' : null) : 1);
  R.npcTmplKey = (c, slot, n) => {
    const size = R.npcSize(slot, n);
    if (slot.type === 'ally') return TIERS[Math.max(0, Math.min(3, slot.eff - 1 - (size && size !== 1 ? 1 : 0)))];
    return TIERS[Math.max(0, Math.min(2, slot.dots - 1))];
  };
  R.npcTmpl = (c, slot, n) => {
    const T = Object.assign({}, R.TEMPLATES[R.npcTmplKey(c, slot, n)]);
    // a •• ghoul retainer is Average with no Advantages
    if (slot.type === 'retainer' && slot.dots === 2 && R.npcKind(c, slot, n) === 'ghoul') { T.adv = 0; T.flawMax = 0; }
    return T;
  };
  // Disciplines a ghoul retainer can draw on: the character's own (never Blood Sorcery)
  R.npcGhoulDiscs = (c) => R.activeDiscs(c).filter((k) => !R.isSchool(k) && k !== 'alchemy' && R.disc(k) && !R.discBanned(k));
  R.npcSheetBlank = () => ({ name: '', concept: '', attrs: Object.fromEntries(R.ATTR_LIST.map((a) => [a, 1])), skills: Object.fromEntries(R.SKILL_LIST.map((s) => [s, 0])), specs: [], adv: [], powers: [], notes: '' });
  R.npcBlank = () => Object.assign(R.npcSheetBlank(), { mode: null, kind: null, size: null, stNote: '', extra: [] });
  R.npcFor = (c, slot) => { c.npcs = c.npcs || {}; return c.npcs[slot.key] || (c.npcs[slot.key] = R.npcBlank()); };
  // the sheets of one entry: the entry itself, plus the other members of a group of two or three
  R.npcSheets = (slot, n) => {
    const size = R.npcSize(slot, n);
    n.extra = n.extra || [];
    const more = typeof size === 'number' ? size - 1 : 0;
    while (n.extra.length < more) n.extra.push(R.npcSheetBlank());
    return [n].concat(n.extra.slice(0, more));
  };
  R.npcLabel = (slot) => slot.type === 'ally' ? `Allies (Effectiveness ${slot.eff}${slot.rel ? ', Reliability ' + slot.rel : ''})` : `Retainer ${'•'.repeat(slot.dots)}`;
  R.npcAdvPts = (n) => {
    let m = 0, f = 0;
    (n.adv || []).forEach((x) => { const A = R.adv(x.id); if (!A) return; const d = (x.dots || 0) * (A.ed === 'v20' ? (R.preset().v20Ratio || 1) : 1); A.kind === 'flaw' ? (f += x.dots || 0) : (m += d); });
    return { m, f };
  };
  R.npcSheetIssues = (c, slot, n, sh, who) => {
    const out = [];
    const T = R.npcTmpl(c, slot, n);
    const got = R.ATTR_LIST.map((a) => sh.attrs[a]).sort((a, b) => b - a);
    if (got.join() !== T.attrs.join()) out.push(`${who}: Attributes must be ${R.spreadText(R.countsOf(T.attrs))}.`);
    const cnt = {}; R.SKILL_LIST.forEach((k) => { const v = sh.skills[k]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
    if ([1, 2, 3, 4, 5].some((l) => (cnt[l] || 0) !== (T.skills[l] || 0))) out.push(`${who}: Skills must be ${R.spreadText(T.skills)}.`);
    const sp = (sh.specs || []).filter((x) => x.skill);
    if (sp.length > T.specs) out.push(`${who}: ${T.specs ? 'only ' + T.specs : 'no'} specialt${T.specs === 1 ? 'y' : 'ies'} allowed.`);
    else if (sp.length < T.specs) out.push(`${who}: ${T.specs - sp.length} specialt${T.specs - sp.length === 1 ? 'y' : 'ies'} left to take.`);
    if (T.specOn4 && sp.length && !sp.some((x) => sh.skills[x.skill] >= 4)) out.push(`${who}: the specialty goes on a Skill at 4.`);
    const P = R.npcAdvPts(sh);
    if (P.m > T.adv) out.push(`${who}: ${P.m} Advantage points spent, the template allows ${T.adv}.`);
    if (P.f > T.flawMax) out.push(`${who}: ${P.f} points of Flaws, the template allows ${T.flawMax}.`);
    else if (P.f < T.flawMax) out.push(`${who}: take ${T.flawMax - P.f} more point${T.flawMax - P.f === 1 ? '' : 's'} of Flaws.`);
    if (R.npcKind(c, slot, n) === 'ghoul') {
      const ok = R.npcGhoulDiscs(c);
      if (!(sh.powers || []).length) out.push(`${who}: choose their level 1 power from your Disciplines.`);
      (sh.powers || []).forEach((id) => { const p = R.power(id); if (p && (!ok.includes(p.d) || p.lv > 1)) out.push(`${who}: ${p.n} isn’t a level 1 power of one of your Disciplines.`); });
      (sh.powers || []).forEach((id) => { const p = R.power(id); if (p && p.amr && R.preset().enforceAmalgams) out.push(`${who}: ${p.n} is an amalgam (${p.am}); a ghoul with one power can’t meet it.`); });
    }
    return out;
  };
  R.npcSheetName = (slot, n, sh, j, count) => sh.name || (count > 1 ? `${n.name || 'Ally'}, member ${j + 1}` : n.name || (slot.type === 'ally' ? 'Ally' : 'Retainer'));
  // one line about a companion, for the notes of their patron's sheet
  R.npcSummary = (c, slot, n) => {
    const who = (n.name || (slot.type === 'ally' ? 'Ally' : 'Retainer')) + ' (' + R.npcLabel(slot) + (slot.note ? ', ' + slot.note : '') + ')';
    if (n.mode === 'st') return `${who}: left to the Storyteller.${n.stNote ? ' ' + n.stNote : ''}`;
    const size = R.npcSize(slot, n); if (size == null) return `${who}: not built yet.`;
    const T = R.npcTmpl(c, slot, n), kind = R.npcKind(c, slot, n) === 'ghoul' ? 'ghoul' : 'mortal';
    const sheets = R.npcSheets(slot, n);
    if (size === 'group') return `${who}: a group of ${T.label} ${kind}s on one sheet${n.concept ? ', ' + n.concept : ''}.`;
    if (sheets.length > 1) return `${who}: ${sheets.length} ${T.label} ${kind}s, ${sheets.map((sh, j) => R.npcSheetName(slot, n, sh, j, sheets.length) + (sh.concept ? ' (' + sh.concept + ')' : '')).join(', ')}.`;
    return `${who}: ${T.label} ${kind}${n.concept ? ', ' + n.concept : ''}.`;
  };
  R.npcIssues = (c, slot, n) => {
    if (!n.mode) return [`Decide who builds ${R.npcLabel(slot)}${slot.note ? ' (' + slot.note + ')' : ''}: you or the Storyteller.`];
    if (n.mode === 'st') return [];
    if (R.npcSize(slot, n) == null) return [`${n.name || R.npcLabel(slot)}: say how many people they are.`];
    const sheets = R.npcSheets(slot, n);
    return [].concat(...sheets.map((sh, j) => R.npcSheetIssues(c, slot, n, sh, R.npcSheetName(slot, n, sh, j, sheets.length))));
  };

  // ------------------------------------------------------------------ validation
  // Where a predator-type spread option lives: Backgrounds page or Merits & Flaws page.
  R.spreadOptKind = (o) => { if (/flaws?$/i.test(o)) return 'flaw'; const id = R.advIdByName(o); const A = id && R.adv(id); return A ? (R.isBgEntry(A) ? (A.kind === 'flaw' ? 'bgflaw' : 'bg') : A.kind) : R.BG_GROUPS.includes(o) ? 'bg' : 'merit'; };
  R.spreadStep = (s) => (s.opts.every((o) => ['bg', 'bgflaw'].includes(R.spreadOptKind(o))) ? 'backgrounds' : 'merits');
  R.validate = (c) => {
    if (c.free) return [];
    const P = R.preset();
    const issues = []; // {step, msg, level:'err'|'warn'}
    const E = (step, msg, level) => issues.push({ step, msg, level: level || 'err' });
    if (!c.name.trim()) E('concept', 'Give your character a name.', 'warn');
    const mk = R.isMortalKind(c), ghoul = R.isGhoul(c), TP = R.tmpl(c);
    if (c.kind === 'mortal') { /* no clan, Disciplines or predator type */ }
    else if (ghoul && !c.clan) E('clan', 'Choose your domitor’s clan.');
    else if (ghoul && R.isThin(c)) E('clan', 'A thin-blood can’t keep a ghoul; choose another clan for the domitor.');
    else if (!c.clan) E('clan', 'Choose a clan or bloodline.');
    else if (P.disabledClans.includes(c.clan)) E('clan', 'The Storyteller has disabled this clan.');
    else if (!R.clanAvailable(c, R.clan(c.clan))) E('clan', c.sabbat ? 'This clan isn’t available to a Sabbat character.' : 'This clan is only available to Sabbat characters.');
    if (P.sabbat === 'only' && !c.sabbat && !mk) E('clan', 'This chronicle is for Sabbat characters only.');
    if (P.sabbat === 'off' && c.sabbat) E('clan', 'This chronicle has no Sabbat characters.');
    // attributes
    const got = R.ATTR_LIST.map((a) => c.attrs[a]).sort((a, b) => b - a);
    const spread = R.attrSpread(c);
    if (got.join() !== spread.join()) E('attributes', `Attributes must be ${R.spreadText(R.countsOf(spread))}.`);
    // skills
    const need = R.skillNeed(c);
    const distLabel = TP.attrs ? `${TP.label} template` : R.SKILL_DISTS[c.skillDist].label;
    const cnt = {};
    R.SKILL_LIST.forEach((s) => { const v = c.skills[s]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
    const bad = [1, 2, 3, 4, 5].filter((l) => (cnt[l] || 0) !== (need[l] || 0));
    if (bad.length) E('skills', `Skills don't match the ${distLabel} spread yet.`);
    const freeSpecs = c.specs.filter((s) => s.src === 'free');
    const allowed = R.freeSpecAllowance(c);
    if (!TP.attrs) R.FREE_SPEC_SKILLS.forEach((s) => {
      if (c.skills[s] > 0 && !c.specs.some((x) => x.skill === s && (x.name || '').trim())) E('skills', `${R.SKILL_NAMES[s]} needs a specialty.`);
    });
    if (freeSpecs.length > allowed) E('skills', `You have ${freeSpecs.length} free specialties; the limit is ${allowed}.`);
    if (TP.specOn4 && freeSpecs.length && !freeSpecs.some((x) => c.skills[x.skill] >= 4)) E('skills', 'The Gifted template’s specialty goes on one of the Skills at 4.', 'warn');
    if (freeSpecs.length > allowed) { /* reported above */ } else if (freeSpecs.length < allowed) E('skills', `${allowed - freeSpecs.length} free specialt${allowed - freeSpecs.length === 1 ? 'y' : 'ies'} left to take.`, 'warn');
    c.specs.forEach((s) => { if (!(s.name || '').trim()) E('skills', `Name your ${R.SKILL_NAMES[s.skill]} specialty.`, 'warn'); });
    c.specs.forEach((s) => { if (R.skill(c, s.skill) < 1) E('skills', `Specialty in ${R.SKILL_NAMES[s.skill]} needs at least one dot in it.`); });
    // disciplines: ghouls get one level 1 power from the domitor's Disciplines, more for 10 XP each
    if (ghoul && c.clan) {
      const own = R.ghoulDiscs(c);
      if (!c.powers.length) E('disciplines', 'Choose your free level 1 power from your domitor’s Disciplines.', 'warn');
      if (c.powers.length > 1) E('disciplines', 'A ghoul starts with only one free power.');
      R.ghoulPowers(c).forEach((id) => { const p = R.power(id); if (!p) return;
        if (!own.includes(p.d)) E('disciplines', `${p.n}: ${R.discName(p.d)} isn’t one of your domitor’s Disciplines.`);
        if (p.lv > 1) E('disciplines', `${p.n}: ghouls only learn level 1 powers.`);
        if (R.powerBanned(id)) E('disciplines', `${p.n} is banned by the Storyteller.`);
        if (p.amr && !R.meetsReq(c, p.amr)) E('disciplines', `${p.n}: amalgam needs ${p.am}.`, P.enforceAmalgams ? 'err' : 'warn'); });
    }
    if (c.clan && !R.isThin(c) && !mk) {
      const vals = Object.keys(c.disc).filter((k) => c.disc[k] > 0).map((k) => [k, c.disc[k]]);
      const two = vals.filter((v) => v[1] === 2), one = vals.filter((v) => v[1] === 1);
      if (!(two.length === 1 && one.length === 1 && vals.length === 2)) E('disciplines', 'Put two dots in one Discipline and one dot in another.');
      vals.forEach(([k]) => { if (!R.inClan(c, k)) E('disciplines', `${R.discName(k)} is not one of your clan Disciplines.`); });
    }
    if (!mk) R.activeDiscs(c).forEach((k) => {
      if (R.discBanned(k)) E('disciplines', `${R.discName(k)} is banned by the Storyteller.`);
      else if (R.discTotal(c, k) > R.cap(c, k)) E('disciplines', `${R.discName(k)} is above the Storyteller's limit of ${R.cap(c, k)}.`);
      if (R.isSchool(k)) {
        Object.keys(c.paths).forEach((pk) => { if (c.paths[pk] && R.discBanned('path:' + pk)) E('disciplines', `${R.path(pk).n} is banned by the Storyteller.`); });
        const need2 = R.discTotal(c, k);
        const have = sum(Object.values(c.paths).map((x) => x || 0));
        if (have !== need2) E('disciplines', `Spread ${need2} Path dot${need2 === 1 ? '' : 's'} for ${R.discName(k)} (placed ${have}).`);
        const picks = c.sorc.length;
        const ptot = sum(Object.keys(c.paths).map((p) => R.pathDots(c, p))) - sum(Object.values(c.xp.paths).map((x) => x || 0));
        if (picks !== ptot) E('disciplines', `Choose ${ptot} free ritual${ptot === 1 ? '' : 's'} or special effect${ptot === 1 ? '' : 's'} (chosen ${picks}).`, picks < ptot ? 'warn' : 'err');
        return;
      }
      const slots = R.powerSlots(c, k), ch = R.chosenPowers(c, k).length;
      if (k === 'alchemy') { if (ch < slots) E('disciplines', `Choose ${slots - ch} more Thin-Blood Alchemy formula${slots - ch === 1 ? '' : 's'}.`, 'warn'); return; }
      if (ch < slots) E('disciplines', `Choose ${slots - ch} more ${R.discName(k)} power${slots - ch === 1 ? '' : 's'}.`, 'warn');
      if (ch > slots) E('disciplines', `Too many ${R.discName(k)} powers (${ch} for ${slots} dots).`);
    });
    if (!mk) c.powers.forEach((id) => {
      const p = R.power(id); if (!p) return;
      if (R.powerBanned(id)) E('disciplines', `${p.n} is banned by the Storyteller.`);
      if (p.lv > R.effRating(c, p.d)) E('disciplines', `${p.n} needs ${R.discName(p.d)} ${p.lv}.`);
      if (p.amr && !R.meetsReq(c, p.amr)) E('disciplines', `${p.n}: amalgam needs ${p.am}.`, P.enforceAmalgams ? 'err' : 'warn');
      if (p.prer && !R.prereqMet(c, p)) E('disciplines', `${p.n} requires ${p.pre}.`, 'warn');
    });
    // DGR Ingrained Discipline Flaws and the extra powers they open
    R.ingrained(c).forEach((x) => { if (R.discTotal(c, x.disc) < 1) E('xp', `${(R.adv(x.id) || {}).n}: you need at least one dot of ${R.discName(x.disc)}.`); });
    [...new Set((c.xp.ipow || []).map((id) => (R.power(id) || {}).d).filter(Boolean))].forEach((k) => {
      const used = R.ingUsed(c, k), cap = R.ingBudget(c, k);
      if (used > cap) E('xp', `Extra ${R.discName(k)} powers add up to ${used} levels, but your Ingrained Flaws allow ${cap}.`);
    });
    [...new Set((c.xp.bpow || []).map((id) => (R.power(id) || {}).d).filter(Boolean))].forEach((k) => {
      const used = R.bpUsed(c, k), cap = R.bpBudget(c, k);
      if (used > cap) E('xp', `Extra ${R.discName(k)} powers from Blood Potency add up to ${used} levels, but Blood Potency ${R.bp(c)} allows ${cap}.`);
    });
    (c.xp.ipow || []).concat(c.xp.bpow || []).forEach((id) => { const p = R.power(id); if (!p) return;
      if (p.lv > R.discTotal(c, p.d)) E('xp', `${p.n} needs ${R.discName(p.d)} ${p.lv}.`);
      if (R.powerBanned(id)) E('xp', `${p.n} is banned by the Storyteller.`); });
    // predator
    if (mk) { /* mortals and ghouls don't have one */ } else if (!c.predator) E('predator', 'Choose a predator type.');
    else if (c.predator !== R.NO_PRED) {
      const p = R.predator(c.predator);
      if (!c.pred.disc) E('predator', 'Pick the Discipline dot your predator type grants.');
      if (p.g.notClan && c.clan && p.g.notClan.includes((R.clan(c.clan) || {}).n)) E('predator', `${(R.clan(c.clan) || {}).n} can't take the ${p.n} predator type.`);
      (p.g.choice || []).forEach((_, i) => { if (c.pred.choices[i] == null) E('predator', 'Make every predator type choice.'); });
      (p.g.spread || []).forEach((s, i) => {
        const tot = sum(Object.values(c.pred.spread[i] || {}));
        if (tot !== s.pts) { const st = R.spreadStep(s); issues.push({ step: st, tab: st === 'merits' ? (s.opts.every((o) => ['flaw', 'bgflaw'].includes(R.spreadOptKind(o))) ? 'flaw' : 'merit') : null, anchor: 'pred-spread-' + i, msg: `Spread ${s.pts} dots between ${s.opts.join(' and ')}.`, level: 'err' }); }
      });
    }
    // backgrounds, merits and flaws
    const T = R.advTally(c);
    if (T.bgLeft > 0) E('backgrounds', `${T.bgLeft} free Background point${T.bgLeft === 1 ? '' : 's'} left.`, 'warn');
    if (T.left < 0) E('merits', `You've spent ${-T.left} Advantage point${T.left === -1 ? '' : 's'} too many.`);
    if (T.left > 0 && !TP.attrs) issues.push({ step: 'merits', tab: 'merit', msg: `${T.left} Advantage point${T.left === 1 ? '' : 's'} left to spend.`, level: 'warn' });
    if (c.moreMerits && T.flaw > R.FLAW_CAP) E('merits', `With extra Merits, Flaws are capped at ${R.FLAW_CAP} points (you have ${T.flaw}).`);
    if (T.extraLeft > 0) issues.push({ step: 'merits', tab: 'merit', msg: `${T.extraLeft} extra Merit point${T.extraLeft === 1 ? '' : 's'} (bought with Flaws) left to spend.`, level: 'warn' });
    if (T.B.flawMax != null && T.flaw > T.B.flawMax) E('merits', T.B.flawMax ? `The ${TP.label} template allows at most ${T.B.flawMax} points of Flaws (you have ${T.flaw}).` : `The ${TP.label} template has no Flaws.`);
    if (T.flaw < T.B.flaw) issues.push({ step: 'merits', tab: 'flaw', msg: `Take ${T.B.flaw - T.flaw} more point${T.B.flaw - T.flaw === 1 ? '' : 's'} of Flaws.`, level: 'err' });
    if (R.isThin(c)) {
      if (T.tbF < 1 || T.tbF > 3) E('merits', 'Thin-bloods take one to three Thin-Blood Flaws.');
      if (T.tbM !== T.tbF) E('merits', 'Take as many Thin-Blood Merits as Thin-Blood Flaws.');
    }
    c.adv.forEach((a) => {
      const A = R.adv(a.id); if (!A) return;
      const st = R.isBgEntry(A) ? 'backgrounds' : 'merits';
      if (R.advBanned(A)) E(st, `${A.n} is banned by the Storyteller.`);
      if (!R.advShown(c, A)) E(st, `${A.n} isn't available to this character.`);
      if (A.notClan && c.clan && A.notClan.includes((R.clan(c.clan) || {}).n)) E(st, `${(R.clan(c.clan) || {}).n} can't take ${A.n}.`);
      if (A.req && /Ancillae/.test(A.req) && (mk || R.ageOf(c) !== 'ancilla')) E(st, `${A.n}: ${A.req}.`);
    });
    // blood
    if (mk) { /* no bane */ } else if (c.clan && !c.bane) E('blood', 'Choose which bane you carry.', 'warn');
    else if (c.bane && !R.banesFor(c).some((b) => b.id === c.bane)) E('blood', 'Your bane doesn’t match your clan or caste; pick it again.');
    if (!c.convictions.some((x) => x.c.trim())) E('blood', 'Write at least one Conviction and its Touchstone.', 'warn');
    // xp
    const spent = sum(R.xpSpent(c).map((r) => r[1])), total = R.xpTotal(c);
    if (spent > total) E('xp', `You've spent ${spent} XP of ${total}.`);
    else if (spent < total) E('xp', `Spend your experience: ${total - spent} XP left.`, 'warn');
    // allies and retainers: never block the character itself
    R.companionSlots(c).forEach((slot) => R.npcIssues(c, slot, R.npcFor(c, slot)).forEach((m) => E('companions', m, 'warn')));
    return issues;
  };
})();
