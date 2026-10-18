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

  R.AGES = {
    childe: { label: 'Childe', era: 'Embraced within the last 15 years', gens: ['12', '13'], thinGens: ['14', '15', '16'], bp: 1, thinBp: 0, xp: 0, adv: 0, flaw: 0, hum: 0 },
    neonate: { label: 'Neonate', era: 'Embraced between 1940 and a decade ago', gens: ['12', '13'], bp: 1, xp: 15, adv: 0, flaw: 0, hum: 0 },
    ancilla: { label: 'Ancilla', era: 'Embraced between 1780 and 1940', gens: ['10', '11'], bp: 2, xp: 35, adv: 2, flaw: 2, hum: -1 },
  };
  // Blood Potency table (V5 Corebook p. 216)
  R.BP = [
    { surge: 1, mend: 1, bonus: 0, reroll: 0, bane: 0, feed: 'No effect' },
    { surge: 2, mend: 1, bonus: 0, reroll: 1, bane: 2, feed: 'No effect' },
    { surge: 2, mend: 2, bonus: 1, reroll: 1, bane: 2, feed: 'Animal and bagged blood slakes half Hunger' },
    { surge: 3, mend: 2, bonus: 1, reroll: 2, bane: 3, feed: 'Animal and bagged blood slakes no Hunger' },
    { surge: 3, mend: 3, bonus: 2, reroll: 2, bane: 3, feed: 'Animal and bagged blood slakes no Hunger; slake 1 less from humans' },
    { surge: 4, mend: 3, bonus: 2, reroll: 3, bane: 4, feed: 'Animal and bagged blood slakes no Hunger; slake 1 less from humans' },
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
  R.KINDS = { vampire: 'Vampire', ghoul: 'Ghoul', revenant: 'Revenant' };
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
    if (a.n === 'Vicissitude Alterations') return true;
    const kind = c.kind || 'vampire';
    const mortal = kind === 'ghoul' || kind === 'revenant';
    if (a.ghoul || R.mfCat(a) === 'Ghoul & Revenant' || R.mfCat(a) === 'Magic' || /\((Mortal|Thrall) only\)/i.test(a.n)) return mortal;
    if (/\(Vampire( only)?\)/i.test(a.n)) return !mortal;
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
  R.allPowerIds = (c) => c.powers.concat(c.xp.powers || [], c.xp.ipow || [], c.xp.bpow || []);

  // ------------------------------------------------------------------ defaults
  R.defaultPreset = () => ({
    v: 1, name: '', note: '', disabledClans: [], bannedPowers: [], bannedAdv: [],
    maxDisc: 5, discCaps: {}, ages: ['childe', 'neonate', 'ancilla'], age: 'neonate', xpBonus: 0,
    meritPts: 7, flawPts: 2, bgBonus: 5, allowV20: true, v20Ratio: 1, allowDGR: true,
    baneKinds: ['v5', 'variant', 'v20'], noPredDefault: false, sabbatAdvAnyone: false, settingDA: false, settingLaibon: false, enforceAmalgams: true, thinAllowed: true, locked: false, sabbat: 'allow',
  });
  R.newChar = () => ({
    v: 1, kind: 'vampire', sabbat: false, name: '', player: '', concept: '', chronicle: '', ambition: '', desire: '', sire: '', notes: '',
    appearance: '', history: '',
    clan: null, caste: 0, pickDisc: [],
    attrs: Object.fromEntries(R.ATTR_LIST.map((a) => [a, 1])),
    skillDist: 'balanced', skills: Object.fromEntries(R.SKILL_LIST.map((s) => [s, 0])), specs: [],
    disc: {}, powers: [], school: null, paths: {}, sorc: [],
    predator: D.app && D.app.preset && D.app.preset.noPredDefault ? 'none' : null, pred: { spec: 0, disc: null, choices: {}, spread: {}, notes: {} },
    adv: [], customAdv: [], age: null, gen: null, bane: null, convictions: [{ c: '', t: '' }],
    xp: { attrs: {}, skills: {}, disc: {}, paths: {}, bp: 0, specs: [], powers: [], sorc: [], adv: [], ipow: [], bpow: [] },
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
  R.predDisc = (c) => (c.predator && c.pred.disc) || null;
  R.discBase = (c, k) => (c.disc[k] || 0) + (R.predDisc(c) === k ? 1 : 0) + (R.thinAffinity(c) === k ? 1 : 0);
  R.discTotal = (c, k) => R.discBase(c, k) + (c.xp.disc[k] || 0);
  R.thinAffinity = (c) => {
    const a = c.adv.find((x) => x.id === 'v5-discipline-affinity');
    return a && a.note ? a.note : null;
  };
  R.hasAlchemy = (c) => R.isThin(c) && c.adv.some((x) => x.id === 'v5-thin-blood-alchemist');
  R.activeDiscs = (c) => {
    const keys = new Set(Object.keys(c.disc).filter((k) => c.disc[k] > 0));
    Object.keys(c.xp.disc).forEach((k) => c.xp.disc[k] > 0 && keys.add(k));
    if (R.predDisc(c)) keys.add(R.predDisc(c));
    if (R.thinAffinity(c)) keys.add(R.thinAffinity(c));
    if (R.hasAlchemy(c)) keys.add('alchemy');
    return [...keys];
  };
  R.bp = (c) => {
    if (c.free && c.bpSet != null) return c.bpSet;
    const age = R.AGES[R.ageOf(c)];
    let b = R.isThin(c) ? 0 : (age.bp || 1);
    const p = R.predator(c.predator);
    if (p && p.g.bp) b += p.g.bp;
    return Math.min(10, b + (c.xp.bp || 0));
  };
  R.humanity = (c) => {
    if (c.free && c.hum != null) return c.hum;
    const age = R.AGES[R.ageOf(c)];
    const p = R.predator(c.predator);
    return 7 + (age.hum || 0) + ((p && p.g.hum) || 0);
  };
  R.health = (c) => R.attr(c, 'stamina') + 3;
  R.willpower = (c) => R.attr(c, 'composure') + R.attr(c, 'resolve');
  R.cap = (c, k) => {
    const P = R.preset();
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
    const P = R.preset(); const age = R.AGES[R.ageOf(c)];
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
    const extra = c.moreMerits ? Math.max(0, Math.min(flaw, R.FLAW_CAP) - B.flaw) : 0;
    const meritFromExtra = Math.min(merit, extra);
    const used = merit - meritFromExtra + (bg - bgFromBonus);
    return { B, bg, merit, flaw, bgFromBonus, used, left: B.merit - used, bgLeft: B.bg - bgFromBonus, tbM, tbF,
      extra, extraLeft: extra - meritFromExtra, usedAll: merit + (bg - bgFromBonus), totalAll: B.merit + extra };
  };

  // ------------------------------------------------------------------ XP
  R.XP = {
    attr: (n) => n * 5, skill: (n) => n * 3, spec: () => 3, clanDisc: (n) => n * 5, otherDisc: (n) => n * 7,
    caitiffDisc: (n) => n * 6, ritual: (l) => l * 3, formula: (l) => l * 3, adv: (d) => d * 3, bp: (n) => n * 10,
    path: (n) => n * 5, effect: (l) => l, ingPower: (l) => l * 2,
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
    return (R.AGES[R.ageOf(c)].xp || 0) + (+P.xpBonus || 0);
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

  R.freeSpecAllowance = (c) => R.FREE_SPEC_SKILLS.filter((s) => c.skills[s] > 0).length + 1;
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
    const p = R.predator(c.predator);
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
    const p = R.predator(c.predator); if (!p) return [];
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
    if (!c.clan) E('clan', 'Choose a clan or bloodline.');
    else if (P.disabledClans.includes(c.clan)) E('clan', 'The Storyteller has disabled this clan.');
    else if (!R.clanAvailable(c, R.clan(c.clan))) E('clan', c.sabbat ? 'This clan isn’t available to a Sabbat character.' : 'This clan is only available to Sabbat characters.');
    if (P.sabbat === 'only' && !c.sabbat) E('clan', 'This chronicle is for Sabbat characters only.');
    if (P.sabbat === 'off' && c.sabbat) E('clan', 'This chronicle has no Sabbat characters.');
    // attributes
    const got = R.ATTR_LIST.map((a) => c.attrs[a]).sort((a, b) => b - a);
    if (got.join() !== R.ATTR_SPREAD.join()) E('attributes', 'Attributes must be one at 4, three at 3, four at 2 and one at 1.');
    // skills
    const need = R.SKILL_DISTS[c.skillDist].need;
    const cnt = {};
    R.SKILL_LIST.forEach((s) => { const v = c.skills[s]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
    const bad = [1, 2, 3, 4, 5].filter((l) => (cnt[l] || 0) !== (need[l] || 0));
    if (bad.length) E('skills', `Skills don't match the ${R.SKILL_DISTS[c.skillDist].label} spread yet.`);
    const freeSpecs = c.specs.filter((s) => s.src === 'free');
    const allowed = R.freeSpecAllowance(c);
    R.FREE_SPEC_SKILLS.forEach((s) => {
      if (c.skills[s] > 0 && !c.specs.some((x) => x.skill === s && (x.name || '').trim())) E('skills', `${R.SKILL_NAMES[s]} needs a specialty.`);
    });
    if (freeSpecs.length > allowed) E('skills', `You have ${freeSpecs.length} free specialties; the limit is ${allowed}.`);
    else if (freeSpecs.length < allowed) E('skills', `${allowed - freeSpecs.length} free specialt${allowed - freeSpecs.length === 1 ? 'y' : 'ies'} left to take.`, 'warn');
    c.specs.forEach((s) => { if (!(s.name || '').trim()) E('skills', `Name your ${R.SKILL_NAMES[s.skill]} specialty.`, 'warn'); });
    c.specs.forEach((s) => { if (R.skill(c, s.skill) < 1) E('skills', `Specialty in ${R.SKILL_NAMES[s.skill]} needs at least one dot in it.`); });
    // disciplines
    if (c.clan && !R.isThin(c)) {
      const vals = Object.keys(c.disc).filter((k) => c.disc[k] > 0).map((k) => [k, c.disc[k]]);
      const two = vals.filter((v) => v[1] === 2), one = vals.filter((v) => v[1] === 1);
      if (!(two.length === 1 && one.length === 1 && vals.length === 2)) E('disciplines', 'Put two dots in one Discipline and one dot in another.');
      vals.forEach(([k]) => { if (!R.inClan(c, k)) E('disciplines', `${R.discName(k)} is not one of your clan Disciplines.`); });
    }
    R.activeDiscs(c).forEach((k) => {
      if (R.discTotal(c, k) > R.cap(c, k)) E('disciplines', `${R.discName(k)} is above the Storyteller's limit of ${R.cap(c, k)}.`);
      if (R.isSchool(k)) {
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
    c.powers.forEach((id) => {
      const p = R.power(id); if (!p) return;
      if (P.bannedPowers.includes(id)) E('disciplines', `${p.n} is banned by the Storyteller.`);
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
      if (P.bannedPowers.includes(id)) E('xp', `${p.n} is banned by the Storyteller.`); });
    // predator
    if (!c.predator) E('predator', 'Choose a predator type.');
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
    if (T.left > 0) issues.push({ step: 'merits', tab: 'merit', msg: `${T.left} Advantage point${T.left === 1 ? '' : 's'} left to spend.`, level: 'warn' });
    if (c.moreMerits && T.flaw > R.FLAW_CAP) E('merits', `With extra Merits, Flaws are capped at ${R.FLAW_CAP} points (you have ${T.flaw}).`);
    if (T.extraLeft > 0) issues.push({ step: 'merits', tab: 'merit', msg: `${T.extraLeft} extra Merit point${T.extraLeft === 1 ? '' : 's'} (bought with Flaws) left to spend.`, level: 'warn' });
    if (T.flaw < T.B.flaw) issues.push({ step: 'merits', tab: 'flaw', msg: `Take ${T.B.flaw - T.flaw} more point${T.B.flaw - T.flaw === 1 ? '' : 's'} of Flaws.`, level: 'err' });
    if (R.isThin(c)) {
      if (T.tbF < 1 || T.tbF > 3) E('merits', 'Thin-bloods take one to three Thin-Blood Flaws.');
      if (T.tbM !== T.tbF) E('merits', 'Take as many Thin-Blood Merits as Thin-Blood Flaws.');
    }
    c.adv.forEach((a) => {
      const A = R.adv(a.id); if (!A) return;
      const st = R.isBgEntry(A) ? 'backgrounds' : 'merits';
      if (P.bannedAdv.includes(a.id)) E(st, `${A.n} is banned by the Storyteller.`);
      if (!R.advShown(c, A)) E(st, `${A.n} isn't available to this character.`);
      if (A.notClan && c.clan && A.notClan.includes((R.clan(c.clan) || {}).n)) E(st, `${(R.clan(c.clan) || {}).n} can't take ${A.n}.`);
      if (A.req && /Ancillae/.test(A.req) && R.ageOf(c) !== 'ancilla') E(st, `${A.n}: ${A.req}.`);
    });
    // blood
    if (c.clan && !c.bane) E('blood', 'Choose which bane you carry.', 'warn');
    else if (c.bane && !R.banesFor(c).some((b) => b.id === c.bane)) E('blood', 'Your bane doesn’t match your clan or caste; pick it again.');
    if (!c.convictions.some((x) => x.c.trim())) E('blood', 'Write at least one Conviction and its Touchstone.', 'warn');
    // xp
    const spent = sum(R.xpSpent(c).map((r) => r[1])), total = R.xpTotal(c);
    if (spent > total) E('xp', `You've spent ${spent} XP of ${total}.`);
    else if (spent < total) E('xp', `Spend your experience: ${total - spent} XP left.`, 'warn');
    return issues;
  };
})();
