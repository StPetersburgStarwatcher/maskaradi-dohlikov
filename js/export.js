/* VTM Builder — Foundry VTT (WoD5e system) actor export */
(function () {
  'use strict';
  const D = window.VTMB, R = D.rules;
  const X = (D.exporter = {});
  const SYSTEM_VERSION = '5.3.25', CORE_VERSION = '14.364';

  const rid = () => {
    const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let s = ''; const r = crypto.getRandomValues(new Uint8Array(16));
    for (let i = 0; i < 16; i++) s += a[r[i] % a.length];
    return s;
  };
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const stats = () => ({ coreVersion: CORE_VERSION, systemId: 'wod5e', systemVersion: SYSTEM_VERSION });

  function fromDGR(fid, patch) {
    const src = D.fdocs[fid];
    if (!src) return null;
    const doc = clone(src);
    const uuid = doc._src; delete doc._src;
    doc._id = rid();
    doc.folder = null; doc.sort = 0; doc.ownership = { default: 0 };
    doc.flags = Object.assign({}, doc.flags, { 'vtm-builder': { source: uuid } });
    doc._stats = Object.assign(stats(), { compendiumSource: uuid });
    if (patch) patch(doc);
    return doc;
  }

  // module modifiers marked perDot are written for one dot; scale them to the dots taken
  function scaleBonuses(doc, dots) {
    (doc.system.bonuses || []).forEach((b) => {
      if (!b.perDot) return;
      b.value = Number(b.value) * Math.max(1, dots);
      b.source = String(b.source).replace(/, per dot\)$/, ')');
    });
  }

  function feature(name, kind, points, html, source, extra) {
    return {
      _id: rid(), name, type: 'feature',
      img: kind === 'flaw' ? 'icons/svg/downgrade.svg' : kind === 'background' ? 'icons/svg/book.svg' : 'icons/svg/upgrade.svg',
      system: {
        description: html || '', macroid: '', bonuses: [], dataItemId: '', source: source || { book: '', page: '' },
        uses: { max: 0, current: 0, enabled: false }, points: points || 0, featuretype: kind === 'flaw' ? 'flaw' : kind === 'background' ? 'background' : 'merit',
      },
      effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: { 'vtm-builder': extra || {} }, _stats: stats(),
    };
  }

  function advItem(a) {
    const A = R.adv(a.id);
    if (!A) {
      // predator grant with no matching Advantage entry
      return feature(a.n + (a.note ? ' (' + a.note + ')' : ''), /flaw|enem|adversary/i.test(a.n) ? 'flaw' : 'background', a.dots, '<p>Granted by predator type.</p>');
    }
    const label = A.n + (a.note ? ' (' + a.note + ')' : '');
    const tag = A.ed === 'v20' ? ' [V20]' : '';
    if (A.ed === 'dgr') {
      return fromDGR(A.fid, (doc) => { doc.name = label; doc.system.points = a.dots || doc.system.points; scaleBonuses(doc, a.dots || 0); });
    }
    if (A.id === 'v5-allies' && a.eff != null) {
      const who = a.note ? ' (' + a.note + ')' : '';
      const eff = fromDGR('adv:' + A.id, (doc) => { doc.name = 'Allies: Effectiveness' + who; doc.system.points = a.eff || 0; });
      return [eff || feature('Allies: Effectiveness' + who, 'background', a.eff || 0, A.html, A.src, { id: A.id }),
        fromDGR('adv:' + A.id + '-rel', (doc) => { doc.name = 'Allies: Reliability' + who; doc.system.points = a.rel || 0; })
          || feature('Allies: Reliability' + who, 'background', a.rel || 0, '<p>Reliability of the Ally above.</p>', A.src, { id: A.id + '-rel' })];
    }
    // V5 and V20 entries come from the TokyoStargazer's VTMBuilder module when it has them
    if (D.fdocs['adv:' + A.id]) {
      return fromDGR('adv:' + A.id, (doc) => {
        doc.name = label; doc.system.points = a.dots || doc.system.points; scaleBonuses(doc, a.dots || 0);
        if (a.src === 'pred') doc.system.description = '<p><em>Granted by predator type.</em></p>' + doc.system.description;
      });
    }
    let html = A.html;
    if (A.ed === 'v20') html = '<p><em>V20 Merit/Flaw (' + (a.dots || 0) + ' pt.)</em></p>' + html;
    if (a.src === 'pred') html = '<p><em>Granted by predator type.</em></p>' + html;
    return feature(label + tag, A.kind, a.dots || 0, html, A.src, { id: A.id });
  }

  // Allies and Retainers: who they are, built or left to the Storyteller (built ones also export as their own actors)
  function companions(c) {
    const slots = R.companionSlots(c).map((slot) => [slot, (c.npcs || {})[slot.key]]).filter(([, n]) => n && n.mode);
    if (!slots.length) return '';
    return '<h3>Allies and retainers</h3><ul>' + slots.map(([slot, n]) => `<li>${esc(R.npcSummary(c, slot, n))}</li>`).join('') + '</ul>';
  }

  X.actor = function (c) {
    const mk = R.isMortalKind(c);
    const clan = R.clan(c.clan);
    const items = [];
    // clan (a ghoul's domitor clan only goes in the notes)
    if (clan && !mk) {
      items.push(fromDGR(clan.id, (doc) => {
        const bane = clan.banes.find((b) => b.id === c.bane);
        if (bane) doc.system.bane = '<h3>' + esc(bane.title || bane.label) + '</h3>\n<p><em>' + esc(bane.srcLine || bane.label) + '</em></p>\n' + bane.html;
        if (clan.castes) doc.name = clan.n + ' (' + clan.castes[c.caste || 0].n + ')';
      }));
    }
    // predator
    if (!mk && c.predator && c.predator !== 'none') items.push(fromDGR(c.predator));
    // powers
    const powerIds = R.allPowerIds(c);
    powerIds.forEach((id) => { const d = fromDGR(id); if (d) items.push(d); });
    // sorcery: school intro, path intros (with ratings), rituals & effects
    const sk = mk ? null : R.schoolKey(c);
    let sorcNote = '';
    if (sk) {
      const S = R.school(sk);
      // school and Path entries are level 0 with no Rouse check, so they stay at the top of Blood Sorcery on the sheet
      items.push(fromDGR(S.id, (doc) => { doc.name = S.n + ' ' + '●'.repeat(R.discTotal(c, sk)); doc.system.level = 0; doc.system.cost = 0; }));
      const lines = [];
      Object.keys(Object.assign({}, c.paths, c.xp.paths)).forEach((p) => {
        const n = R.pathDots(c, p); if (!n) return;
        const P = R.path(p);
        lines.push(`${P.n} ${'●'.repeat(n)}`);
        if (P.intro) items.push(fromDGR(P.intro, (doc) => { doc.name = P.n + ' (Path) ' + '●'.repeat(n); doc.system.level = 0; doc.system.cost = 0; }));
      });
      sorcNote = `<p><strong>${esc(S.n)} ${R.discTotal(c, sk)}</strong></p><p>Paths: ${lines.map(esc).join(', ')}</p>` + (S.cast ? `<p>Casting pool: ${esc(S.cast)}</p>` : '');
      c.sorc.concat(c.xp.sorc || []).forEach((id) => { const d = fromDGR(id); if (d) items.push(d); });
    }
    // advantages (chosen + predator)
    c.adv.forEach((a) => { const it = advItem(a); if (it) items.push(...[].concat(it)); });
    R.predGrants(c).forEach((a) => { const it = advItem(a); if (it) items.push(it); });

    // ---------------- system data
    const attributes = {};
    R.ATTR_LIST.forEach((a) => (attributes[a] = { value: R.attr(c, a), active: false, bonuses: [] }));
    const skills = {};
    R.SKILL_LIST.forEach((s) => (skills[s] = { value: R.skill(c, s), active: false, description: '', macroid: '', bonuses: [] }));
    R.allSpecs(c).forEach((sp) => {
      if (!sp.skill || !skills[sp.skill]) return;
      skills[sp.skill].bonuses.push({ source: sp.name || 'Specialty', value: 1, paths: ['skills.' + sp.skill], displayWhenInactive: true, activeWhen: { check: 'never' } });
    });
    const disciplines = {};
    R.activeDiscs(c).forEach((k) => {
      const key = R.isSchool(k) ? 'sorcery' : k;
      const desc = R.isSchool(k) ? sorcNote : '';
      disciplines[key] = { value: R.discTotal(c, k), visible: true, powers: [], description: desc, selected: false };
    });
    if (sk && c.sorc.concat(c.xp.sorc || []).some((id) => (R.power(id) || {}).d === 'rituals'))
      disciplines.rituals = { value: 0, visible: true, powers: [], description: '', selected: false };

    const age = R.AGES[R.ageOf(c)];
    const gen = mk ? '' : c.gen || (R.isThin(c) ? age.thinGens || age.gens : age.gens)[age.gens.length - 1];
    const hum = R.humanity(c);
    const touch = c.convictions.filter((x) => x.c || x.t)
      .map((x) => `<p><strong>${esc(x.c)}</strong>${x.t ? ' — ' + esc(x.t) : ''}</p>`).join('');
    const spentRows = R.xpSpent(c);
    const spent = spentRows.reduce((a, r) => a + r[1], 0);
    const total = R.xpTotal(c);
    // the XP ledger, in wod5e's own format: gains are positive, spending is negative, oldest first.
    // Legacy exp stays at 0/0 so the sheet only shows the calculated totals.
    const t0 = Date.now() - spentRows.length - 1;
    const experiences = [];
    if (total) experiences.push({ id: rid(), name: 'Starting experience', value: total, timestamp: t0 });
    spentRows.forEach((r, i) => experiences.push({ id: rid(), name: r[0], value: -Math.abs(r[1]), timestamp: t0 + i + 1 }));
    const bio = [c.history ? `<p>${esc(c.history).replace(/\n/g, '</p><p>')}</p>` : ''].join('');
    const notes = [
      c.notes ? `<p>${esc(c.notes).replace(/\n/g, '</p><p>')}</p>` : '',
      !mk && clan && clan.castes ? `<p>Caste: ${esc(clan.castes[c.caste || 0].n)}</p>` : '',
      mk && R.tmpl(c).attrs ? `<p>Built with the ${esc(R.tmpl(c).label)} template (V5 Corebook p. 184).</p>` : '',
      R.isGhoul(c) && clan ? `<p>Domitor’s clan: ${esc(clan.dn)}</p>` : '',
      companions(c),
    ].join('');

    const system = {
      locked: false, group: '', hasSkillAttributeData: true,
      bio: { age: { trueage: '', apparent: '' }, dateof: { birth: '', death: '' }, history: bio },
      headers: {
        concept: c.concept, chronicle: c.chronicle || R.preset().name || '', ambition: c.ambition, desire: c.desire,
        touchstones: touch, tenets: '', sire: mk ? '' : c.sire, generation: gen, domitor: R.isGhoul(c) ? c.sire : '', creedfields: '', cellname: '',
      },
      experiences, exp: { value: 0, max: 0 }, derivedXP: { totalXP: total, remainingXP: total - spent },
      health: { aggravated: 0, superficial: 0, max: R.health(c), value: R.health(c) },
      willpower: { aggravated: 0, superficial: 0, max: R.willpower(c), value: R.willpower(c) },
      attributes, skills,
      settings: { headerbg: '', background: '', limited: { biography: true, appearance: true, touchstones: false, tenets: false }, skillAttributeInputs: false, enableGifts: false, enableDisciplines: false, enableEdges: false, generalDifficultyEnabled: true },
      description: '', notes, privatenotes: '', biography: bio, appearance: c.appearance ? `<p>${esc(c.appearance)}</p>` : '', equipment: '',
      bonuses: {},
      hunger: { value: mk ? 0 : 1, max: 5 },
      humanity: { value: hum, stains: 0 },
      blood: { potency: R.bp(c), generation: gen },
      selectedDiscipline: '', selectedDisciplinePower: '',
      disciplines,
    };
    const name = c.name || (mk ? 'Unnamed ' + R.KINDS[c.kind] : 'Unnamed Kindred');
    return {
      name, type: mk ? c.kind : 'vampire', img: 'icons/svg/mystery-man.svg', system,
      prototypeToken: { name, actorLink: true, disposition: 1, displayName: 20, displayBars: 20, bar1: { attribute: 'health' }, bar2: { attribute: 'willpower' }, texture: { src: 'icons/svg/mystery-man.svg' } },
      items: items.filter(Boolean), effects: [], folder: null, sort: 0, ownership: { default: 0 },
      flags: { 'vtm-builder': { version: 1, character: c, preset: R.preset() } },
      _stats: Object.assign(stats(), { exportSource: { worldId: null, uuid: null, coreVersion: CORE_VERSION, systemId: 'wod5e', systemVersion: SYSTEM_VERSION } }),
    };
  };

  X.download = function (filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  X.filename = (c, suffix) => ((c.name || 'kindred').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'kindred') + suffix;
})();
