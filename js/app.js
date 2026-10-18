/* VTM Builder — interface */
(function () {
  'use strict';
  const D = window.VTMB;
  const app = (D.app = D.app || {});
  const R = D.rules, X = D.exporter, PR = D.presets;
  const core = D.core;

  // ------------------------------------------------------------------ state
  const LS_CHAR = 'vtmb.character.v1', LS_PRESET = 'vtmb.preset.v1', LS_UI = 'vtmb.ui.v1';
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  app.preset = PR.normalize(load(LS_PRESET));
  let C = Object.assign(R.newChar(), load(LS_CHAR) || {});
  C.xp = Object.assign(R.newChar().xp, C.xp || {});
  C.pred = Object.assign(R.newChar().pred, C.pred || {});
  const ui = Object.assign({ step: 'concept', mfTab: 'merit', q: {}, open: {}, stTab: 'rules', xpAdv: false }, load(LS_UI) || {});
  ui.mode = 'build';
  if (ui.step === 'advantages') ui.step = 'backgrounds';
  app.char = () => C;

  const STEPS = [
    ['concept', 'Concept'], ['clan', 'Clan'], ['attributes', 'Attributes'], ['skills', 'Skills'], ['disciplines', 'Disciplines'],
    ['predator', 'Predator type'], ['backgrounds', 'Backgrounds'], ['merits', 'Merits & Flaws'], ['blood', 'Blood & bane'], ['xp', 'Experience'], ['review', 'Review & export'],
  ];

  // ------------------------------------------------------------------ helpers
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = (s, r) => (r || document).querySelector(s);
  const dots = (n, max, opts) => {
    opts = opts || {};
    let s = `<span class="dots${opts.cls ? ' ' + opts.cls : ''}" role="group" aria-label="${esc(opts.label || '')}">`;
    for (let i = 1; i <= max; i++) {
      const cls = i <= (opts.base ?? n) ? 'on' : i <= n ? 'on xp' : opts.lock && i > opts.lock ? 'off locked' : 'off';
      if (opts.act) s += `<button type="button" class="dot ${cls}" data-act="${opts.act}" data-k="${esc(opts.k)}" data-v="${i}" aria-label="${esc(opts.label || '')} ${i}" ${opts.disabled ? 'disabled' : ''}></button>`;
      else s += `<span class="dot ${cls}"></span>`;
    }
    return s + '</span>';
  };
  const pips = (n) => '•'.repeat(Math.max(0, n));
  const srcLine = (s) => (s && s.book ? `${esc(s.book)}${s.page ? ', p. ' + esc(s.page) : ''}` : '');
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + 's'}`;
  const LORE = D.lore;
  const PT = (p) => (D.powerText || {})[p.id] || p.sum || '';
  const iconSrc = (img) => (img ? 'assets/icons/' + img.split('/').pop() : '');
  const logoSrc = (cl) => (C.sabbat ? 'assets/logos-filled/' : 'assets/logos/') + cl.logo;
  const clanArt = (cl) => (cl.art ? 'assets/art/' + cl.art : logoSrc(cl));

  function save() { store(LS_CHAR, C); store(LS_UI, { step: ui.step, mfTab: ui.mfTab, stTab: ui.stTab }); }

  // ------------------------------------------------------------------ reader drawer (full descriptions)
  function readPower(id) {
    const p = R.power(id); const doc = D.fdocs[id];
    if (!p || !doc) return;
    const meta = [];
    if (p.lv) meta.push(`${R.discName(p.d === 'rituals' || p.d === 'sorcery' ? 'path:' + p.path : p.d)} ${pips(p.lv)}`);
    openReader(p.n, meta.join(''), doc.system.description, p.src);
  }
  function readAdv(id) {
    const A = R.adv(id); if (!A) return;
    const ed = { v5: 'V5', v20: 'V20', dgr: 'Dark Gifts', custom: 'Custom' }[A.ed];
    const kind = { merit: 'Merit', flaw: 'Flaw', background: 'Background' }[A.kind] || A.kind;
    const d = A.dots && A.dots[0] ? A.dots.map(pips).join(' / ') : 'no dot value';
    openReader(A.n, `${ed} ${kind}${A.cat ? ', ' + esc(A.cat) : ''} · ${d}${A.req ? '<br>' + esc(A.req) : ''}`, A.html, A.src);
  }
  function openReader(title, meta, html, src) {
    const el = $('#reader');
    el.innerHTML = `<div class="reader-head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="closeReader" aria-label="Close">✕</button></div>
      <p class="reader-meta">${meta || ''}</p><div class="reader-body prose">${html || ''}</div>
      ${src && src.book ? `<p class="reader-src">${srcLine(src)}</p>` : ''}`;
    document.body.classList.add('reading');
    el.scrollTop = 0;
    el.querySelector('button').focus();
  }
  function closeReader() { document.body.classList.remove('reading'); }

  // ------------------------------------------------------------------ shell
  function renderShell() {
    const P = app.preset;
    $('#chronicle').innerHTML = P.name ? `<span class="chron-label">Chronicle</span> ${esc(P.name)}` : '<span class="chron-label">No chronicle rules loaded</span>';
    document.body.dataset.mode = ui.mode;
    document.body.classList.toggle('sabbat', !!C.sabbat);
    document.body.classList.toggle('free', !!C.free);
    const fb = $('.free-btn'); if (fb) { fb.textContent = C.free ? 'Free edit: on' : 'Free edit'; fb.setAttribute('aria-pressed', String(!!C.free)); }
  }
  function renderNav() {
    const issues = R.validate(C);
    $('#steps').innerHTML = STEPS.map(([k, label], i) => {
      const iss = issues.filter((x) => x.step === k);
      const st = iss.some((x) => x.level === 'err') ? 'err' : iss.length ? 'warn' : 'ok';
      return `<li><button class="step ${ui.step === k ? 'cur' : ''} st-${st}" data-act="go" data-k="${k}" ${ui.step === k ? 'aria-current="step"' : ''}>
        <span class="num">${i + 1}</span><span class="lbl">${label}</span><span class="mark" aria-hidden="true"></span></button></li>`;
    }).join('');
  }
  function renderSummary() {
    const cl = R.clan(C.clan);
    const issues = R.validate(C);
    const T = R.advTally(C);
    const spent = sum(R.xpSpent(C).map((r) => r[1])), total = R.xpTotal(C);
    const discs = R.activeDiscs(C).map((k) => `<li><span>${esc(R.discName(k))}</span>${dots(R.discTotal(C, k), 5, { base: R.discBase(C, k) })}</li>`).join('');
    $('#summary').innerHTML = `
      <div class="sum-id">
        ${cl ? `<img class="sum-art ${cl.art ? 'art' : 'logo'}" src="${clanArt(cl)}" alt="">` : ''}
        <div><p class="sum-name">${esc(C.name || 'Unnamed')}</p>
        <p class="sum-sub">${cl ? esc(cl.dn) + (cl.castes ? ', ' + esc(casteName(R.casteOf(C))) : '') : 'No clan yet'}${C.sabbat ? ' · Sabbat' : ''}${C.predator ? ' · ' + esc(R.predName(C)) : ''}</p></div>
      </div>
      <dl class="sum-stats">
        <div><dt>Health</dt><dd>${R.health(C)}</dd></div><div><dt>Willpower</dt><dd>${R.willpower(C)}</dd></div>
        <div><dt>Humanity</dt><dd>${R.humanity(C)}</dd></div><div><dt>Blood Potency</dt><dd>${R.bp(C)}</dd></div>
      </dl>
      <div class="sum-block"><h3>Budget</h3>
        <ul class="budget">
          <li class="${T.left < 0 ? 'over' : ''}"><span>Advantage points</span><b>${T.used} / ${T.B.merit}</b></li>
          ${C.moreMerits ? `<li><span>Extra Merit points</span><b>${T.extra - T.extraLeft} / ${T.extra}</b></li>` : ''}
          <li><span>Free Background points</span><b>${T.bgFromBonus} / ${T.B.bg}</b></li>
          <li class="${T.flaw < T.B.flaw ? 'under' : ''}"><span>Flaw points</span><b>${T.flaw} / ${T.B.flaw}${C.moreMerits ? `–${R.FLAW_CAP}` : ''}</b></li>
          ${total && !C.free ? `<li class="${spent > total ? 'over' : ''}"><span>Experience</span><b>${spent} / ${total}</b></li>` : ''}
        </ul></div>
      ${discs ? `<div class="sum-block"><h3>Disciplines</h3><ul class="sum-discs">${discs}</ul></div>` : ''}
      ${C.free ? '<div class="sum-block"><h3>Free Edit</h3><p class="fine">Creation rules are off, so nothing is checked. Switch back to regular creation to see what’s left to do.</p></div>' : ''}
      <div class="sum-block" ${C.free ? 'hidden' : ''}><h3>${issues.length ? 'Still to do' : 'Ready to export'}</h3>
        ${issues.length ? `<ul class="issues">${issues.slice(0, 14).map((x) => `<li class="${x.level}"><button data-act="go" data-k="${x.step}"${x.tab ? ` data-tab="${x.tab}"` : ''}${x.anchor ? ` data-anchor="${x.anchor}"` : ''}>${esc(x.msg)}</button></li>`).join('')}${issues.length > 14 ? `<li class="more">and ${issues.length - 14} more</li>` : ''}</ul>`
        : '<p class="fine">Everything checks out. Head to Review &amp; export to download the Foundry file.</p>'}
      </div>`;
  }

  // ------------------------------------------------------------------ steps
  const S = {};

  S.concept = () => {
    const P = app.preset;
    const age = R.ageOf(C);
    const A = R.AGES[age];
    const gens = R.isThin(C) ? A.thinGens || A.gens : A.gens;
    const field = (k, label, ph, wide) => `<label class="fld${wide ? ' wide' : ''}"><span>${label}</span><input data-bind="${k}" value="${esc(C[k])}" placeholder="${esc(ph || '')}"></label>`;
    return `<header class="page-head"><h1>Who were they, and what are they now?</h1>
      <p class="lede">Start with the person. The numbers come later and should serve the story you write here.</p></header>
      <div class="grid2">
        ${field('name', 'Name', 'The name they go by now')}${field('player', 'Player')}
        ${field('concept', 'Concept', 'Disgraced paramedic, art-forger, union organizer…', true)}
        ${field('chronicle', 'Chronicle', P.name || '')}${field('sire', 'Sire')}
        ${field('ambition', 'Ambition', 'A long-term goal')}${field('desire', 'Desire', 'What they want tonight')}
      </div>
      <h2>What are you?</h2>
      <div class="cards3">${[['vampire', 'Vampire', 'One of the Kindred. Everything in this builder is made for you.'], ['ghoul', 'Ghoul', 'A mortal fed on vampire Blood and bound to a domitor.'], ['revenant', 'Revenant', 'Born into a family that carries vampire Blood in its veins.']].map(([k, l, t]) => `<button class="choice ${(C.kind || 'vampire') === k ? 'sel' : ''}" data-act="setKind" data-k="${k}"><strong>${l}</strong><span class="small">${t}</span></button>`).join('')}</div>
      ${C.kind && C.kind !== 'vampire' ? '<p class="note">Ghoul and revenant creation isn’t in the builder yet. For now this only opens up their Merits and Flaws; the rest of the steps still build a vampire.</p>' : ''}
      <h2>Sea of time</h2>
      <p class="hint">How long ago were they Embraced? This sets Generation, Blood Potency and starting experience${P.locked ? '; the Storyteller has limited the choices.' : '.'}</p>
      <div class="cards3">${Object.keys(R.AGES).map((k) => {
        const a = R.AGES[k], allowed = P.ages.includes(k);
        return `<button class="choice ${age === k ? 'sel' : ''}" data-act="setAge" data-k="${k}" ${allowed ? '' : 'disabled'}>
          <strong>${a.label}</strong><span>${a.era}</span>
          <span class="small">Generation ${a.gens.join(' or ')} · Blood Potency ${a.bp} · ${a.xp ? a.xp + ' XP' : 'no XP'}${a.adv ? ' · +2 Advantages, +2 Flaws, −1 Humanity' : ''}</span>
          ${allowed ? '' : '<span class="small muted">Not used in this chronicle</span>'}</button>`;
      }).join('')}</div>
      <label class="fld narrow"><span>Generation</span><select data-bind="gen">${gens.map((g) => `<option value="${g}" ${C.gen === g ? 'selected' : ''}>${g}th</option>`).join('')}</select></label>
      <h2>Appearance and history</h2>
      <label class="fld wide"><span>Appearance</span><textarea data-bind="appearance" rows="3">${esc(C.appearance)}</textarea></label>
      <label class="fld wide"><span>History</span><textarea data-bind="history" rows="6">${esc(C.history)}</textarea></label>`;
  };

  // --- clan
  const casteName = (ca) => ca.n.replace(/ Caste$/, '');
  function clanDiscLine(cl) {
    if (cl.caitiff) return 'Any two of your choice';
    if (cl.thin) return 'None. Thin-Blood Alchemy through the Thin-Blood Alchemist Merit';
    const ks = R.clanDisc(C).map(R.discName);
    return ks.join(', ') + (cl.pick ? (ks.length > 1 ? '' : `, plus ${cl.pick} of your choice`) : '');
  }
  function cardDiscs(cl) {
    if (cl.caitiff) return [];
    if (cl.thin) return ['Thin-Blood Alchemy'];
    const ks = cl.castes ? cl.castes[0].disc : cl.disc || [];
    return ks.map(R.discName).concat(cl.pick ? ['+' + cl.pick + ' of choice'] : []);
  }
  function clanCard(cl) {
    const off = app.preset.disabledClans.includes(cl.id);
    const sel = C.clan === cl.id;
    const lines = cl.castes ? `${cl.castes.length} ${(D.lore.clans[cl.n] || {}).castes ? 'castes' : 'lines'}` : '';
    return `<button class="ccard ${sel ? 'sel' : ''}" data-act="setClan" data-k="${cl.id}" aria-pressed="${sel}" ${off ? 'disabled' : ''}>
      <img class="ccard-logo" src="${logoSrc(cl)}" alt="" loading="lazy">
      <span class="ccard-name">${esc(cl.dn)}</span>
      <span class="ccard-hook">${esc(cl.hook)}</span>
      <span class="ccard-discs">${cardDiscs(cl).map((d) => `<span>${esc(d)}</span>`).join('')}</span>
      ${lines ? `<span class="ccard-castes">${lines}</span>` : ''}${off ? '<span class="ccard-off">Not in this chronicle</span>' : ''}</button>`;
  }
  function clanDetail(cl) {
    const ca = R.casteOf(C);
    const art = (ca && ca.art) || cl.art;
    const word = (D.lore.clans[cl.n] || {}).castes ? 'Caste' : 'Line';
    const castes = cl.castes ? `<div class="castes"><span class="castes-label">${word}</span><div role="radiogroup" aria-label="${word}">${cl.castes.map((x, i) => `<button class="chip ${(C.caste || 0) === i ? 'sel' : ''}" data-act="setCaste" data-v="${i}" role="radio" aria-checked="${(C.caste || 0) === i}">${esc(casteName(x))}</button>`).join('')}</div></div>` : '';
    let discBlock;
    if (cl.caitiff) discBlock = '<p class="hint">No clan Disciplines. Pick any two at creation; every Discipline costs ×6 experience.</p>';
    else if (cl.thin) discBlock = '<p class="hint">No clan Disciplines. Take the Thin-Blood Alchemist Merit for Thin-Blood Alchemy, or Discipline Affinity for one Discipline.</p>';
    else discBlock = `<ul class="disc-chips">${R.clanDisc(C).map((k) => { const d = R.disc(k) || {}; const sc = R.school(k); return `<li><img src="assets/icons/${esc(sc ? sc.icon : d.icon)}" alt=""><span>${esc(R.discName(k))}</span></li>`; }).join('')}</ul>`;
    const pick = cl.pick ? `<p class="hint">Choose ${cl.pick} more:</p><div class="pickdisc">${[0, 1].slice(0, cl.pick).map((i) => `<select data-act-change="pickDisc" data-k="${i}" aria-label="Discipline ${i + 1}"><option value="">—</option>${R.allDiscKeys().filter((k) => k !== 'bardo').map((k) => `<option value="${k}" ${C.pickDisc[i] === k ? 'selected' : ''}>${esc(R.discName(k))}</option>`).join('')}</select>`).join('')}</div>` : '';
    const nb = R.banesFor(C).filter((b) => app.preset.baneKinds.includes(b.kind)).length;
    return `<article class="clan-detail" id="clan-detail">
      ${clanFigure(cl, art)}
      <div class="clan-text">
        <h1 class="clan-name">${esc(cl.dn)}</h1>
        ${cl.nick ? `<p class="clan-nick">${esc(cl.nick)}</p>` : ''}
        ${castes}
        <p class="clan-flavor">${esc(cl.flavor)}</p>
        ${ca && ca.flavor ? `<p class="clan-flavor"><strong>${esc(casteName(ca))}.</strong> ${esc(ca.flavor)}</p>` : ''}
        <h2 class="clan-h">How they play</h2>
        ${discBlock}${pick}
        <p class="clan-play">${esc((ca && ca.play) || cl.play)}</p>
        ${cl.note ? `<p class="note">${esc(cl.note)}</p>` : ''}
        <p class="clan-more"><button class="link" data-act="readClan">Read the full write-up</button> <span class="small muted">${srcLine((ca && ca.src) || cl.src)}</span></p>
        <p class="small muted">${plural(nb, 'bane')} to choose from in Blood &amp; bane.</p>
      </div></article>`;
  }
  // Clan portrait with a gallery from every edition: the Revised art first, then the rest
  function clanFrames(cl, art) {
    const f = art ? [{ src: 'assets/art/' + art, cap: cl.artSrc || '' }] : [];
    ((D.gallery || {})[cl.n] || []).forEach((g) => f.push({ src: g.a ? 'assets/' + g.a : 'assets/gallery/' + g.f, cap: g.par ? `${g.par}${g.src ? ' · ' + g.src : ''}` : g.src }));
    return f;
  }
  function clanFigure(cl, art) {
    const fr = clanFrames(cl, art);
    if (!fr.length) return `<figure class="clan-art logo"><img src="${logoSrc(cl)}" alt="${esc(cl.dn)}"></figure>`;
    const i = ((ui.gal || {})[cl.n] || 0) % fr.length; const cur = fr[i];
    const nav = fr.length > 1 ? `<button class="gal-btn prev" data-act="galStep" data-k="${esc(cl.n)}" data-v="-1" aria-label="Previous picture">‹</button><button class="gal-btn next" data-act="galStep" data-k="${esc(cl.n)}" data-v="1" aria-label="Next picture">›</button>` : '';
    return `<figure class="clan-art art gallery"><div class="gal-frame"><button class="gal-zoom" data-act="galZoom" data-k="${esc(cl.n)}" title="Enlarge"><img src="${esc(cur.src)}" alt="${esc(cl.dn)}, picture ${i + 1} of ${fr.length}"></button>${nav}</div>
      <figcaption><em>${esc(cur.cap)}</em>${fr.length > 1 ? ` <span class="gal-count">${i + 1} / ${fr.length}</span>` : ''}</figcaption></figure>`;
  }
  S.clan = () => {
    const P = app.preset;
    const cl = R.clan(C.clan);
    const toggle = P.sabbat === 'off' ? '' : `<label class="sect-switch"><input type="checkbox" role="switch" data-act-change="toggleSabbat" ${C.sabbat ? 'checked' : ''} ${P.sabbat === 'only' ? 'disabled' : ''}>
      <span class="sw" aria-hidden="true"></span><span class="sw-text"><strong>I am Sabbat</strong><span>${P.sabbat === 'only' ? 'This is a Sabbat chronicle.' : 'Swap the clans for their Sabbat lines: antitribu, the Lasombra and the Tzimisce.'}</span></span></label>`;
    const secs = R.clanSections(C).map((s) => {
      const list = s.clans.filter((c) => !c.thin || P.thinAllowed);
      if (!list.length) return '';
      return `<section class="cgroup g-${s.id} ${s.main ? 'main' : 'lines'}"><h2 class="cgroup-h"><span>${esc(s.n)}</span></h2><div class="cgrid">${list.map(clanCard).join('')}</div></section>`;
    }).join('');
    return `<header class="page-head clan-head"><h1>Choose your ${C.sabbat ? 'Sabbat clan' : 'clan'}</h1>
      <p class="lede">Your clan is your lineage, your powers and your curse. Disciplines follow Dark Gifts; the write-ups come from V20.</p>${toggle}</header>
      ${cl && R.clanAvailable(C, cl) ? clanDetail(cl) : ''}
      <div class="clan-picker">${secs}</div>`;
  };

  S.attributes = () => {
    const counts = {}; R.ATTR_LIST.forEach((a) => (counts[C.attrs[a]] = (counts[C.attrs[a]] || 0) + 1));
    const need = { 4: 1, 3: 3, 2: 4, 1: 1 };
    const tally = [4, 3, 2, 1].map((v) => `<li class="${(counts[v] || 0) === need[v] ? 'ok' : (counts[v] || 0) > need[v] ? 'over' : ''}"><b>${dots(v, v)}</b><span>${counts[v] || 0} of ${need[v]}</span></li>`).join('');
    const col = (grp, label) => `<section class="trait-col"><h2>${label}</h2>${R.ATTRS[grp].map((a) =>
      `<div class="trait-row"><span class="tname" data-trait="attr:${a}" tabindex="0">${R.ATTR_NAMES[a]}</span>${dots(R.attr(C, a), 5, { act: 'setAttr', k: a, base: C.attrs[a], label: R.ATTR_NAMES[a], lock: 4 })}</div>`).join('')}</section>`;
    // Health and Willpower as they appear on the sheet: one box per point
    const track = (label, n, how) => `<div class="tracker"><span class="tr-name">${label}</span><span class="tr-boxes" aria-label="${label} ${n}">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span class="tr-how">${n} = ${how}</span></div>`;
    return `<header class="page-head"><h1>Attributes</h1><p class="lede">One at 4, three at 3, four at 2, one at 1. Click a dot to set the rating.</p></header>
      <ul class="spread">${tally}</ul>
      <div class="cols3">${col('physical', 'Physical')}${col('social', 'Social')}${col('mental', 'Mental')}</div>
      <div class="trackers">${track('Health', R.health(C), `Stamina ${R.attr(C, 'stamina')} + 3`)}${track('Willpower', R.willpower(C), `Composure ${R.attr(C, 'composure')} + Resolve ${R.attr(C, 'resolve')}`)}</div>
      <p class="hint">Hover over an Attribute for what each dot means.</p>`;
  };

  S.skills = () => {
    const dist = R.SKILL_DISTS[C.skillDist];
    const counts = {}; R.SKILL_LIST.forEach((s) => { const v = C.skills[s]; if (v) counts[v] = (counts[v] || 0) + 1; });
    const lv = Object.keys(dist.need).map(Number).sort((a, b) => b - a);
    const tally = lv.map((v) => `<li class="${(counts[v] || 0) === dist.need[v] ? 'ok' : (counts[v] || 0) > dist.need[v] ? 'over' : ''}"><b>${dots(v, v)}</b><span>${counts[v] || 0} of ${dist.need[v]}</span></li>`).join('');
    const maxLv = lv[0];
    const specCount = (s) => R.allSpecs(C).filter((x) => x.skill === s).length;
    const col = (grp, label) => `<section class="trait-col"><h2>${label}</h2>${R.SKILLS[grp].map((s) =>
      `<div class="trait-row"><span class="tname" data-trait="skill:${s}" tabindex="0">${R.SKILL_NAMES[s]}${R.FREE_SPEC_SKILLS.includes(s) ? '<sup title="Needs a specialty if rated">✦</sup>' : ''}${specCount(s) ? `<em class="spec-badge">${specCount(s)} spec.</em>` : ''}</span>
      ${dots(R.skill(C, s), 5, { act: 'setSkill', k: s, base: C.skills[s], label: R.SKILL_NAMES[s], lock: maxLv })}</div>`).join('')}</section>`;
    const allow = R.freeSpecAllowance(C);
    const free = C.specs.filter((x) => x.src === 'free');
    const predSpec = R.allSpecs(C).filter((x) => x.src === 'pred');
    const rated = R.SKILL_LIST.filter((s) => R.skill(C, s) > 0);
    return `<header class="page-head"><h1>Skills</h1><p class="lede">Pick a spread, then place the dots. Academics, Craft, Performance and Science each need a specialty once rated.</p></header>
      <div class="cards3">${Object.keys(R.SKILL_DISTS).map((k) => {
        const d = R.SKILL_DISTS[k];
        return `<button class="choice ${C.skillDist === k ? 'sel' : ''}" data-act="setDist" data-k="${k}"><strong>${d.label}</strong>
          <span class="small">${Object.keys(d.need).sort((a, b) => b - a).map((v) => `${d.need[v]} at ${v}`).join(', ')}</span></button>`;
      }).join('')}</div>
      <ul class="spread">${tally}</ul>
      <div class="cols3">${col('physical', 'Physical')}${col('social', 'Social')}${col('mental', 'Mental')}</div>
      <section class="specs"><h2>Specialties</h2>
        <p class="hint">${free.length} of ${allow} free specialties taken (one per rated Academics, Craft, Performance and Science, plus one of your choice).</p>
        <ul class="spec-list">${C.specs.map((sp, i) => `<li><select data-act-change="specSkill" data-k="${i}">${rated.concat(rated.includes(sp.skill) ? [] : [sp.skill]).map((s) => `<option value="${s}" ${sp.skill === s ? 'selected' : ''}>${R.SKILL_NAMES[s]}</option>`).join('')}</select>
          <input data-bind-spec="${i}" value="${esc(sp.name)}" placeholder="Specialty"><button class="icon-btn" data-act="delSpec" data-k="${i}" aria-label="Remove">✕</button></li>`).join('')}
          ${predSpec.map((sp) => `<li class="fixed"><span>${R.SKILL_NAMES[sp.skill]}</span><span>${esc(sp.name)}</span><span class="small muted">from predator type</span></li>`).join('')}
        </ul>
        ${rated.length ? `<button class="btn" data-act="addSpec">Add a specialty</button>` : '<p class="hint">Rate a Skill first.</p>'}
      </section>`;
  };

  // --- disciplines
  // one dot bar per Discipline; on clan Disciplines, clicking it places your creation dots
  function discDots(k, name, inClan) {
    const total = R.discTotal(C, k), base = R.discBase(C, k), own = C.disc[k] || 0;
    const canSet = C.free || (inClan && !R.isThin(C) && k !== 'alchemy');
    const extra = total - own;
    return dots(total, 5, canSet ? { act: 'setDiscTotal', k, base, label: name, lock: C.free ? R.cap(C, k) : extra + 2 } : { base, label: name });
  }
  function powerRow(p, k, slots) {
    const ing = (C.xp.ipow || []).includes(p.id), bpx = (C.xp.bpow || []).includes(p.id);
    const chosen = C.powers.includes(p.id) || (C.xp.powers || []).includes(p.id) || ing || bpx;
    const P = app.preset;
    const banned = P.bannedPowers.includes(p.id);
    const tooHigh = p.lv > R.effRating(C, k);
    const amOk = !p.amr || R.meetsReq(C, p.amr);
    const preOk = R.prereqMet(C, p);
    const full = !C.free && !chosen && R.chosenPowers(C, k).length >= slots && k !== 'alchemy';
    const dis = (banned && !C.free) || (!chosen && (tooHigh || full || (P.enforceAmalgams && !amOk && !C.free)));
    const cut = (t) => (t.length > 70 ? t.slice(0, 68).replace(/\s+\S*$/, '') + '…' : t);
    const meta = [p.cost && `<span><b>Cost</b> ${esc(cut(p.cost))}</span>`, p.pool && p.pool !== 'N/A' && `<span><b>Pool</b> ${esc(cut(p.pool))}</span>`, p.dur && `<span><b>Duration</b> ${esc(cut(p.dur))}</span>`].filter(Boolean).join('');
    return `<li class="pw ${chosen ? 'sel' : ''} ${dis ? 'dis' : ''}">
      <label><input type="checkbox" data-act-change="togglePower" data-k="${p.id}" ${chosen ? 'checked' : ''} ${dis && !chosen ? 'disabled' : ''}>
      <span class="pw-name">${esc(p.n)}</span></label>
      ${p.am ? `<span class="tag ${amOk ? '' : 'bad'}" title="Amalgam">Amalgam: ${esc(p.am)}</span>` : ''}${p.pre ? `<span class="tag ${preOk ? '' : 'warn'}">Requires ${esc(p.pre)}</span>` : ''}${banned ? '<span class="tag bad">Banned</span>' : ''}${ing ? '<span class="tag xp" title="Bought with XP through an Ingrained Discipline Flaw">Ingrained</span>' : ''}${bpx ? '<span class="tag xp" title="Bought with XP through your Blood Potency">Blood Potency</span>' : ''}
      <p class="pw-sum">${esc(PT(p))}</p>${meta ? `<p class="pw-meta">${meta}</p>` : ''}
      <button class="link" data-act="readPower" data-k="${p.id}">Full text</button></li>`;
  }
  // on the Experience page the dots buy with XP and show what the next one costs
  const xpDots = (k, name, total, base) => `${dots(total, 5, { act: 'xpSet', k: 'disc|' + k, base, label: name, lock: R.cap(C, k) })}<span class="xp-next">${total < R.cap(C, k) ? `next dot <b>${R.discXPCost(C, k, total + 1)}</b> XP` : 'max'}</span>`;
  function discBlock(k, xp) {
    const d = R.disc(k) || {};
    const total = R.discTotal(C, k), base = R.discBase(C, k), own = C.disc[k] || 0;
    const slots = R.powerSlots(C, k);
    const chosen = R.chosenPowers(C, k).length;
    const isOpen = ui.open[k] ?? true;
    const inClan = R.inClan(C, k) || R.isThin(C);
    const notes = [R.predDisc(C) === k && 'predator +1', R.thinAffinity(C) === k && 'affinity +1', (C.xp.disc[k] || 0) && `XP +${C.xp.disc[k]}`].filter(Boolean).join(', ');
    const pw = (d.powers || []).map(R.power).filter(Boolean);
    const lvls = [1, 2, 3, 4, 5].filter((l) => pw.some((p) => p.lv === l));
    return `<section class="disc ${isOpen ? 'open' : ''}" id="disc-${k}">
      <header class="disc-head"><img src="assets/icons/${esc(d.icon)}" alt="">
        <div><h2>${esc(d.n)}</h2><p class="small muted">${inClan ? 'In-clan' : 'Out-of-clan'}${notes ? ' · ' + notes : ''} · cap ${R.cap(C, k)}</p></div>
        <span class="disc-total">${xp ? xpDots(k, d.n, total, base) : discDots(k, d.n, inClan)}</span>
        <span class="count ${chosen === slots ? 'ok' : chosen > slots ? 'over' : ''}">${k === 'alchemy' ? 'Formulas' : 'Powers'} ${chosen}/${slots}</span>
        <button class="icon-btn" data-act="toggleOpen" data-k="${k}" aria-expanded="${isOpen}" aria-label="Show powers">${isOpen ? '−' : '+'}</button></header>
      ${isOpen ? `<p class="disc-sum">${esc(LORE.discSum[k] || d.sum)} <button class="link" data-act="readDisc" data-k="${k}">About ${esc(d.n)}</button></p>
      ${lvls.filter((l) => ui.open['hi:' + k] || l <= Math.max(1, total)).map((l) => `<h3 class="lvl">Level ${l} <span>${pips(l)}</span></h3><ul class="powers">${pw.filter((p) => p.lv === l).map((p) => powerRow(p, k, slots)).join('')}</ul>`).join('')}
      ${lvls.some((l) => l > Math.max(1, total)) ? `<p><button class="link" data-act="toggleOpen" data-k="hi:${k}">${ui.open['hi:' + k] ? 'Hide levels above your rating' : 'Show the higher levels too'}</button></p>` : ''}` : ''}
    </section>`;
  }
  function schoolBlock(k, xp) {
    const S0 = R.school(k);
    const total = R.discTotal(C, k), base = R.discBase(C, k), own = C.disc[k] || 0;
    const placed = sum(Object.values(C.paths).map((x) => x || 0));
    const free = sum(Object.keys(C.paths).map((p) => C.paths[p] || 0));
    const picks = C.sorc.length;
    const inClan = R.inClan(C, k);
    const isOpen = ui.open[k] ?? true;
    const skey = k.replace('school:', '');
    const sig = LORE.signature[skey] || [];
    const alias = S0.alias || {};
    const paths = S0.paths.map(R.path).filter(Boolean).sort((a, b) => (sig.includes(a.key) ? sig.indexOf(a.key) : 99) - (sig.includes(b.key) ? sig.indexOf(b.key) : 99));
    const pathRows = paths.map((P) => {
      const n = C.paths[P.key] || 0, x = C.xp.paths[P.key] || 0;
      const open = ui.open['p:' + P.key];
      const owned = n + x > 0;
      const items = owned && open ? [...P.fx, ...P.rit].map(R.power).filter(Boolean).map((p) => {
        const sel = C.sorc.includes(p.id) || C.xp.sorc.includes(p.id);
        const tooHigh = p.lv > n + x;
        const banned = app.preset.bannedPowers.includes(p.id);
        const kind = p.d === 'rituals' ? 'Ritual' : 'Effect';
        return `<li class="pw ${sel ? 'sel' : ''} ${tooHigh || banned ? 'dis' : ''}"><label><input type="checkbox" data-act-change="toggleSorc" data-k="${p.id}" ${sel ? 'checked' : ''} ${(tooHigh || banned) && !sel ? 'disabled' : ''}>
          <span class="pw-name">${esc(p.n)}</span></label><span class="tag">${kind} ${pips(p.lv)}</span>${C.xp.sorc.includes(p.id) ? '<span class="tag xp">XP</span>' : ''}${banned ? '<span class="tag bad">Banned</span>' : ''}
          <p class="pw-sum">${esc(PT(p))}</p><button class="link" data-act="readPower" data-k="${p.id}">Full text</button></li>`;
      }).join('') : '';
      return `<li class="path-row ${owned ? 'owned' : ''}"><div class="path-head">
        ${P.icon ? `<img src="assets/icons/${esc(P.icon)}" alt="">` : '<span class="ico-ph"></span>'}
        <span class="pname">${esc(P.n)}${alias[P.key] ? ` <span class="palias">${esc(alias[P.key])}</span>` : ''}${sig.includes(P.key) ? ' <span class="tag sig">Signature</span>' : ''}</span>
        ${xp ? `${dots(n + x, 5, { act: 'xpSet', k: 'path|' + P.key, base: n, label: P.n, lock: total })}<span class="xp-next">${n + x < total ? `<b>${R.XP.path(n + x + 1)}</b> XP` : ''}</span>` : dots(n + x, 5, { act: 'setPath', k: P.key, base: n, label: P.n, lock: total })}
        <button class="link" data-act="readPower" data-k="${P.intro}">About</button>
        ${owned ? `<button class="link" data-act="toggleOpen" data-k="p:${P.key}">${open ? 'Hide' : 'Rituals &amp; effects'} (${P.fx.length + P.rit.length})</button>` : ''}</div>
        <p class="psum">${esc(LORE.pathSum[P.key] || '')}</p>
        ${items ? `<ul class="powers">${items}</ul>` : ''}</li>`;
    }).join('');
    return `<section class="disc school ${isOpen ? 'open' : ''}" id="disc-${k}">
      <header class="disc-head"><img src="assets/icons/${esc(S0.icon)}" alt="">
        <div><h2>${esc(S0.n)}</h2><p class="small muted">Blood Sorcery school · ${inClan ? 'in-clan' : 'out-of-clan'}${S0.cast ? ' · casting ' + esc(S0.cast) : ''}</p></div>
        <span class="disc-total">${xp ? xpDots(k, S0.n, total, base) : discDots(k, S0.n, inClan)}</span>
        <span class="count ${placed === total ? 'ok' : placed > total ? 'over' : ''}">Path dots ${placed}/${total}</span>
        <span class="count ${picks === free ? 'ok' : picks > free ? 'over' : ''}">Free picks ${picks}/${free}</span>
        <button class="icon-btn" data-act="toggleOpen" data-k="${k}" aria-expanded="${isOpen}" aria-label="Show paths">${isOpen ? '−' : '+'}</button></header>
      ${isOpen ? `<p class="disc-sum">${esc(LORE.schoolSum[skey] || S0.sum)} <button class="link" data-act="readPower" data-k="${S0.id}">About ${esc(S0.n)}</button></p>
      ${sig.length ? `<p class="sig-line"><strong>Signature Paths:</strong> ${sig.map((x) => esc(R.path(x).n) + (alias[x] ? ` <span class="palias">(${esc(alias[x])})</span>` : '')).join(', ')}. ${esc((LORE.signatureNote || {})[skey] || '')}</p>` : ''}
      <p class="hint">Each school dot gives one Path dot. Each Path dot gives one free ritual or special effect of that rating or lower. A Path can't exceed the school's rating.</p>
      <ul class="paths">${pathRows}</ul>` : ''}
    </section>`;
  }
  S.disciplines = () => {
    if (!C.clan) return `<header class="page-head"><h1>Disciplines</h1></header><p class="empty">Choose a clan first; your Disciplines follow from it.</p>`;
    const keys = new Set(R.isCaitiff(C) ? [] : R.clanDisc(C));
    R.activeDiscs(C).forEach((k) => keys.add(k));
    if (R.isCaitiff(C) || C.free) {
      const extra = ui.caitiffAdd || [];
      extra.forEach((k) => keys.add(k));
    }
    const list = [...keys];
    const caitiff = R.isCaitiff(C) || C.free ? `<div class="add-disc"><label class="fld narrow"><span>Add a Discipline</span><select data-act-change="caitiffAdd"><option value="">—</option>${R.allDiscKeys().filter((k) => !keys.has(k)).map((k) => `<option value="${k}">${esc(R.discName(k))}</option>`).join('')}</select></label></div>` : '';
    const intro = R.isThin(C) ? '<p class="lede">Thin-bloods have no intrinsic Disciplines. Thin-Blood Alchemist and Discipline Affinity (Advantages) add them here.</p>'
      : R.isCaitiff(C) ? '<p class="lede">Pick any two Disciplines: two dots in one, one in the other. Click the dots beside a Discipline’s name to place them.</p>'
        : '<p class="lede">Two dots in one clan Discipline, one in another: click the dots beside its name. Each dot buys one power of that level or lower.</p>';
    const vals = Object.values(C.disc).filter((v) => v > 0);
    const two = vals.filter((v) => v === 2).length, one = vals.filter((v) => v === 1).length;
    const tally = R.isThin(C) ? '' : `<ul class="spread"><li class="${two === 1 ? 'ok' : two > 1 ? 'over' : ''}"><b>${dots(2, 2)}</b><span>${two} of 1</span></li><li class="${one === 1 ? 'ok' : one > 1 ? 'over' : ''}"><b>${dots(1, 1)}</b><span>${one} of 1</span></li></ul>`;
    return `<header class="page-head"><h1>Disciplines</h1>${intro}</header>${tally}${caitiff}
      ${list.length ? list.map((k) => (R.isSchool(k) ? schoolBlock(k) : discBlock(k))).join('') : '<p class="empty">Nothing here yet.</p>'}`;
  };

  // what an Advantage does at a given number of dots (hand-written texts first, then the book's dot ladder)
  const AT = () => D.advText || {};
  function advFx(A, dots) {
    const t = AT()[A.id] || {};
    if (dots && t.lv && t.lv[dots]) return t.lv[dots];
    return t.e || A.sum || '';
  }
  const GRANT_NOTE = {
    'Mythic Flaws': 'Flaws from the Mythic category that make you more of a monster of legend. Choose which below.',
    'Domain': 'A hunting territory of your own: spread the dots between Chasse (its size and feeding), Lien (its ties to mortal institutions) and Portillon (how well it’s guarded).',
  };
  function grantRow(name, dots, note, kind) {
    const id = R.advIdByName(name); const A = id && R.adv(id);
    const fx = A ? advFx(A, dots) : GRANT_NOTE[name] || '';
    return `<li class="grant ${kind || ''}"><div class="grant-top"><strong>${kind === 'flaw' ? 'Flaw: ' : ''}${esc(name)}</strong> <span class="adv-dots">${pips(dots)}</span>${note ? ` <span class="muted">(${esc(note)})</span>` : ''}
      ${A ? `<button class="link" data-act="readAdv" data-k="${A.id}">Full text</button>` : ''}</div>${fx ? `<p class="grant-sum">${esc(fx)}</p>` : ''}</li>`;
  }
  function spreadInfo(name, max) {
    const id = R.advIdByName(name); const A = id && R.adv(id);
    if (!A) {
      if (name === 'Mythic Flaws') {
        const list = D.allAdv.filter((x) => x.ed === 'v5' && x.cat === 'Mythic' && x.kind === 'flaw');
        return `<p class="grant-sum">${esc(GRANT_NOTE[name])}</p><ul class="mini">${list.map((x) => `<li><button class="link" data-act="readAdv" data-k="${x.id}">${esc(x.n)}</button> <span class="adv-dots">${pips((x.dots || [])[0] || 0)}</span> ${esc(advFx(x))}</li>`).join('')}</ul>`;
      }
      return GRANT_NOTE[name] ? `<p class="grant-sum">${esc(GRANT_NOTE[name])}</p>` : '';
    }
    const t = AT()[A.id] || {};
    const lv = [1, 2, 3, 4, 5].slice(0, max).filter((d) => t.lv && t.lv[d]);
    return lv.length ? `<ul class="mini lv">${lv.map((d) => `<li><span class="adv-dots">${pips(d)}</span> ${esc(t.lv[d])}</li>`).join('')}</ul>`
      : `<p class="grant-sum">${esc(advFx(A))} <button class="link" data-act="readAdv" data-k="${A.id}">Full text</button></p>`;
  }
  // A predator type's "spread N dots between …" control. Shown on the Predator page and on the page those traits live on.
  function spreadBox(sp0, i, withLink) {
    const sp = C.pred.spread[i] || {}; const tot = sum(Object.values(sp));
    return `<fieldset class="pchoice spread-box" id="pred-spread-${i}"><legend>Spread ${sp0.pts} dots (${tot}/${sp0.pts})${withLink ? ` <span class="small muted">from your predator type, ${esc(R.predator(C.predator).n)}</span>` : ''}</legend>${sp0.opts.map((o) => `<div class="spread-opt"><div class="trait-row"><span class="tname"><strong>${esc(o)}</strong></span>${dots(sp[o] || 0, sp0.pts, { act: 'predSpread', k: i + '|' + o, label: o })}</div>
          ${spreadInfo(o, sp0.pts)}
          ${o === 'Mythic Flaws' && sp[o] ? `<label class="fld"><span>Which Mythic Flaws?</span><input data-bind-prednote="${esc(o)}" value="${esc((C.pred.notes || {})[o] || '')}" placeholder="e.g. Folkloric Bane (silver)"></label>` : ''}</div>`).join('')}</fieldset>`;
  }
  const predSpreadsFor = (step) => { const p = R.predator(C.predator); return p ? (p.g.spread || []).map((s, i) => [s, i]).filter(([s]) => R.spreadStep(s) === step) : []; };
  S.predator = () => {
    const p = R.predator(C.predator);
    let detail = '';
    if (p) {
      const g = p.g;
      const dopts = R.predDiscOptions(C);
      const choice = (g.choice || []).map((opts, i) => `<fieldset class="pchoice"><legend>Choose one</legend>${opts.map((o, j) => {
        const id = R.advIdByName(o[1]); const A = id && R.adv(id);
        return `<label class="radio top"><input type="radio" name="pc${i}" data-act-change="predChoice" data-k="${i}" value="${j}" ${C.pred.choices[i] === j ? 'checked' : ''}>
          <span><strong>${esc(o[1])}</strong> <span class="adv-dots">${pips(o[2])}</span>${o[3] ? ' <span class="muted">(' + esc(o[3]) + ')</span>' : ''}${A ? ` <button class="link" data-act="readAdv" data-k="${A.id}">Full text</button>` : ''}
          ${A || GRANT_NOTE[o[1]] ? `<span class="grant-sum">${esc(A ? advFx(A, o[2]) : GRANT_NOTE[o[1]])}</span>` : ''}</span></label>`;
      }).join('')}</fieldset>`).join('');
      const spread = (g.spread || []).map((sp0, i) => spreadBox(sp0, i)).join('');
      const fixed = []
        .concat((g.merit || []).map(([n, d]) => grantRow(n, d, '', 'merit')))
        .concat((g.bg || []).map(([n, d, note]) => grantRow(n, d, note, 'bg')))
        .concat((g.flaw || []).map(([n, d, note]) => grantRow(n, d, note, 'flaw')));
      if (g.hum) fixed.push(`<li class="grant"><strong>${g.hum > 0 ? 'Gain' : 'Lose'} one dot of Humanity</strong></li>`);
      if (g.bp) fixed.push('<li class="grant"><strong>Increase Blood Potency by one</strong></li>');
      detail = `<article class="pred-detail"><h2>${esc(p.n)}</h2><p>${esc(p.sum)} <button class="link" data-act="readPred">Full text</button></p>
        ${p.pool ? `<p class="small"><strong>Hunting pool:</strong> ${esc(p.pool)}</p>` : ''}
        <fieldset class="pchoice"><legend>Specialty</legend>${g.spec.map((x, i) => `<label class="radio"><input type="radio" name="pspec" data-act-change="predSpec" value="${i}" ${(C.pred.spec || 0) === i ? 'checked' : ''}> ${esc(x)}</label>`).join('')}
          ${/specific/i.test(g.spec[C.pred.spec || 0] || '') ? `<label class="fld narrow"><span>Name it</span><input data-bind-pred="specName" value="${esc(C.pred.specName || '')}" placeholder="e.g. Goth scene"></label>` : ''}</fieldset>
        <fieldset class="pchoice"><legend>Discipline dot</legend>${dopts.map((o) => `<label class="radio"><input type="radio" name="pdisc" data-act-change="predDisc" value="${o.key || ''}" ${C.pred.disc === o.key ? 'checked' : ''} ${o.disabled ? 'disabled' : ''}> ${esc(o.label)}${o.key && R.discTotal(C, o.key) - (C.pred.disc === o.key ? 1 : 0) + 1 > R.cap(C, o.key) ? ' <span class="tag bad">over cap</span>' : ''}</label>`).join('')}</fieldset>
        ${choice}${spread}
        ${fixed.length ? `<h3>Also gained</h3><ul class="grants">${fixed.join('')}</ul><p class="small muted">These don’t cost Advantage points.</p>` : ''}
      </article>`;
    }
    return `<header class="page-head"><h1>Predator type</h1><p class="lede">How you hunt shapes who you are. Each type adds a specialty, a Discipline dot and its own Advantages and Flaws.</p></header>
      ${detail}
      ${C.predator === R.NO_PRED ? `<article class="pred-detail"><h2>No predator type</h2><p>This character has no predator type: no extra specialty, Discipline dot, Advantages or Flaws come from how they hunt. Work out with your Storyteller how they feed.</p></article>` : ''}
      <ul class="pred-list"><li class="pred-wide"><button class="pred none ${C.predator === R.NO_PRED ? 'sel' : ''}" data-act="setPred" data-k="${R.NO_PRED}"><strong>No predator type</strong><span>Skip the predator type and everything it grants. For chronicles that don’t use them, or a character whose hunting is still undecided.</span></button></li>${core.predators.map((x) => { const no = x.g.notClan && C.clan && x.g.notClan.includes((R.clan(C.clan) || {}).n); return `<li><button class="pred ${C.predator === x.id ? 'sel' : ''}" data-act="setPred" data-k="${x.id}" ${no ? 'disabled' : ''}>
        <strong>${esc(x.n)}</strong><span>${esc(x.sum)}</span><span class="small muted">${no ? 'Not available to your clan' : srcLine(x.src)}</span></button></li>`; }).join('')}</ul>`;
  };

  // --- backgrounds, merits and flaws
  const V20_BANE_TIP = 'This bane was written for V20 rules, where certain systems worked a little differently. Agree with your Storyteller how it works in V5.';
  const V20_TIP = 'From V20 or a Revised-era book (the source is in the description). Often more distinctive than the V5 options, but written for V20 rules: agree with your Storyteller how it works in V5.';
  const edBadge = (a) => (a.ed !== 'v20' ? '' : a.adapted
    ? '<span class="ed-badge" tabindex="0" data-tip="A V20 Flaw rewritten with the V5 Stench rules, so it works as written.">V20 · adapted</span>'
    : `<span class="ed-badge" tabindex="0" data-tip="${V20_TIP}">V20</span>`);
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  function advAvailable(a) {
    const P = app.preset;
    if (P.bannedAdv.includes(a.id)) return 'Banned by the Storyteller';
    if (a.clan && C.clan && !R.clanIn(C, a.clan)) return a.clan[0] + ' only';
    if (a.notClan && C.clan && R.clanIn(C, a.notClan)) return 'Not for ' + (R.clan(C.clan) || {}).dn;
    return '';
  }
  function advRow(a, opts) {
    opts = opts || {};
    const why = advAvailable(a);
    const mine = C.adv.filter((x) => x.id === a.id);
    const multi = a.multi || a.kind === 'background';
    const canAdd = !why && (multi || !mine.length);
    const zero = !a.dots || !a.dots[0];
    const dotOpts = (a.dots || []).filter((d) => d > 0);
    const xpc = (d) => (opts.xp ? `<span class="xp-c">${R.XP.adv(d)} XP</span>` : '');
    let add = canAdd ? (zero ? `<button class="btn sm" data-act="addAdv" data-k="${a.id}" data-v="0">Take</button>`
      : dotOpts.length === 1 ? `<button class="btn sm" data-act="addAdv" data-k="${a.id}" data-v="${dotOpts[0]}">${opts.xp ? 'Buy' : 'Take'} ${pips(dotOpts[0])}${xpc(dotOpts[0])}</button>`
        : `<span class="dot-pick">${opts.xp ? '<span class="small muted">Buy</span>' : ''}${dotOpts.map((d) => `<button class="btn sm" data-act="addAdv" data-k="${a.id}" data-v="${d}" title="${opts.xp ? R.XP.adv(d) + ' XP' : d + ' point' + (d > 1 ? 's' : '')}">${pips(d)}${xpc(d)}</button>`).join('')}</span>`) : '';
    if (a.id === 'v5-allies' && canAdd) add = alliesPick(null);
    const dl = zero || a.id === 'v5-allies' ? '' : dotOpts.length > 1 ? `${pips(dotOpts[0])}–${pips(dotOpts[dotOpts.length - 1])}` : pips(dotOpts[0]);
    const kindTag = opts.kindTag ? (a.kind === 'flaw' ? '<span class="tag flaw">Flaw</span>' : a.kind === 'merit' ? '<span class="tag">Merit</span>' : '') : '';
    return `<li class="adv ${mine.length ? 'mine' : ''} ${why ? 'dis' : ''} ${a.kind}">
      <div class="adv-top"><button class="adv-name link" data-act="readAdv" data-k="${a.id}">${esc(a.n)}</button><span class="adv-dots">${dl}</span>${edBadge(a)}${kindTag}
      ${a.clan && R.mfCat(a) === 'Clan & Bloodline' ? `<span class="tag clan-tag">${esc(a.clan.join(' / '))}</span>` : ''}${a.sabbat ? '<span class="tag clan-tag">Sabbat</span>' : ''}${a.setting ? `<span class="tag clan-tag">${a.setting === 'da' ? 'Dark Ages' : 'Laibon'}</span>` : ''}${a.homebrew ? `<span class="ed-badge hb-tag" tabindex="0" data-tip="Comes from Saligia Wiki, not found in official materials">Homebrew</span>` : ''}${a.req ? `<span class="tag">${esc(a.req)}</span>` : ''}${why ? `<span class="tag muted">${esc(why)}</span>` : ''}${mine.length ? `<span class="tag ok">Taken${mine.length > 1 ? ' ×' + mine.length : ''}</span>` : ''}
      <span class="adv-act">${add}</span></div>
      ${advBody(a)}</li>`;
  }
  // Allies are two traits: Effectiveness (up to 4) and Reliability (up to 3)
  function alliesPick(i) {
    const x = i == null ? null : C.adv[i];
    const row = (part, max, label) => `<span class="ally-row"><span class="ally-lbl">${label}</span>${[...Array(max)].map((_, j) => {
      const v = j + 1; const on = x && (x[part] || 0) >= v;
      return i == null ? `<button class="btn sm" data-act="addAlly" data-k="${part}" data-v="${v}" title="${label} ${v}">${pips(v)}</button>`
        : `<button type="button" class="dot ${on ? 'on' : 'off'}" data-act="setAlly" data-k="${i}|${part}" data-v="${v}" aria-label="${label} ${v}"></button>`;
    }).join('')}</span>`;
    return `<span class="ally-pick${i == null ? '' : ' mine'}">${row('eff', 4, 'Effectiveness')}${row('rel', 3, 'Reliability')}</span>`;
  }
  function advBody(a) {
    const t = AT()[a.id];
    if (!t) return `<p class="adv-sum">${esc(a.sum)} <button class="link more" data-act="readAdv" data-k="${a.id}">Full text</button></p>`;
    const lv = t.lv ? Object.keys(t.lv).map(Number).sort((x, y) => x - y) : [];
    return `<p class="adv-sum">${esc(t.f || '')}</p>
      ${t.e ? `<p class="adv-fx"><b>Effect</b> ${esc(t.e)}</p>` : ''}
      ${lv.length ? `<ul class="mini lv">${lv.map((d) => `<li><span class="adv-dots">${pips(d)}</span> ${esc(t.lv[d])}</li>`).join('')}</ul>` : ''}
      <button class="link more" data-act="readAdv" data-k="${a.id}">Full text</button>`;
  }
  const advMatch = (q) => (a) => !q || a.n.toLowerCase().includes(q) || (a.sum || '').toLowerCase().includes(q) || (a.cat || '').toLowerCase().includes(q);
  const predIsBg = (g) => { const A = R.adv(g.id); return A ? R.isBgEntry(A) : R.BG_GROUPS.includes(g.n); };
  function advMeters(T, page) {
    if (page === 'bg') {
      const extra = T.bg - T.bgFromBonus;
      return `<div class="meters">${meter('Free Background points taken', T.bgFromBonus, T.B.bg)}</div>
        ${extra > 0 ? `<p class="hint">You’ve taken ${plural(extra, 'more Background dot')} than the free ${T.B.bg}; ${extra === 1 ? 'it comes' : 'they come'} out of your Merit points.</p>` : ''}`;
    }
    return `<div class="meters">${meter('Merits', T.used, T.B.merit)}${C.moreMerits ? meter('Extra Merits (from Flaws)', T.extra - T.extraLeft, T.extra) : ''}${meter('Flaws', T.flaw, T.B.flaw, true, C.moreMerits ? `${T.flaw} / ${T.B.flaw}–${R.FLAW_CAP}` : undefined)}
      ${R.isThin(C) ? meter('Thin-Blood Merits / Flaws', T.tbM, T.tbF, false, `${T.tbM} / ${T.tbF}`) : ''}</div>`;
  }
  function mineBox(title, rows, preds, empty) {
    return `<section class="mine-box"><h2>${title}</h2>
      ${rows.length || preds.length ? `<ul class="my-list">${rows.map(([x, i]) => myAdvRow(x, i)).join('')}
        ${preds.map((g) => `<li class="my-adv fixed"><span class="ed">PT</span><span>${esc(g.n)}${g.note ? ' (' + esc(g.note) + ')' : ''}</span><span class="adv-dots">${pips(g.dots)}</span><span class="small muted">from predator type, free</span></li>`).join('')}</ul>`
      : `<p class="empty">${empty}</p>`}</section>`;
  }
  function toc(items) {
    return `<nav class="toc" aria-label="Jump to"><span class="toc-label">Jump to</span>${items.map(([id, label, n]) => `<a href="#${id}">${esc(label)}${n != null ? ` <span>${n}</span>` : ''}</a>`).join('')}</nav>`;
  }
  S.backgrounds = () => {
    const T = R.advTally(C);
    const q = (ui.q.bg || '').toLowerCase();
    const all = D.allAdv.filter((a) => R.isBgEntry(a) && R.advShown(C, a));
    const list = all.filter(advMatch(q));
    const groups = R.BG_GROUPS.filter((g) => list.some((a) => R.bgGroup(a) === g));
    const order = { background: 0, merit: 1, flaw: 2 };
    const mine = C.adv.map((x, i) => [x, i]).filter(([x]) => x.src !== 'xp' && R.adv(x.id) && R.isBgEntry(R.adv(x.id)));
    const preds = R.predGrants(C).filter(predIsBg);
    return `<header class="page-head"><h1>Backgrounds</h1>
      <p class="lede">Who and what your character can lean on: allies, a haven, a herd, money, standing. You have ${T.B.bg} free points for Backgrounds only, and you can spend your ${T.B.merit} Advantage points here too. Don’t skip this: a few dots of Herd, Haven or Contacts will come up every session.</p>
      <p class="hint">Each Background lists its own Merits and Flaws. Background Flaws count toward your ${T.B.flaw} points of Flaws on the next step.</p></header>
      ${advMeters(T, 'bg')}
      ${mineBox('Your Backgrounds', mine, preds, 'Nothing taken yet. Browse below.')}
      ${predSpreadsFor('backgrounds').map(([s, i]) => spreadBox(s, i, true)).join('')}
      <label class="search"><span class="sr">Search</span><input type="search" data-filter="bg" value="${esc(ui.q.bg || '')}" placeholder="Search Backgrounds"></label>
      ${groups.length ? toc(groups.map((g) => ['bg-' + slug(g), g])) : ''}
      <div id="adv-list">${groups.map((g) => `<h3 class="cat" id="bg-${slug(g)}">${esc(g)}</h3><ul class="advs">${list.filter((a) => R.bgGroup(a) === g).sort((x, y) => order[x.kind] - order[y.kind]).map((a) => advRow(a, { kindTag: true })).join('')}</ul>`).join('') || '<p class="empty">No matches.</p>'}</div>`;
  };
  S.merits = () => {
    const T = R.advTally(C);
    const tab = ui.mfTab === 'flaw' ? 'flaw' : 'merit';
    const q = (ui.q.mf || '').toLowerCase();
    const pool = D.allAdv.filter((a) => !R.isBgEntry(a) && a.kind !== 'background' && !a.ingrained && R.advShown(C, a));
    const list = pool.filter((a) => a.kind === tab).filter(advMatch(q));
    const cats = R.MF_CATS.filter((c) => list.some((a) => R.mfCat(a) === c)).concat([...new Set(list.map(R.mfCat))].filter((c) => !R.MF_CATS.includes(c)));
    const mine = C.adv.map((x, i) => [x, i]).filter(([x]) => x.src !== 'xp' && x.src !== 'ingrained' && R.adv(x.id) && !R.isBgEntry(R.adv(x.id)));
    const preds = R.predGrants(C).filter((g) => !predIsBg(g));
    const count = (k) => pool.filter((a) => a.kind === k).length;
    return `<header class="page-head"><h1>Merits and Flaws</h1>
      <p class="lede">Merits are your character’s gifts, Flaws their weaknesses. Spend what’s left of your ${T.B.merit} Advantage points on Merits, and take at least ${T.B.flaw} points of Flaws.</p>
      ${app.preset.allowV20 ? `<p class="hint v20-note"><span class="ed-badge">V20</span> entries come from <em>Vampire: The Masquerade 20th Anniversary Edition</em> and its supplements, or from Revised-era books. They’re often more interesting and unique than their V5 cousins, but may need some tweaking with your Storyteller to work in V5.</p>` : ''}</header>
      <label class="more-merits check"><input type="checkbox" data-act-change="moreMerits" ${C.moreMerits ? 'checked' : ''}> <span><strong>I want more merits and I’m ready to pay the cost</strong>${C.moreMerits ? `<span class="small muted"> Each Flaw point beyond ${T.B.flaw}, up to ${R.FLAW_CAP} in all, buys one more point of Merits. <button class="link" data-act="moreMeritsInfo">How it works</button></span>` : ''}</span></label>
      ${advMeters(T)}
      ${mineBox('Your Merits and Flaws', mine, preds, 'Nothing taken yet. Browse below.')}
      ${predSpreadsFor('merits').map(([s, i]) => spreadBox(s, i, true)).join('')}
      <div class="tabs" role="tablist">${[['merit', 'Merits'], ['flaw', 'Flaws']].map(([k, l]) => `<button role="tab" class="tab ${tab === k ? 'sel' : ''}" aria-selected="${tab === k}" data-act="mfTab" data-k="${k}">${l} <span class="small muted">${count(k)}</span></button>`).join('')}<button class="btn sm add-custom" data-act="addCustom">Add custom ${tab === 'flaw' ? 'Flaw' : 'Merit'}</button></div>
      <label class="search"><span class="sr">Search</span><input type="search" data-filter="mf" value="${esc(ui.q.mf || '')}" placeholder="Search ${tab === 'flaw' ? 'Flaws' : 'Merits'}"></label>
      ${cats.length ? toc(cats.map((c) => ['mf-' + slug(c), c, list.filter((a) => R.mfCat(a) === c).length])) : ''}
      <div id="adv-list">${cats.map((c) => `<h3 class="cat" id="mf-${slug(c)}">${esc(c)}</h3><ul class="advs">${list.filter((a) => R.mfCat(a) === c).sort((x, y) => x.n.localeCompare(y.n)).map((a) => advRow(a)).join('')}</ul>`).join('') || '<p class="empty">No matches.</p>'}</div>`;
  };
  function myAdvRow(x, i) {
    const A = R.adv(x.id); if (!A) return '';
    const dotOpts = (A.dots || []).filter((d) => d > 0);
    const ed = { v5: 'V5', v20: 'V20', dgr: 'DG', custom: 'Own' }[A.ed];
    const pts = A.thin ? 'no points' : A.kind === 'flaw' ? `${x.dots} flaw pt` : `${R.advCost(C, x)} pt${A.ed === 'v20' && (app.preset.v20Ratio || 1) !== 1 ? ' (V20 ×' + app.preset.v20Ratio + ')' : ''}`;
    const noteHint = A.kind === 'background' || A.multi ? 'Who, what or where' : 'Details (optional)';
    const noteField = A.id === 'v5-discipline-affinity'
      ? `<select data-act-change="advNoteSel" data-k="${i}"><option value="">Pick a Discipline</option>${core.disciplines.filter((d) => d.kind === 'disc').map((d) => `<option value="${d.key}" ${x.note === d.key ? 'selected' : ''}>${esc(d.n)}</option>`).join('')}</select>`
      : `<input data-bind-adv="${i}" value="${esc(x.note || '')}" placeholder="${noteHint}">`;
    const ally = A.id === 'v5-allies';
    if (ally && x.eff == null) { x.eff = Math.max(1, Math.min(4, (x.dots || 2) - 1)); x.rel = Math.max(1, Math.min(3, (x.dots || 2) - x.eff)); x.dots = x.eff + x.rel; }
    return `<li class="my-adv ${A.kind}${ally ? ' ally' : ''}"><span class="ed">${ed}</span><button class="link" data-act="readAdv" data-k="${A.id}">${esc(A.n)}</button>
      ${ally ? alliesPick(i) : dotOpts.length > 1 ? `<select data-act-change="advDots" data-k="${i}">${dotOpts.map((d) => `<option value="${d}" ${x.dots === d ? 'selected' : ''}>${pips(d)}</option>`).join('')}</select>` : `<span class="adv-dots">${pips(x.dots)}</span>`}
      ${noteField}<span class="small muted">${x.src === 'xp' ? `${R.XP.adv(x.dots || 0)} XP` : pts}</span>
      <button class="icon-btn" data-act="delAdv" data-k="${i}" aria-label="Remove">✕</button></li>`;
  }
  function meter(label, val, max, atLeast, text) {
    const pct = max ? Math.min(100, (val / max) * 100) : val ? 100 : 0;
    const st = atLeast ? (val >= max ? 'ok' : 'under') : val > max ? 'over' : val === max ? 'ok' : '';
    return `<div class="meter ${st}"><span class="m-label">${label}</span><span class="m-val">${text || `${val} / ${max}`}</span><span class="m-bar"><i style="width:${pct}%"></i></span></div>`;
  }

  S.blood = () => {
    const cl = R.clan(C.clan);
    const bp = R.bp(C), B = R.BP[bp];
    const kinds = app.preset.baneKinds;
    const banes = cl ? R.banesFor(C).filter((b) => kinds.includes(b.kind)) : [];
    return `<header class="page-head"><h1>Blood and bane</h1><p class="lede">Your Blood Potency, the curse your lineage carries, and the human connections that keep the Beast at bay.</p></header>
      <section class="bp"><h2>Blood Potency ${bp}</h2>
        <dl class="bp-grid"><div><dt>Blood Surge</dt><dd>Add ${B.surge} ${B.surge === 1 ? 'die' : 'dice'}</dd></div><div><dt>Mend</dt><dd>${B.mend} Superficial</dd></div>
        <div><dt>Power bonus</dt><dd>${B.bonus ? 'Add ' + B.bonus : 'None'}</dd></div><div><dt>Rouse re-roll</dt><dd>${B.reroll ? 'Level ' + B.reroll : 'None'}</dd></div>
        <div><dt>Bane Severity</dt><dd>${B.bane}</dd></div><div><dt>Feeding</dt><dd>${B.feed}</dd></div></dl>
        <p class="hint">Generation ${C.gen || '—'}. Raise Blood Potency with experience in the next step.</p></section>
      <section><h2>Bane</h2>
        ${!cl ? '<p class="empty">Choose a clan to see its banes.</p>' : !banes.length ? '<p class="empty">This lineage has no bane in the sources the Storyteller allows.</p>' :
      `<div class="banes" role="radiogroup" aria-label="Bane">${banes.map((b) => `<label class="bane ${C.bane === b.id ? 'sel' : ''}">
        <span class="bane-head"><input type="radio" name="bane" data-act-change="setBane" value="${b.id}" ${C.bane === b.id ? 'checked' : ''}>
        <span><span class="bane-tline"><strong class="bane-title">${esc(b.title)}</strong>${b.kind === 'v20' ? `<span class="ed-badge" tabindex="0" data-tip="${V20_BANE_TIP}">V20</span>` : ''}</span><span class="bane-src">${esc(b.srcLine)}${b.kind === 'variant' ? ' · variant' : ''}</span></span></span>
        <span class="prose small-prose bane-body">${b.html}</span></label>`).join('')}</div>`}
      </section>
      <section><h2>Humanity ${R.humanity(C)}</h2>
        ${C.free ? `<div class="trait-row"><span class="tname">Humanity</span>${dots(R.humanity(C), 10, { act: 'setHum', k: 'hum', label: 'Humanity' })}</div><div class="trait-row"><span class="tname">Blood Potency</span>${dots(R.bp(C), 10, { act: 'setBPFree', k: 'bp', label: 'Blood Potency' })}</div><p class="hint">Free Edit: set Humanity and Blood Potency directly.</p>` : '<p class="hint">Set to 7, adjusted by age and predator type.</p>'}
        <h3>Convictions and Touchstones</h3>
        <div class="why-box">
          <p>A <strong>Conviction</strong> is a human value your vampire still tries to live by. A <strong>Touchstone</strong> is a living mortal who embodies it: a parent, a child, the priest of your old parish. You start with one to three Convictions and one Touchstone for each. Together they are what holds the Beast back, and they pay off at the table:</p>
          <ul>
            <li><strong>Fewer Stains.</strong> When you break a Chronicle Tenet in the service of a Conviction, you take one or more fewer Stains. Murder to keep your family out of Kindred affairs might cost 2 Stains instead of 3. <span class="cite">V5 Core p. 239</span></li>
            <li><strong>A steadier Humanity.</strong> Fewer Stains means fewer failed Remorse tests and less Humanity lost. Humanity adds dice to resist frenzy (one per three dots), lets you wake during the day, shortens torpor and keeps you passing as human. <span class="cite">V5 Core pp. 239–241</span></li>
            <li><strong>Stories worth playing.</strong> Your Storyteller will put your Touchstones in danger. If one is harmed you take a Stain (two if you caused it); if one is killed, Embraced or betrays the value you love them for, you take two (three if it was your doing), and the Conviction tied to them is lost unless you can transfer it to someone close to them. <span class="cite">V5 Core p. 240</span></li>
          </ul>
          <p><strong>Without them,</strong> you have no Conviction to excuse or soften your Tenet violations, so you lose Humanity faster than other Kindred. The Players Guide describes such a vampire as “dangerously close to falling to the Beast”, one who clings to Kindred society at the cost of their individuality and follows only the Tenets. <span class="cite">V5 Players Guide p. 212</span></p>
        </div>
        <ul class="convs">${C.convictions.map((x, i) => `<li><input data-bind-conv="${i}|c" value="${esc(x.c)}" placeholder="Conviction: Never harm a child"><input data-bind-conv="${i}|t" value="${esc(x.t)}" placeholder="Touchstone: Maya, my niece"><button class="icon-btn" data-act="delConv" data-k="${i}" aria-label="Remove">✕</button></li>`).join('')}</ul>
        ${C.convictions.length < 3 ? '<button class="btn" data-act="addConv">Add a Conviction</button>' : ''}
      </section>`;
  };

  S.xp = () => {
    if (C.free) return `<header class="page-head"><h1>Experience</h1><p class="lede">Experience isn’t used in Free Edit. Set Attributes, Skills, Disciplines, powers and Advantages directly on their own steps, and Blood Potency and Humanity on Blood &amp; bane.</p></header>`;
    const total = R.xpTotal(C);
    const rows = R.xpSpent(C);
    const spent = sum(rows.map((r) => r[1]));
    const P = app.preset;
    const tab = ['traits', 'disc', 'bg', 'merit'].includes(ui.xpTab) ? ui.xpTab : 'traits';
    // one trait: name (with next-dot cost) and clickable dots; dots below the starting value are fixed
    const xr = (t, k, label, cur, base, max, cost, opts) => {
      opts = opts || {};
      return `<div class="xr"><span class="xr-name"${opts.tip ? ` data-trait="${opts.tip}"` : ''}>${label}${opts.tag || ''}</span>
        ${dots(cur, opts.of || 5, { act: 'xpSet', k: t + '|' + k, base, label, lock: max })}
        <span class="xr-cost">${cur < max ? `<b>${cost}</b> XP` : 'max'}</span></div>`;
    };
    const group = (title, body) => `<div class="xg"><h3>${title}</h3>${body}</div>`;
    let body = '';
    if (tab === 'traits') {
      const G = { physical: 'Physical', social: 'Social', mental: 'Mental' };
      body = `<h2 class="xh">Attributes <span class="small muted">new level × 5</span></h2>
        <div class="xgrid">${Object.keys(G).map((g) => group(G[g], R.ATTRS[g].map((a) => xr('attr', a, R.ATTR_NAMES[a], R.attr(C, a), C.attrs[a], 5, R.XP.attr(R.attr(C, a) + 1), { tip: 'attr:' + a })).join(''))).join('')}</div>
        <h2 class="xh">Skills <span class="small muted">new level × 3</span></h2>
        <div class="xgrid">${Object.keys(G).map((g) => group(G[g], R.SKILLS[g].map((k) => xr('skill', k, R.SKILL_NAMES[k], R.skill(C, k), C.skills[k], 5, R.XP.skill(R.skill(C, k) + 1), { tip: 'skill:' + k })).join(''))).join('')}</div>
        <h2 class="xh">Specialties <span class="small muted">3 XP each</span></h2>
        <ul class="spec-list">${C.xp.specs.map((sp, i) => `<li><select data-act-change="xpSpecSkill" data-k="${i}">${R.SKILL_LIST.filter((x) => R.skill(C, x) > 0 || x === sp.skill).map((x) => `<option value="${x}" ${sp.skill === x ? 'selected' : ''}>${R.SKILL_NAMES[x]}</option>`).join('')}</select><input data-bind-xpspec="${i}" value="${esc(sp.name)}" placeholder="Specialty"><button class="icon-btn" data-act="delXpSpec" data-k="${i}" aria-label="Remove">✕</button></li>`).join('')}</ul>
        <button class="btn sm" data-act="addXpSpec">Buy a specialty</button>`;
    } else if (tab === 'disc') {
      const mine = R.activeDiscs(C).filter((k) => k !== 'alchemy' || R.hasAlchemy(C));
      const sk = R.schoolKey(C);
      const others = R.allDiscKeys().filter((k) => !mine.includes(k) && !(sk && R.isSchool(k)) && R.cap(C, k) > 0);
      body = `<h2 class="xh">Blood Potency <span class="small muted">new level × 10</span></h2>
        <div class="xlist">${xr('bp', 'bp', 'Blood Potency', R.bp(C), R.bp(C) - (C.xp.bp || 0), 10, R.XP.bp(R.bp(C) + 1), { of: 10 })}</div>
        <h2 class="xh">Your Disciplines</h2>
        <p class="hint">Click a Discipline’s dots to buy the next dot with experience (in-clan: new level × 5, out-of-clan: × 7). Each new dot lets you choose one more power below, as on the Disciplines step.</p>
        ${mine.length ? mine.map((k) => (R.isSchool(k) ? schoolBlock(k, true) : discBlock(k, true))).join('') : '<p class="empty">No Disciplines yet.</p>'}
        <label class="fld narrow xlearn"><span>Learn a new Discipline</span><select data-act-change="xpLearn"><option value="">Choose…</option>
          ${others.map((k) => `<option value="${k}">${esc(R.discName(k))} · ${R.discXPCost(C, k, 1)} XP${R.inClan(C, k) ? '' : ' (out-of-clan)'}</option>`).join('')}</select></label>
        <p class="small muted">New Disciplines need a teacher and a taste of their Blood.${sk ? ' Extra rituals (level × 3) and special effects (= rank) are bought by ticking them once your free picks are used.' : ''}</p>
        ${extraPowersSection()}`;
    } else {
      // Backgrounds and Merits, as on their own steps, bought with experience (3 XP per dot)
      const isBg = tab === 'bg';
      const qk = isBg ? 'xbg' : 'xmf';
      const q = (ui.q[qk] || '').toLowerCase();
      const pool = D.allAdv.filter((a) => a.kind !== 'flaw' && !a.thin && !a.ingrained && R.advShown(C, a) && (isBg ? R.isBgEntry(a) : !R.isBgEntry(a) && a.kind !== 'background'));
      const list = pool.filter(advMatch(q));
      const groups = isBg ? R.BG_GROUPS.filter((g) => list.some((a) => R.bgGroup(a) === g))
        : R.MF_CATS.filter((c) => list.some((a) => R.mfCat(a) === c)).concat([...new Set(list.map(R.mfCat))].filter((c) => !R.MF_CATS.includes(c)));
      const inGroup = (a, g) => (isBg ? R.bgGroup(a) === g : R.mfCat(a) === g);
      const order = { background: 0, merit: 1 };
      const mine = C.adv.map((x, i) => [x, i]).filter(([x]) => x.src === 'xp' && R.adv(x.id) && R.isBgEntry(R.adv(x.id)) === isBg);
      const pre = isBg ? 'xbg-' : 'xmf-';
      body = `<p class="hint">Everything here is bought with experience: 3 XP per dot. ${isBg ? 'Background Merits are listed with their Background.' : 'Flaws can’t be bought; take them on the Merits &amp; Flaws step.'}</p>
        ${mineBox(isBg ? 'Backgrounds bought with experience' : 'Merits bought with experience', mine, [], 'Nothing bought yet. Browse below.')}
        <label class="search"><span class="sr">Search</span><input type="search" data-filter="${qk}" value="${esc(ui.q[qk] || '')}" placeholder="Search ${isBg ? 'Backgrounds' : 'Merits'}"></label>
        ${groups.length ? toc(groups.map((g) => [pre + slug(g), g, isBg ? null : list.filter((a) => inGroup(a, g)).length])) : ''}
        <div id="adv-list">${groups.map((g) => `<h3 class="cat" id="${pre}${slug(g)}">${esc(g)}</h3><ul class="advs">${list.filter((a) => inGroup(a, g)).sort((x, y) => isBg ? order[x.kind] - order[y.kind] : x.n.localeCompare(y.n)).map((a) => advRow(a, { kindTag: isBg, xp: true })).join('')}</ul>`).join('') || '<p class="empty">No matches.</p>'}</div>`;
    }
    const tabs = [['traits', 'Attributes & Skills'], ['disc', 'Disciplines & Blood Potency'], ['bg', 'Backgrounds'], ['merit', 'Merits']];
    return `<header class="page-head"><h1>Experience</h1><p class="lede">${total ? `${total} XP to spend: ${R.AGES[R.ageOf(C)].xp} for your age${+P.xpBonus ? ` and ${P.xpBonus} from the Storyteller` : ''}.` : 'No starting experience for this age and chronicle.'} Click a dot to buy up to it, or the last bought dot to take it back. Costs follow the V5 table.</p></header>
      <div class="meters xp-meter">${meter('Experience spent', spent, total)}</div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="tab ${tab === k ? 'sel' : ''}" aria-selected="${tab === k}" data-act="xpTab" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="xp-body">${body}</div>
      ${rows.length ? `<details class="ledger" ${(ui.stOpen || {}).xpLedger === false ? '' : 'open'} data-dk="xpLedger"><summary><h2>Ledger <span class="small muted">${spent} XP in ${plural(rows.length, 'purchase')}</span></h2></summary><table><tbody>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td>${spent}</td></tr></tbody></table></details>` : ''}`;
  };

  // DGR extra powers: Blood Potency and Ingrained Discipline Flaws each open more powers, bought with XP at 2 × level
  function extraPowersSection() {
    const P = app.preset; const bp = R.bp(C);
    const keys = R.activeDiscs(C).filter((k) => !R.isSchool(k) && k !== 'alchemy' && R.discTotal(C, k) > 0 && (bp > 0 || R.ingrainedFor(k)));
    const taken = R.ingrained(C).filter((x) => !keys.includes(x.disc));
    const card = (k) => {
      const A = R.ingrainedFor(k); const mine = R.ingrained(C, k)[0]; const idx = mine ? C.adv.indexOf(mine) : -1;
      const rating = R.discTotal(C, k);
      const bUsed = R.bpUsed(C, k), bCap = R.bpBudget(C, k), iUsed = R.ingUsed(C, k), iCap = R.ingBudget(C, k);
      const flaw = A ? `<div class="ing-flaw ${mine ? 'on' : ''}"><div><span class="muted">Ingrained Flaw:</span> <button class="link" data-act="readAdv" data-k="${A.id}" data-tipk="adv:${A.id}">${esc(A.n.replace(/\s*\([^)]*\)\s*$/, ''))}</button>
          <p class="small">${esc(advFx(A))}</p>${mine && R.RATING_ING.has(k) ? `<p class="small muted">Instead of extra powers, you count your rating as ${R.effRating(C, k)} when choosing powers. Pick the extra power in the Disciplines step.</p>` : ''}</div>
          ${mine ? `<button class="btn sm" data-act="dropIng" data-k="${idx}">Remove</button>` : `<button class="btn sm" data-act="takeIng" data-k="${k}">Take the Flaw</button>`}</div>` : '';
      const pw = ((R.disc(k) || {}).powers || []).map(R.power).filter((p) => p && p.lv <= rating && !C.powers.includes(p.id)).sort((x, y) => x.lv - y.lv || x.n.localeCompare(y.n));
      const rows = (bCap || iCap) ? `<ul class="ing-pw">${pw.map((p) => {
        const inB = (C.xp.bpow || []).includes(p.id), inI = (C.xp.ipow || []).includes(p.id), on = inB || inI;
        const banned = P.bannedPowers.includes(p.id);
        const fits = bUsed + p.lv <= bCap || iUsed + p.lv <= iCap;
        const dis = !on && (!fits || banned || (P.enforceAmalgams && p.amr && !R.meetsReq(C, p.amr)));
        return `<li class="${on ? 'sel' : ''} ${dis ? 'dis' : ''}"><label class="check"><input type="checkbox" data-act-change="toggleXPow" data-k="${p.id}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}>
          <span data-tipk="pow:${p.id}">${esc(p.n)}</span></label> <span class="adv-dots">${pips(p.lv)}</span>${inB ? ' <span class="tag">Blood Potency</span>' : ''}${inI ? ' <span class="tag">Ingrained</span>' : ''}${banned ? ' <span class="tag bad">Banned</span>' : ''} <span class="cost">${R.XP.ingPower(p.lv)} XP</span></li>`; }).join('') || '<li class="muted">No other powers at or below your rating.</li>'}</ul>` : '';
      return `<li class="ing ${bUsed || iUsed || mine ? 'on' : ''}"><div class="ing-head"><strong>${esc(R.discName(k))}</strong> <span class="adv-dots">${pips(rating)}</span></div>
        <div class="meters">${bCap ? meter('Blood Potency levels', bUsed, bCap) : ''}${iCap ? meter('Ingrained Flaw levels', iUsed, iCap) : ''}</div>
        ${flaw}${rows}</li>`;
    };
    return `<section class="ingrained"><h2>More Discipline powers</h2>
      <p class="small">You can own more powers than your Discipline dots, bought with experience at 2 XP × the power’s level. They can’t be above your rating, don’t raise it, and each needs Resonance of the matching Temperament.</p>
      <ul class="small rules-list"><li><strong>Blood Potency:</strong> in each Discipline, extra powers worth up to your Blood Potency in levels (now ${bp}). If your Blood Potency drops, you lose the powers and get the XP back.</li>
        <li><strong>Ingrained Discipline Flaws:</strong> take a Discipline’s Flaw to buy ${R.ING_PER_FLAW} more levels’ worth of its powers (three level 1 powers, a level 2 and a level 1, or one level 3). The Flaw costs no points; you live with its drawback.</li></ul>
      <p class="small muted">Ticking a power uses your Blood Potency allowance first, then the Ingrained Flaw’s.</p>
      ${keys.length ? `<ul class="ing-list">${keys.map(card).join('')}</ul>` : '<p class="empty">Get at least one dot in a Discipline first.</p>'}
      ${taken.length ? `<p class="small bad">${taken.map((x) => esc((R.adv(x.id) || {}).n)).join(', ')}: you no longer have that Discipline. <button class="link" data-act="dropIng" data-k="${C.adv.indexOf(taken[0])}">Remove</button></p>` : ''}
    </section>`;
  }

  S.review = () => {
    const issues = R.validate(C);
    const cl = R.clan(C.clan);
    const errs = issues.filter((x) => x.level === 'err');
    const attrCol = (g) => R.ATTRS[g].map((a) => `<div class="trait-row"><span class="tname">${R.ATTR_NAMES[a]}</span>${dots(R.attr(C, a), 5, { base: C.attrs[a] })}</div>`).join('');
    const specs = R.allSpecs(C);
    const skillCol = (g) => R.SKILLS[g].map((s) => { const sp = specs.filter((x) => x.skill === s).map((x) => x.name).filter(Boolean); return `<div class="trait-row"><span class="tname">${R.SKILL_NAMES[s]}${sp.length ? ` <em>(${esc(sp.join(', '))})</em>` : ''}</span>${dots(R.skill(C, s), 5, { base: C.skills[s] })}</div>`; }).join('');
    const pw = R.allPowerIds(C).map(R.power).filter(Boolean);
    const sk = R.schoolKey(C);
    const sorc = C.sorc.concat(C.xp.sorc || []).map(R.power).filter(Boolean);
    const bane = cl && cl.banes.find((b) => b.id === C.bane);
    const adv = C.adv.map((x) => ({ x, A: R.adv(x.id) })).filter((o) => o.A);
    const preds = R.predGrants(C);
    return `<header class="page-head"><h1>Review and export</h1>
      <p class="lede">${errs.length ? `${plural(errs.length, 'problem')} to fix before this character is legal. You can still export a draft.` : 'The character follows the chronicle rules.'}</p></header>
      <div class="export-box">
        <button class="btn primary" data-act="exportFoundry">Download Foundry actor (.json)</button>
        <button class="btn" data-act="saveFile">Save builder file</button>
        <button class="btn" data-act="exportPdf">Download character sheet (.pdf)</button>
        <button class="btn" data-act="print">Print summary</button>
        <details class="howto"><summary>How to import into Foundry</summary><ol>
          <li>Make sure the <em>Dark Gifts: Disciplines Restored</em> module is active in your world, so its Disciplines show on the sheet.</li>
          <li>In the Actors sidebar, create a new actor of type <em>Vampire</em> (any name).</li>
          <li>Right-click it, choose <em>Import Data</em>, and select the downloaded file.</li>
          <li>Powers, clan, predator type and Advantages arrive as items linked back to their compendium entries.</li></ol></details>
      </div>
      ${issues.length ? `<ul class="issues big">${issues.map((x) => `<li class="${x.level}"><button data-act="go" data-k="${x.step}"${x.tab ? ` data-tab="${x.tab}"` : ''}${x.anchor ? ` data-anchor="${x.anchor}"` : ''}>${esc(x.msg)}</button></li>`).join('')}</ul>` : ''}
      <article class="sheet" id="sheet">
        <header class="sheet-head">${cl ? `<img src="${clanArt(cl)}" alt="" class="${cl.art ? 'art' : 'logo'}">` : ''}<div>
          <h2 class="sheet-name">${esc(C.name || 'Unnamed')}</h2>
          <p>${esc([C.concept, cl && cl.dn + (cl.castes ? ' (' + casteName(R.casteOf(C)) + ')' : ''), C.sabbat && 'Sabbat', C.kind && C.kind !== 'vampire' && R.KINDS[C.kind], C.predator && R.predName(C)].filter(Boolean).join(' · '))}</p>
          <p class="small">${esc([C.sire && 'Sire: ' + C.sire, C.gen && 'Generation ' + C.gen, 'Blood Potency ' + R.bp(C), 'Humanity ' + R.humanity(C), 'Health ' + R.health(C), 'Willpower ' + R.willpower(C)].filter(Boolean).join(' · '))}</p>
          ${C.ambition || C.desire ? `<p class="small">${C.ambition ? 'Ambition: ' + esc(C.ambition) : ''}${C.ambition && C.desire ? ' · ' : ''}${C.desire ? 'Desire: ' + esc(C.desire) : ''}</p>` : ''}
        </div></header>
        <h3>Attributes</h3><div class="cols3">${['physical', 'social', 'mental'].map((g) => `<div>${attrCol(g)}</div>`).join('')}</div>
        <h3>Skills</h3><div class="cols3">${['physical', 'social', 'mental'].map((g) => `<div>${skillCol(g)}</div>`).join('')}</div>
        <h3>Disciplines</h3>
        ${R.activeDiscs(C).map((k) => `<div class="sheet-disc"><div class="trait-row"><span class="tname">${esc(R.discName(k))}</span>${dots(R.discTotal(C, k), 5, { base: R.discBase(C, k) })}</div>
          <p class="small">${R.isSchool(k) ? 'Paths: ' + Object.keys(Object.assign({}, C.paths, C.xp.paths)).filter((p) => R.pathDots(C, p)).map((p) => esc(R.path(p).n) + ' ' + pips(R.pathDots(C, p))).join(', ') + (sorc.length ? '<br>' + sorc.map((p) => esc(p.n) + ' ' + pips(p.lv)).join(', ') : '')
            : pw.filter((p) => p.d === k).sort((a, b) => a.lv - b.lv).map((p) => esc(p.n) + ' ' + pips(p.lv)).join(', ')}</p></div>`).join('') || '<p class="small">None</p>'}
        <h3>Advantages and Flaws</h3>
        <ul class="plain cols2">${adv.map(({ x, A }) => A.id === 'v5-allies' && x.eff != null ? `<li>Allies (Effectiveness)${x.note ? ' (' + esc(x.note) + ')' : ''} ${pips(x.eff)}</li><li>Allies (Reliability)${x.note ? ' (' + esc(x.note) + ')' : ''} ${pips(x.rel)}</li>` : `<li>${A.kind === 'flaw' ? 'Flaw: ' : ''}${esc(A.n)}${x.note ? ' (' + esc(R.disc(x.note) ? R.disc(x.note).n : x.note) + ')' : ''} ${pips(x.dots)}${A.ed !== 'v5' ? ` <span class="muted">[${A.ed === 'v20' ? 'V20' : 'DG'}]</span>` : ''}</li>`).join('')}
          ${preds.map((g) => `<li>${esc(g.n)}${g.note ? ' (' + esc(g.note) + ')' : ''} ${pips(g.dots)} <span class="muted">[predator]</span></li>`).join('')}</ul>
        ${bane ? `<h3>Bane</h3><p><strong>${esc(bane.title)}</strong> <span class="small muted">${esc(bane.srcLine)}</span></p><div class="prose small-prose">${bane.html}</div>` : ''}
        ${C.convictions.some((x) => x.c) ? `<h3>Convictions</h3><ul class="plain">${C.convictions.filter((x) => x.c).map((x) => `<li>${esc(x.c)}${x.t ? ' — ' + esc(x.t) : ''}</li>`).join('')}</ul>` : ''}
      </article>`;
  };

  // ------------------------------------------------------------------ Storyteller mode
  // Which collapsible groups are open survives re-rendering, so ticking a box doesn't fold the list back up.
  ui.stOpen = ui.stOpen || {};
  const stOpen = (k) => (ui.stOpen[k] ? 'open' : '');
  document.addEventListener('toggle', (ev) => { const d = ev.target; if (d.dataset && d.dataset.dk) ui.stOpen[d.dataset.dk] = d.open; }, true);
  // Re-render the Storyteller page in place: keep the scroll position and the focused field.
  function stRefresh() { setTimeout(stRefreshNow, 0); }
  function stRefreshNow() {
    const y = window.scrollY; const f = document.activeElement;
    const sel = f && f.dataset ? (f.dataset.stCap ? `[data-st-cap="${f.dataset.stCap}"]` : f.dataset.st ? `[data-st="${f.dataset.st}"]` : f.dataset.stList ? `[data-st-list="${f.dataset.stList}"][value="${f.value}"]` : f.dataset.stBan ? `[data-st-ban="${f.dataset.stBan}"][value="${f.value}"]` : null) : null;
    renderShell(); renderST(); renderSummary();
    window.scrollTo(0, y);
    if (sel) { const g = $(sel); if (g) g.focus({ preventScroll: true }); }
    document.querySelectorAll('[data-st-group][data-mixed]').forEach((x) => { x.indeterminate = true; });
  }
  function renderST() {
    const P = app.preset;
    const tabs = [['rules', 'Chronicle rules'], ['clans', 'Clans'], ['powers', 'Discipline powers'], ['adv', 'Advantages'], ['share', 'Share']];
    const chk = (k, label, hint) => `<label class="check"><input type="checkbox" data-st="${k}" ${P[k] ? 'checked' : ''}> <span>${label}${hint ? `<span class="small muted"> ${hint}</span>` : ''}</span></label>`;
    const num = (k, label, min, max, step) => `<label class="fld narrow"><span>${label}</span><input type="number" data-st="${k}" value="${P[k]}" min="${min}" max="${max}" step="${step || 1}"></label>`;
    let body = '';
    if (ui.stTab === 'rules') {
      body = `<div class="grid2"><label class="fld"><span>Chronicle name</span><input data-st="name" value="${esc(P.name)}"></label>
        <label class="fld wide"><span>Note to players</span><textarea data-st="note" rows="3">${esc(P.note)}</textarea></label></div>
        <h3>Sea of time</h3><div class="checks">${Object.keys(R.AGES).map((k) => `<label class="check"><input type="checkbox" data-st-list="ages" value="${k}" ${P.ages.includes(k) ? 'checked' : ''}> ${R.AGES[k].label}</label>`).join('')}</div>
        <label class="fld narrow"><span>Default age</span><select data-st="age">${P.ages.map((k) => `<option value="${k}" ${P.age === k ? 'selected' : ''}>${R.AGES[k].label}</option>`).join('')}</select></label>
        <h3>Points and experience</h3><div class="grid4">${num('xpBonus', 'Bonus XP', 0, 500)}${num('meritPts', 'Advantage points', 0, 30)}${num('bgBonus', 'Free Background points', 0, 30)}${num('flawPts', 'Flaw points', 0, 10)}</div>
        <h3>Sources</h3><div class="checks">${chk('allowV20', 'Allow V20 Merits &amp; Flaws')}${num('v20Ratio', 'V20 point multiplier', 0.5, 3, 0.5)}${chk('allowDGR', 'Allow Dark Gifts Merits &amp; Flaws')}${chk('thinAllowed', 'Allow thin-bloods')}</div>
        <label class="fld narrow"><span>Sabbat characters</span><select data-st="sabbat">${[['allow', 'Allowed'], ['off', 'Not allowed'], ['only', 'Required (Sabbat chronicle)']].map(([k, l]) => `<option value="${k}" ${P.sabbat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <h3>Other settings</h3><div class="checks">${chk('settingDA', 'Dark Ages Merits &amp; Flaws', '(Dark Ages: Vampire, its Companion and Tome of Secrets)')}${chk('settingLaibon', 'Laibon Merits &amp; Flaws', '(Kindred of the Ebony Kingdom)')}${chk('sabbatAdvAnyone', 'Ignore sect restrictions on Merits &amp; Flaws', '(Sabbat-only entries for anyone, and Camarilla-only ones for the Sabbat)')}</div>
        <h3>Predator types</h3><div class="checks">${chk('noPredDefault', 'New characters start with no predator type', '(players can still pick one)')}</div>
        <h3>Banes players may choose</h3><div class="checks">${[['v5', 'V5 Corebook / Players Guide'], ['variant', 'Players Guide variants'], ['v20', 'V20 weaknesses']].map(([k, l]) => `<label class="check"><input type="checkbox" data-st-list="baneKinds" value="${k}" ${P.baneKinds.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <h3>Discipline ceiling</h3><div class="grid4">${num('maxDisc', 'Max rating in any Discipline', 1, 5)}</div>
        <details data-dk="caps" ${stOpen('caps')}><summary>Per-Discipline limits</summary><div class="grid4">${R.allDiscKeys().concat(['alchemy']).map((k) => `<label class="fld narrow"><span>${esc(R.discName(k))}</span><input type="number" min="0" max="5" data-st-cap="${k}" value="${P.discCaps[k] ?? ''}" placeholder="—"></label>`).join('')}</div></details>
        <div class="checks">${chk('enforceAmalgams', 'Block powers whose amalgam isn’t met')}${chk('locked', 'Lock these rules for players', '(they can’t change them in the builder)')}</div>`;
    } else if (ui.stTab === 'clans') {
      const L = D.lore; const nm = (n) => R.clanByName(n);
      const blocks = [['Clans', [...new Set(L.groups.normal.flatMap((g) => g.clans))]], ['Sabbat clans', [...new Set(L.groups.sabbat.flatMap((g) => g.clans))]]].concat(L.sections.map((x) => [x.n, x.clans]));
      body = blocks.map(([g, names]) => {
        const cls = names.map(nm).filter(Boolean); const on = cls.filter((c) => !P.disabledClans.includes(c.id)).length;
        return `<h3 class="st-group"><label class="check"><input type="checkbox" data-st-group="${cls.map((c) => c.id).join(',')}" ${on === cls.length ? 'checked' : ''} ${on && on < cls.length ? 'data-mixed="1"' : ''} aria-label="All ${esc(g)}"> ${esc(g)}</label> <span class="small muted">${on} of ${cls.length}</span></h3>
          <div class="checks cols">${cls.map((c) => `<label class="check"><input type="checkbox" data-st-ban="disabledClans" value="${c.id}" ${!P.disabledClans.includes(c.id) ? 'checked' : ''}> ${esc(c.dn)}</label>`).join('')}</div>`;
      }).join('') + '<p class="hint">Unticked clans are greyed out for players. Tick or untick a heading to allow or ban the whole group.</p>';
    } else if (ui.stTab === 'powers') {
      const q = (ui.q.st || '').toLowerCase();
      const groups = core.disciplines.map((d) => [d.n, d.powers]).concat(Object.values(core.paths).map((p) => [p.n + ' (Path)', p.fx.concat(p.rit)]));
      body = `<label class="search"><input type="search" data-filter="st" value="${esc(ui.q.st || '')}" placeholder="Filter powers"></label><p class="hint">Tick a power to ban it. ${P.bannedPowers.length} banned.</p>
        <div id="st-list">${groups.map(([n, ids]) => { const ps = ids.map(R.power).filter((p) => p && (!q || p.n.toLowerCase().includes(q) || n.toLowerCase().includes(q))); return ps.length ? `<details data-dk="p:${esc(n)}" ${q ? 'open' : stOpen('p:' + n)}><summary>${esc(n)} <span class="small muted">${ps.filter((p) => P.bannedPowers.includes(p.id)).length} banned</span></summary><div class="checks cols">${ps.map((p) => `<label class="check" data-tipk="pow:${p.id}"><input type="checkbox" data-st-list="bannedPowers" value="${p.id}" ${P.bannedPowers.includes(p.id) ? 'checked' : ''}> ${esc(p.n)} ${pips(p.lv)}</label>`).join('')}</div></details>` : ''; }).join('')}</div>`;
    } else if (ui.stTab === 'adv') {
      const q = (ui.q.sta || '').toLowerCase();
      body = `<label class="search"><input type="search" data-filter="sta" value="${esc(ui.q.sta || '')}" placeholder="Filter Advantages"></label><p class="hint">Tick an Advantage to ban it. ${P.bannedAdv.length} banned.</p>
        <div id="sta-list">${[['Backgrounds', (a) => R.isBgEntry(a)], ['Merits', (a) => !R.isBgEntry(a) && a.kind === 'merit'], ['Flaws', (a) => !R.isBgEntry(a) && a.kind === 'flaw']].map((t) => { const as = D.allAdv.filter(t[1]).filter((a) => !q || a.n.toLowerCase().includes(q)); return as.length ? `<details data-dk="a:${t[0]}" ${q ? 'open' : stOpen('a:' + t[0])}><summary>${t[0]}</summary><div class="checks cols">${as.map((a) => `<label class="check" data-tipk="adv:${a.id}"><input type="checkbox" data-st-list="bannedAdv" value="${a.id}" ${P.bannedAdv.includes(a.id) ? 'checked' : ''}> ${esc(a.n)}${a.ed !== 'v5' ? ` <span class="small muted">${a.ed === 'v20' ? 'V20' : 'DG'}</span>` : ''}</label>`).join('')}</div></details>` : ''; }).join('')}</div>`;
    } else if (ui.stTab === 'share') {
      body = `<p>Send players a code or a file. They open the builder, choose <em>Load chronicle rules</em> and paste the code or pick the file.</p>
        <div class="export-box"><button class="btn primary" data-act="stCode">Make a code</button><button class="btn" data-act="stFile">Download rules file</button><button class="btn" data-act="stReset">Reset to defaults</button></div>
        <textarea id="st-code" rows="4" readonly placeholder="The code appears here">${esc(ui.stCode || '')}</textarea>
        ${ui.stCode ? `<p class="small muted">${ui.stCode.length} characters. If the builder is hosted online, append <code>#preset=CODE</code> to its address to load the rules automatically.</p>` : ''}`;
    }
    const ro = P.locked && !ui.stUnlocked;
    $('#page').innerHTML = `<header class="page-head st"><h1>Storyteller</h1><p class="lede">Set the rules for your chronicle, then share them with your players. These settings apply to this builder right away.</p></header>
      ${ro ? `<p class="note">Your Storyteller locked these rules. <button class="link" data-act="stUnlock">Edit them anyway</button> (only if you are the Storyteller).</p>` : ''}
      <div class="tabs" role="tablist">${tabs.map((t) => `<button role="tab" class="tab ${ui.stTab === t[0] ? 'sel' : ''}" aria-selected="${ui.stTab === t[0]}" data-act="stTab" data-k="${t[0]}">${t[1]}</button>`).join('')}</div><fieldset class="st-body" ${ro && ui.stTab !== 'share' ? 'disabled' : ''}>${body}</fieldset>
      <p><button class="btn" data-act="mode" data-k="build">Back to the character</button></p>`;
    document.querySelectorAll('[data-st-group][data-mixed]').forEach((x) => { x.indeterminate = true; });
  }

  // ------------------------------------------------------------------ render
  function render(opts) {
    opts = opts || {};
    C.customAdv = C.customAdv || []; R.syncCustom(C);
    // Blood Potency can drop (age, predator type, XP); powers bought through it go with it
    if ((C.xp.bpow || []).length) C.xp.bpow.slice().reverse().forEach((id) => { const p = R.power(id); if (!p || R.bpUsed(C, p.d) > R.bpBudget(C, p.d)) C.xp.bpow = C.xp.bpow.filter((x) => x !== id); });
    renderShell();
    if (ui.mode === 'st') { renderST(); $('#steps').innerHTML = ''; renderSummary(); return; }
    renderNav();
    if (!opts.keepPage) {
      const y = opts.top ? 0 : window.scrollY;
      $('#page').innerHTML = (C.free ? `<div class="free-banner" role="note"><strong>Free Edit is on.</strong> Creation rules, budgets and the to-do list are switched off. <button class="link" data-act="freeOff">Back to regular creation</button></div>` : '') + S[ui.step]();
      if (!opts.top) window.scrollTo(0, y);
    }
    renderSummary();
    save();
  }
  app.render = render;

  // ------------------------------------------------------------------ mutations
  const ACT = {};
  const clampDots = (v, cur) => (cur === v ? v - 1 : v);
  ACT.go = (el) => {
    ui.mode = 'build'; ui.step = el.dataset.k; if (el.dataset.tab) ui.mfTab = el.dataset.tab; closeReader(); render({ top: true }); $('#page').focus({ preventScroll: true });
    const a = el.dataset.anchor && document.getElementById(el.dataset.anchor);
    if (a) { a.scrollIntoView({ block: 'start' }); a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 1600); }
  };
  ACT.mode = (el) => { ui.mode = el.dataset.k; render({ top: true }); };
  ACT.closeReader = () => closeReader();
  ACT.setAge = (el) => { C.age = el.dataset.k; const A = R.AGES[C.age]; const gs = R.isThin(C) ? A.thinGens || A.gens : A.gens; if (!gs.includes(C.gen)) C.gen = gs[gs.length - 1]; render(); };
  function defaultBane() {
    const kinds = app.preset.baneKinds;
    const b = R.banesFor(C).find((x) => kinds.includes(x.kind));
    C.bane = b ? b.id : null;
  }
  function selectClan(id) {
    if (C.clan === id) return;
    C.clan = id; C.caste = 0; C.pickDisc = [];
    // drop creation dots in Disciplines no longer in-clan
    Object.keys(C.disc).forEach((k) => { if (!R.inClan(C, k)) delete C.disc[k]; });
    defaultBane();
    if (id) { const A = R.AGES[R.ageOf(C)]; const gs = R.isThin(C) ? A.thinGens || A.gens : A.gens; if (!gs.includes(C.gen)) C.gen = gs[gs.length - 1]; }
    prunePowers();
  }
  function setSabbat(on, quiet) {
    C.sabbat = !!on;
    const cl = R.clan(C.clan);
    if (cl && !R.clanAvailable(C, cl)) {
      const to = R.clanByName(R.COUNTER[cl.n]);
      if (to && R.clanAvailable(C, to)) { selectClan(to.id); if (!quiet) toast(`Switched to ${to.dn}.`); }
      else { selectClan(null); if (!quiet) toast(`${cl.dn} ${on ? 'has no Sabbat line' : 'is only in the Sabbat'}. Pick another clan.`); }
    }
  }
  ACT.setClan = (el) => {
    selectClan(el.dataset.k);
    render(); const d = $('#clan-detail'); if (d) d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  ACT.setCaste = (el) => { C.caste = +el.dataset.v; Object.keys(C.disc).forEach((k) => { if (!R.inClan(C, k)) delete C.disc[k]; }); if (!R.banesFor(C).some((b) => b.id === C.bane)) defaultBane(); prunePowers(); render(); };
  ACT.readClan = () => {
    const cl = R.clan(C.clan); const ca = R.casteOf(C);
    openReader(cl.dn + (ca ? ': ' + casteName(ca) : ''), cl.nick ? esc(cl.nick) : '', `<p><strong>Disciplines:</strong> ${esc(clanDiscLine(cl))}</p>` + ((ca && ca.html) || cl.html), (ca && ca.src) || cl.src);
  };
  ACT.readPower = (el) => readPower(el.dataset.k);
  ACT.readAdv = (el) => readAdv(el.dataset.k);
  ACT.readDisc = (el) => { const d = R.disc(el.dataset.k); openReader(d.n, Object.entries(d.meta || {}).map(([k, v]) => `<b>${esc(k.replace(/_/g, ' '))}:</b> ${esc(v)}`).join('<br>'), d.html || '<p>No discipline write-up in Dark Gifts for this one.</p>'); };
  ACT.readPred = () => { const p = R.predator(C.predator); openReader(p.n, '', p.html, p.src); };
  ACT.setAttr = (el) => {
    const a = el.dataset.k; const v = +el.dataset.v;
    const nv = clampDots(v, C.attrs[a]);
    C.attrs[a] = Math.max(1, Math.min(C.free ? 5 : 4, nv));
    C.xp.attrs[a] = 0;
    render();
  };
  ACT.setKind = (el) => { C.kind = el.dataset.k; render(); };
  ACT.setDist = (el) => { C.skillDist = el.dataset.k; render(); };
  ACT.setSkill = (el) => {
    const s = el.dataset.k; const v = +el.dataset.v;
    const max = C.free ? 5 : Math.max(...Object.keys(R.SKILL_DISTS[C.skillDist].need).map(Number));
    C.skills[s] = Math.max(0, Math.min(max, clampDots(v, C.skills[s])));
    C.xp.skills[s] = 0;
    if (R.FREE_SPEC_SKILLS.includes(s) && C.skills[s] > 0 && !C.specs.some((x) => x.skill === s)) C.specs.push({ skill: s, name: '', src: 'free' });
    if (C.skills[s] === 0) C.specs = C.specs.filter((x) => x.skill !== s || x.name.trim());
    render();
  };
  ACT.addSpec = () => { const rated = R.SKILL_LIST.filter((s) => R.skill(C, s) > 0); C.specs.push({ skill: rated[0], name: '', src: 'free' }); render(); };
  ACT.delSpec = (el) => { C.specs.splice(+el.dataset.k, 1); render(); };
  ACT.setDiscTotal = (el) => {
    const k = el.dataset.k; const v = +el.dataset.v;
    const own = C.disc[k] || 0, total = R.discTotal(C, k), extra = total - own;
    if (C.free) {
      C.disc[k] = Math.max(0, Math.min(R.cap(C, k) - extra, (v === total ? v - 1 : v) - extra));
      if (!C.disc[k]) delete C.disc[k];
      if (R.isSchool(k)) trimPaths();
      prunePowers(); render(); return;
    }
    applyDisc(k, Math.max(0, Math.min(2, v === total ? own - 1 : v - extra)));
  };
  function applyDisc(k, v) {
    if (v > 0) {
      // only one Discipline at 2 and one at 1: move others down
      Object.keys(C.disc).forEach((o) => { if (o !== k && C.disc[o] === v) C.disc[o] = v === 2 ? 1 : 0; });
      Object.keys(C.disc).forEach((o) => { if (o !== k && C.disc[o] === 2 && v === 2) C.disc[o] = 1; });
      const ones = Object.keys(C.disc).filter((o) => o !== k && C.disc[o] === 1);
      if (v === 1 && ones.length) ones.forEach((o) => (C.disc[o] = 0));
    }
    C.disc[k] = v;
    Object.keys(C.disc).forEach((o) => { if (!C.disc[o]) delete C.disc[o]; });
    if (R.isSchool(k)) trimPaths();
    prunePowers();
    render();
  }
  ACT.toggleOpen = (el) => { const k = el.dataset.k; ui.open[k] = !(ui.open[k] ?? (k.startsWith('p:') || k.startsWith('hi:') ? false : true)); render(); };
  ACT.setPath = (el) => {
    const p = el.dataset.k; const v = +el.dataset.v;
    const cur = (C.paths[p] || 0);
    let nv = clampDots(v, cur + (C.xp.paths[p] || 0));
    const sk = R.schoolKey(C); const total = sk ? R.discTotal(C, sk) : 0;
    const others = sum(Object.keys(C.paths).filter((x) => x !== p).map((x) => C.paths[x] || 0));
    nv = Math.max(0, C.free ? Math.min(nv, total) : Math.min(nv, total, total - others + (C.xp.paths[p] || 0)));
    C.paths[p] = Math.max(0, nv - (C.xp.paths[p] || 0));
    if (!C.paths[p]) delete C.paths[p];
    if (nv > 0) ui.open['p:' + p] = true;
    trimSorc();
    render();
  };
  ACT.setPred = (el) => {
    if (C.predator !== el.dataset.k) { C.predator = el.dataset.k; C.pred = { spec: 0, disc: null, choices: {}, spread: {} }; const o = R.predDiscOptions(C).filter((x) => x.key); if (o.length === 1) C.pred.disc = o[0].key; }
    render(); window.scrollTo({ top: 0 });
  };
  ACT.predSpread = (el) => {
    const [i, o] = el.dataset.k.split('|'); const v = +el.dataset.v;
    const sp = (C.pred.spread[i] = C.pred.spread[i] || {});
    const s = R.predator(C.predator).g.spread[i];
    let nv = clampDots(v, sp[o] || 0);
    const others = sum(Object.keys(sp).filter((x) => x !== o).map((x) => sp[x] || 0));
    sp[o] = Math.max(0, Math.min(nv, s.pts - others));
    render();
  };
  ACT.mfTab = (el) => { ui.mfTab = el.dataset.k; render(); };
  ACT.galStep = (el) => {
    const k = el.dataset.k; const cl = R.clanByName(k); const ca = R.clan(C.clan) === cl ? R.casteOf(C) : null;
    const n = clanFrames(cl, (ca && ca.art) || cl.art).length; ui.gal = ui.gal || {};
    ui.gal[k] = (((ui.gal[k] || 0) + +el.dataset.v) % n + n) % n; render();
    if ($('#lightbox').open) lbRender();
  };
  // Lightbox: the gallery picture at full size, with the same arrows; Esc or a click outside closes it.
  function galFrames(k) { const cl = R.clanByName(k); const ca = R.clan(C.clan) === cl ? R.casteOf(C) : null; return { cl, fr: clanFrames(cl, (ca && ca.art) || cl.art) }; }
  function lbRender() {
    const d = $('#lightbox'); const k = d.dataset.k; if (!k) return;
    const { cl, fr } = galFrames(k); const i = ((ui.gal || {})[k] || 0) % fr.length; const cur = fr[i];
    d.innerHTML = `<figure><img src="${esc(cur.src)}" alt="${esc(cl.dn)}, picture ${i + 1} of ${fr.length}"><figcaption><em>${esc(cur.cap)}</em>${fr.length > 1 ? ` <span class="gal-count">${i + 1} / ${fr.length}</span>` : ''}</figcaption></figure>
      ${fr.length > 1 ? `<button class="gal-btn prev" data-act="galStep" data-k="${esc(k)}" data-v="-1" aria-label="Previous picture">‹</button><button class="gal-btn next" data-act="galStep" data-k="${esc(k)}" data-v="1" aria-label="Next picture">›</button>` : ''}
      <button class="lb-close" data-act="lbClose" aria-label="Close">×</button>`;
  }
  ACT.galZoom = (el) => { const d = $('#lightbox'); d.dataset.k = el.dataset.k; lbRender(); d.showModal(); };
  ACT.lbClose = () => $('#lightbox').close();
  $('#lightbox').addEventListener('click', (ev) => { if (ev.target.id === 'lightbox') ev.target.close(); });
  $('#lightbox').addEventListener('keydown', (ev) => { const d = $('#lightbox'); if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { const b = d.querySelector(ev.key === 'ArrowLeft' ? '.prev' : '.next'); if (b) b.click(); } });
  // Attribute and Skill tooltips (V5 Corebook text), positioned next to the name
  const tipEl = document.createElement('div'); tipEl.className = 'trait-tip'; tipEl.setAttribute('role', 'tooltip'); tipEl.hidden = true; document.body.appendChild(tipEl);
  function tipHtml(key) {
    const [kind, k] = key.split(':');
    if (kind === 'pow') {
      const p = R.power(k); if (!p) return '';
      return `<strong>${esc(p.n)}</strong> <span class="tip-dots-inline">${pips(p.lv)}</span><p>${esc(PT(p))}</p>${p.cost ? `<p class="tip-sp"><em>Cost:</em> ${esc(p.cost)}</p>` : ''}<p class="tip-src">${esc(R.discName(p.d) || '')}</p>`;
    }
    if (kind === 'adv') {
      const a = R.adv(k); if (!a) return ''; const t = AT()[a.id] || {};
      return `<strong>${esc(a.n)}</strong> <span class="tip-dots-inline">${(a.dots || []).filter(Boolean).map(pips).join(' / ')}</span>${t.f ? `<p>${esc(t.f)}</p>` : ''}<p>${esc(t.e || a.sum || '')}</p><p class="tip-src">${esc(((a.src || {}).book || '') + ((a.src || {}).page ? ', p. ' + a.src.page : ''))}</p>`;
    }
    const T = D.traits || {};
    const t = kind === 'attr' ? (T.attrs || {})[k] : (T.skills || {})[k]; if (!t) return '';
    const name = kind === 'attr' ? R.ATTR_NAMES[k] : R.SKILL_NAMES[k];
    return `<strong>${esc(name)}</strong><p>${esc(t.d)}</p>${t.dots ? `<ol class="tip-dots">${t.dots.map((x, i) => `<li><b>${'•'.repeat(i + 1)}</b> ${esc(x)}</li>`).join('')}</ol>` : ''}${t.sp ? `<p class="tip-sp"><em>Example specialties:</em> ${esc(t.sp)}</p>` : ''}<p class="tip-src">V5 Corebook, p. ${t.p}</p>`;
  }
  function traitTip(el) {
    const html = tipHtml(el.dataset.trait || el.dataset.tipk); if (!html) return;
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const r = el.getBoundingClientRect(); const w = Math.min(380, window.innerWidth - 24);
    tipEl.style.width = w + 'px';
    const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const h = tipEl.offsetHeight; const below = r.bottom + 8 + h < window.innerHeight;
    tipEl.style.left = left + 'px'; tipEl.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + window.scrollY + 'px';
  }
  const hideTip = () => { tipEl.hidden = true; };
  document.addEventListener('mouseover', (ev) => { const el = ev.target.closest && ev.target.closest('[data-trait],[data-tipk]'); if (el) traitTip(el); });
  document.addEventListener('mouseout', (ev) => { const el = ev.target.closest && ev.target.closest('[data-trait],[data-tipk]'); if (el && !el.contains(ev.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', (ev) => { if (ev.target.dataset && ev.target.dataset.trait) traitTip(ev.target); else hideTip(); });
  document.addEventListener('click', (ev) => { if (!(ev.target.closest && ev.target.closest('[data-tipk]'))) hideTip(); }, true);
  window.addEventListener('scroll', hideTip, { passive: true });
  ACT.freeEdit = () => { if (C.free) { setFree(false); return; } $('#free-dialog').showModal(); };
  ACT.freeOff = () => setFree(false);
  ACT.setBPFree = (el) => { const v = +el.dataset.v; C.bpSet = Math.max(0, Math.min(10, v === R.bp(C) ? v - 1 : v)); render(); };
  ACT.setHum = (el) => { const v = +el.dataset.v; C.hum = Math.max(0, Math.min(10, v === R.humanity(C) ? v - 1 : v)); render(); };
  // Free Edit doesn't use experience: whatever was bought with it becomes part of the character
  function foldXP() {
    const X = C.xp;
    const bp = R.bp(C);
    Object.keys(X.attrs).forEach((a) => { C.attrs[a] = Math.min(5, C.attrs[a] + (X.attrs[a] || 0)); });
    Object.keys(X.skills).forEach((k) => { C.skills[k] = Math.min(5, C.skills[k] + (X.skills[k] || 0)); });
    Object.keys(X.disc).forEach((k) => { if (X.disc[k]) C.disc[k] = (C.disc[k] || 0) + X.disc[k]; });
    Object.keys(X.paths).forEach((k) => { if (X.paths[k]) C.paths[k] = (C.paths[k] || 0) + X.paths[k]; });
    C.specs = C.specs.concat(X.specs || []);
    C.powers = C.powers.concat(X.powers || [], X.ipow || [], X.bpow || []);
    C.sorc = C.sorc.concat(X.sorc || []);
    C.adv.forEach((a) => { if (a.src === 'xp') a.src = 'free'; });
    if (C.bpSet == null) C.bpSet = bp;
    C.xp = R.newChar().xp;
  }
  function setFree(on) {
    if (on) foldXP();
    C.free = !!on;
    if (!on) { delete C.hum; delete C.bpSet; trimPaths(); prunePowers(); }
    render(); toast(on ? 'Free Edit is on. Creation rules are off.' : 'Back to regular creation. Check the to-do list.');
  }
  ACT.addAdv = (el) => {
    const A = R.adv(el.dataset.k);
    C.adv.push({ id: A.id, dots: +el.dataset.v, note: '', src: ui.step === 'xp' ? 'xp' : 'free' });
    render();
  };
  // Adding to Allies when the character already has an Allies entry: ask whether to change that one or start a new one
  ACT.addAlly = (el) => {
    const part = el.dataset.k, v = +el.dataset.v;
    const isXP = ui.step === 'xp';
    const have = C.adv.map((x, i) => [x, i]).filter(([x]) => x.id === 'v5-allies' && x.eff != null && (x.src === 'xp') === isXP);
    const create = () => { const x = { id: 'v5-allies', eff: 1, rel: 1, note: '', src: ui.step === 'xp' ? 'xp' : 'free' }; x[part] = v; x.dots = x.eff + x.rel; C.adv.push(x); render(); };
    if (!have.length) return create();
    const label = part === 'eff' ? 'Effectiveness' : 'Reliability';
    const d = $('#ally-dialog');
    d.querySelector('.ally-q').textContent = `Set ${label} to ${pips(v)}: on which Allies?`;
    d.querySelector('.ally-opts').innerHTML = have.map(([x, i]) => `<button class="btn" value="${i}">Existing: ${esc(x.note || 'Allies')} <span class="small muted">(Effectiveness ${pips(x.eff)}, Reliability ${pips(x.rel)})</span></button>`).join('')
      + '<button class="btn primary" value="new">A new Allies entry</button>';
    d.onclose = () => {
      const r = d.returnValue; d.onclose = null;
      if (r === 'new') create();
      else if (r && r !== 'cancel' && C.adv[+r]) { const x = C.adv[+r]; x[part] = v; x.dots = x.eff + x.rel; render(); }
    };
    d.returnValue = 'cancel'; d.showModal();
  };
  ACT.takeIng = (el) => {
    const k = el.dataset.k; const A = R.ingrainedFor(k); if (!A || R.ingrained(C, k).length) return;
    C.adv.push({ id: A.id, dots: 0, note: '', src: 'ingrained', disc: k }); render();
  };
  ACT.dropIng = (el) => { const x = C.adv[+el.dataset.k]; if (!x || x.src !== 'ingrained') return; C.adv.splice(+el.dataset.k, 1); prunePowers(); render(); };
  ACT.setAlly = (el) => {
    const [i, part] = el.dataset.k.split('|'); const x = C.adv[+i]; const v = +el.dataset.v;
    x[part] = Math.max(1, x[part] === v ? v - 1 : v); x.dots = x.eff + x.rel; render();
  };
  ACT.delAdv = (el) => {
    const x = C.adv.splice(+el.dataset.k, 1)[0];
    if (x && x.id.startsWith('custom:') && !C.adv.some((y) => y.id === x.id)) C.customAdv = C.customAdv.filter((d) => 'custom:' + d.uid !== x.id);
    prunePowers(); render();
  };
  // a Merit or Flaw of the player's own making
  ACT.addCustom = () => {
    const d = $('#custom-dialog'); const f = d.querySelector('form'); f.reset();
    f.kind.value = ui.mfTab === 'flaw' ? 'flaw' : 'merit';
    f.cat.innerHTML = ['Custom'].concat(R.MF_CATS).map((c) => `<option>${esc(c)}</option>`).join('');
    d.returnValue = 'cancel';
    d.onclose = () => {
      d.onclose = null; if (d.returnValue !== 'ok') return;
      const n = f.n.value.trim(); if (!n) return;
      const def = { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n, kind: f.kind.value, dots: +f.dots.value || 1, cat: f.cat.value, text: f.text.value.trim() };
      C.customAdv.push(def); R.syncCustom(C);
      C.adv.push({ id: 'custom:' + def.uid, dots: def.dots, note: '', src: 'free' });
      ui.mfTab = def.kind; render();
    };
    d.showModal(); setTimeout(() => f.n.focus(), 0);
  };
  ACT.addConv = () => { C.convictions.push({ c: '', t: '' }); render(); };
  ACT.delConv = (el) => { C.convictions.splice(+el.dataset.k, 1); if (!C.convictions.length) C.convictions.push({ c: '', t: '' }); render(); };
  ACT.xpAttr = (el) => { const a = el.dataset.k; C.xp.attrs[a] = Math.max(0, Math.min(5 - C.attrs[a], (C.xp.attrs[a] || 0) + +el.dataset.v)); render(); };
  ACT.xpSkill = (el) => { const s = el.dataset.k; C.xp.skills[s] = Math.max(0, Math.min(5 - C.skills[s], (C.xp.skills[s] || 0) + +el.dataset.v)); render(); };
  ACT.xpDisc = (el) => {
    const k = el.dataset.k;
    C.xp.disc[k] = Math.max(0, Math.min(R.cap(C, k) - R.discBase(C, k), (C.xp.disc[k] || 0) + +el.dataset.v));
    if (!C.xp.disc[k]) delete C.xp.disc[k];
    trimPaths(); prunePowers(); render();
  };
  ACT.xpPath = (el) => {
    const p = el.dataset.k; const sk = R.schoolKey(C);
    C.xp.paths[p] = Math.max(0, Math.min(R.discTotal(C, sk) - (C.paths[p] || 0), (C.xp.paths[p] || 0) + +el.dataset.v));
    if (!C.xp.paths[p]) delete C.xp.paths[p];
    trimSorc(); render();
  };
  ACT.xpTab = (el) => { ui.xpTab = el.dataset.k; render(); };
  // buy or refund experience by clicking a trait's dots (dots below the starting value stay put)
  ACT.xpSet = (el) => {
    const i = el.dataset.k.indexOf('|'); const t = el.dataset.k.slice(0, i), key = el.dataset.k.slice(i + 1); const v = +el.dataset.v;
    const sk = R.schoolKey(C);
    const T = {
      attr: () => [R.attr(C, key), C.attrs[key], 5, (n) => { C.xp.attrs[key] = n; }],
      skill: () => [R.skill(C, key), C.skills[key], 5, (n) => { C.xp.skills[key] = n; }],
      disc: () => [R.discTotal(C, key), R.discBase(C, key), R.cap(C, key), (n) => { if (n) C.xp.disc[key] = n; else delete C.xp.disc[key]; trimPaths(); prunePowers(); }],
      path: () => [R.pathDots(C, key), C.paths[key] || 0, sk ? R.discTotal(C, sk) : 0, (n) => { if (n) C.xp.paths[key] = n; else delete C.xp.paths[key]; trimSorc(); }],
      bp: () => [R.bp(C), R.bp(C) - (C.xp.bp || 0), 10, (n) => { C.xp.bp = n; }],
    }[t];
    if (!T) return;
    const [cur, base, max, set] = T();
    const target = Math.max(base, Math.min(max, v === cur ? v - 1 : v));
    set(target - base); render();
  };
  ACT.xpBP = (el) => { C.xp.bp = Math.max(0, Math.min(10, (C.xp.bp || 0) + +el.dataset.v)); if (R.bp(C) > 10) C.xp.bp--; render(); };
  ACT.addXpSpec = () => { const rated = R.SKILL_LIST.filter((s) => R.skill(C, s) > 0); C.xp.specs.push({ skill: rated[0] || 'academics', name: '' }); render(); };
  ACT.delXpSpec = (el) => { C.xp.specs.splice(+el.dataset.k, 1); render(); };
  ACT.exportFoundry = () => { const a = X.actor(C); X.download(X.filename(C, '.foundry.json'), a); toast('Foundry actor downloaded.'); };
  ACT.saveFile = () => { X.download(X.filename(C, '.vtmb.json'), { kind: 'vtm-builder-character', v: 1, character: C, preset: app.preset }); toast('Builder file saved.'); };
  ACT.print = () => window.print();
  ACT.exportPdf = async (el) => {
    el.disabled = true; const t = el.textContent; el.textContent = 'Preparing the sheet…';
    try {
      if (!X.pdfSheet) await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'js/pdfsheet.js'; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
      const bytes = await X.pdfSheet(C);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); a.download = X.filename(C, '.pdf');
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      toast('Character sheet downloaded.');
    } catch (e) { console.error(e); toast('The PDF could not be made: ' + e.message); }
    el.disabled = false; el.textContent = t;
  };
  ACT.newChar = () => { if (confirmBox('Start a new character? The current one is cleared unless you saved a file.')) { C = Object.assign(R.newChar()); enforceSect(); render({ top: true }); } };
  ACT.openFile = () => $('#file').click();
  ACT.loadRules = () => openRulesDialog();
  ACT.stUnlock = () => { ui.stUnlocked = true; render(); };
  ACT.stTab = (el) => { ui.stTab = el.dataset.k; render(); };
  ACT.stCode = async () => { ui.stCode = await PR.encode(app.preset); render(); const t = $('#st-code'); t.select(); try { await navigator.clipboard.writeText(ui.stCode); toast('Code copied.'); } catch (e) { toast('Code ready. Copy it from the box.'); } };
  ACT.stFile = () => { X.download(((app.preset.name || 'chronicle').replace(/\W+/g, '-')) + '.vtmb-rules.json', { kind: 'vtm-builder-rules', v: 1, preset: app.preset }); };
  ACT.stReset = () => { if (confirmBox('Reset all chronicle rules to the defaults?')) { app.preset = PR.normalize({}); store(LS_PRESET, app.preset); ui.stCode = ''; render(); } };

  const CHG = {};
  CHG.xpLearn = (el) => { const k = el.value; if (!k) return; C.xp.disc[k] = (C.xp.disc[k] || 0) + 1; ui.open[k] = true; render(); };
  // Optional rule: more Merits for more Flaws. The first time it's switched on, explain it.
  CHG.moreMerits = (el) => {
    if (!el.checked) { C.moreMerits = false; render(); return; }
    el.checked = false;
    const d = $('#more-dialog'); d.returnValue = 'cancel';
    d.onclose = () => { d.onclose = null; if (d.returnValue === 'ok') { C.moreMerits = true; try { localStorage.setItem('vtmb-more-seen', '1'); } catch (e) {} } render(); };
    let seen = false; try { seen = localStorage.getItem('vtmb-more-seen') === '1'; } catch (e) {}
    if (seen) { C.moreMerits = true; render(); } else d.showModal();
  };
  ACT.moreMeritsInfo = () => { const d = $('#more-dialog'); d.returnValue = 'cancel'; d.onclose = null; d.showModal(); };
  CHG.toggleXPow = (el) => {
    const id = el.dataset.k; const p = R.power(id); if (!p) return;
    C.xp.ipow = (C.xp.ipow || []).filter((x) => x !== id); C.xp.bpow = (C.xp.bpow || []).filter((x) => x !== id);
    if (el.checked) {
      if (R.bpUsed(C, p.d) + p.lv <= R.bpBudget(C, p.d)) C.xp.bpow.push(id);
      else if (R.ingUsed(C, p.d) + p.lv <= R.ingBudget(C, p.d)) C.xp.ipow.push(id);
    }
    render();
  };
  CHG.toggleSabbat = (el) => { setSabbat(el.checked); render(); };
  CHG.pickDisc = (el) => { C.pickDisc[+el.dataset.k] = el.value || null; render(); };
  CHG.specSkill = (el) => { C.specs[+el.dataset.k].skill = el.value; render(); };
  CHG.xpSpecSkill = (el) => { C.xp.specs[+el.dataset.k].skill = el.value; render(); };
  CHG.togglePower = (el) => {
    const id = el.dataset.k; const p = R.power(id);
    if (el.checked) {
      if (p.d === 'alchemy' && R.chosenPowers(C, 'alchemy').length >= R.powerSlots(C, 'alchemy')) C.xp.powers.push(id);
      else C.powers.push(id);
    } else { C.powers = C.powers.filter((x) => x !== id); C.xp.powers = C.xp.powers.filter((x) => x !== id); C.xp.ipow = (C.xp.ipow || []).filter((x) => x !== id); C.xp.bpow = (C.xp.bpow || []).filter((x) => x !== id); }
    render();
  };
  CHG.toggleSorc = (el) => {
    const id = el.dataset.k;
    if (el.checked) {
      const free = sum(Object.keys(C.paths).map((p) => C.paths[p] || 0));
      if (C.sorc.length < free) C.sorc.push(id); else C.xp.sorc.push(id);
    } else { C.sorc = C.sorc.filter((x) => x !== id); C.xp.sorc = C.xp.sorc.filter((x) => x !== id); }
    render();
  };
  CHG.caitiffAdd = (el) => { if (el.value) { ui.caitiffAdd = (ui.caitiffAdd || []).concat(el.value); ui.open[el.value] = true; } render(); };
  CHG.predSpec = (el) => { C.pred.spec = +el.value; render(); };
  CHG.predDisc = (el) => { C.pred.disc = el.value || null; trimPaths(); prunePowers(); render(); };
  CHG.predChoice = (el) => { C.pred.choices[el.dataset.k] = +el.value; render(); };
  CHG.advDots = (el) => { C.adv[+el.dataset.k].dots = +el.value; render(); };
  CHG.advNoteSel = (el) => { C.adv[+el.dataset.k].note = el.value; prunePowers(); render(); };
  CHG.setBane = (el) => { C.bane = el.value; render(); };
  CHG.xpAdv = (el) => {
    const A = R.adv(el.value); if (!A) return;
    const d = (A.dots || []).filter((x) => x > 0)[0] || 1;
    C.adv.push({ id: A.id, dots: d, note: '', src: 'xp' }); render();
  };

  function prunePowers() {
    // remove powers above rating or for disciplines no longer present; keep choices stable otherwise
    const active = new Set(R.activeDiscs(C));
    C.powers = C.powers.filter((id) => { const p = R.power(id); return p && active.has(p.d) && p.lv <= R.effRating(C, p.d); });
    C.xp.powers = C.xp.powers.filter((id) => { const p = R.power(id); return p && active.has(p.d) && p.lv <= R.discTotal(C, p.d); });
    // extra powers from Ingrained Flaws: drop those above the rating, then any beyond the Flaws' allowance
    C.xp.ipow = (C.xp.ipow || []).filter((id) => { const p = R.power(id); return p && active.has(p.d) && p.lv <= R.discTotal(C, p.d) && !C.powers.includes(id); });
    [...new Set(C.xp.ipow.map((id) => R.power(id).d))].forEach((k) => { while (R.ingUsed(C, k) > R.ingBudget(C, k)) { const last = R.ingPowers(C, k).pop(); C.xp.ipow = C.xp.ipow.filter((x) => x !== last); } });
    // extra powers from Blood Potency: same, and they go when Blood Potency drops (the XP comes back)
    C.xp.bpow = (C.xp.bpow || []).filter((id) => { const p = R.power(id); return p && active.has(p.d) && p.lv <= R.discTotal(C, p.d) && !C.powers.includes(id) && !C.xp.ipow.includes(id); });
    [...new Set(C.xp.bpow.map((id) => R.power(id).d))].forEach((k) => { while (R.bpUsed(C, k) > R.bpBudget(C, k)) { const last = R.bpPowers(C, k).pop(); C.xp.bpow = C.xp.bpow.filter((x) => x !== last); } });
    if (!R.schoolKey(C)) { C.paths = {}; C.xp.paths = {}; C.sorc = []; C.xp.sorc = []; }
  }
  function trimPaths() {
    const sk = R.schoolKey(C); const total = sk ? R.discTotal(C, sk) : 0;
    let placed = sum(Object.values(C.paths));
    Object.keys(C.paths).reverse().forEach((p) => { while (placed > total && C.paths[p] > 0) { C.paths[p]--; placed--; } if (!C.paths[p]) delete C.paths[p]; });
    Object.keys(C.xp.paths).forEach((p) => { if ((C.paths[p] || 0) + C.xp.paths[p] > total) C.xp.paths[p] = Math.max(0, total - (C.paths[p] || 0)); });
    trimSorc();
  }
  function trimSorc() {
    const ok = (id) => { const p = R.power(id); return p && R.pathDots(C, p.path) >= p.lv; };
    C.sorc = C.sorc.filter(ok); C.xp.sorc = C.xp.sorc.filter(ok);
    const free = sum(Object.keys(C.paths).map((p) => C.paths[p] || 0));
    while (C.sorc.length > free) C.xp.sorc.unshift(C.sorc.pop());
    while (C.sorc.length < free && C.xp.sorc.length) C.sorc.push(C.xp.sorc.shift());
  }

  // ------------------------------------------------------------------ dialogs & toasts
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function confirmBox(msg) { return window.confirm(msg); }
  function openRulesDialog() {
    const d = $('#rules-dialog');
    d.querySelector('textarea').value = '';
    d.querySelector('.err').textContent = '';
    d.showModal();
  }
  function enforceSect() {
    const m = app.preset.sabbat;
    if (m === 'only' && !C.sabbat) setSabbat(true, true);
    if (m === 'off' && C.sabbat) setSabbat(false, true);
  }
  async function applyPreset(p, from) {
    app.preset = PR.normalize(p);
    store(LS_PRESET, app.preset);
    enforceSect();
    if (C.age && !app.preset.ages.includes(C.age)) C.age = app.preset.age;
    render();
    toast(`Chronicle rules loaded${app.preset.name ? ': ' + app.preset.name : ''}${from ? ' from ' + from : ''}.`);
  }
  async function loadAny(text, from) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { obj = null; }
    if (obj && obj.kind === 'vtm-builder-character') {
      C = Object.assign(R.newChar(), obj.character || {});
      C.xp = Object.assign(R.newChar().xp, C.xp || {}); C.pred = Object.assign(R.newChar().pred, C.pred || {});
      if (obj.preset && !app.preset.locked) app.preset = PR.normalize(obj.preset);
      render({ top: true }); toast('Character loaded.'); return true;
    }
    if (obj && obj.kind === 'vtm-builder-rules') { await applyPreset(obj.preset, from); return true; }
    if (obj && obj.type === 'vampire' && obj.flags && obj.flags['vtm-builder']) {
      C = Object.assign(R.newChar(), obj.flags['vtm-builder'].character || {});
      C.xp = Object.assign(R.newChar().xp, C.xp || {}); C.pred = Object.assign(R.newChar().pred, C.pred || {});
      render({ top: true }); toast('Character loaded from its Foundry export.'); return true;
    }
    if (obj && obj.v && obj.maxDisc != null) { await applyPreset(obj, from); return true; }
    try { const p = await PR.decode(text); await applyPreset(p, from || 'code'); return true; } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ events
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.actChange && CHG[el.dataset.actChange]) return CHG[el.dataset.actChange](el, ev);
    if (el.dataset.st != null) {
      const P = app.preset; const k = el.dataset.st;
      P[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      if (k === 'sabbat') enforceSect();
      store(LS_PRESET, P); ui.mode === 'st' ? stRefresh() : render(); return;
    }
    if (el.dataset.stList) {
      const P = app.preset; const k = el.dataset.stList; const set = new Set(P[k]);
      el.checked ? set.add(el.value) : set.delete(el.value);
      P[k] = [...set]; if (k === 'ages' && !P.ages.includes(P.age)) P.age = P.ages[0] || 'neonate';
      store(LS_PRESET, P); ui.mode === 'st' ? stRefresh() : render(); return;
    }
    if (el.dataset.stGroup) {
      const P = app.preset; const ids = el.dataset.stGroup.split(','); const set = new Set(P.disabledClans);
      ids.forEach((id) => (el.checked ? set.delete(id) : set.add(id)));
      P.disabledClans = [...set]; store(LS_PRESET, P); ui.mode === 'st' ? stRefresh() : render(); return;
    }
    if (el.dataset.stBan) {
      const P = app.preset; const k = el.dataset.stBan; const set = new Set(P[k]);
      el.checked ? set.delete(el.value) : set.add(el.value);
      P[k] = [...set]; store(LS_PRESET, P); ui.mode === 'st' ? stRefresh() : render(); return;
    }
    if (el.dataset.stCap) {
      const P = app.preset; const k = el.dataset.stCap;
      if (el.value === '') delete P.discCaps[k]; else P.discCaps[k] = Math.max(0, Math.min(5, +el.value));
      store(LS_PRESET, P); ui.mode === 'st' ? stRefresh() : render(); return;
    }
    if (el.dataset.bind === 'gen') { C.gen = el.value; render(); }
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.bind && el.dataset.bind !== 'gen') { C[el.dataset.bind] = el.value; renderSummary(); renderNav(); save(); return; }
    if (el.dataset.bindSpec != null) { C.specs[+el.dataset.bindSpec].name = el.value; renderSummary(); renderNav(); save(); return; }
    if (el.dataset.bindXpspec != null) { C.xp.specs[+el.dataset.bindXpspec].name = el.value; renderSummary(); save(); return; }
    if (el.dataset.bindAdv != null) { C.adv[+el.dataset.bindAdv].note = el.value; save(); return; }
    if (el.dataset.bindPred) { C.pred[el.dataset.bindPred] = el.value; renderSummary(); save(); return; }
    if (el.dataset.bindPrednote) { C.pred.notes = C.pred.notes || {}; C.pred.notes[el.dataset.bindPrednote] = el.value; save(); return; }
    if (el.dataset.bindConv) { const [i, f] = el.dataset.bindConv.split('|'); C.convictions[+i][f] = el.value; renderSummary(); renderNav(); save(); return; }
    if (el.dataset.filter) {
      ui.q[el.dataset.filter] = el.value;
      const pos = el.selectionStart;
      if (ui.mode === 'st') renderST(); else $('#page').innerHTML = S[ui.step]();
      const again = $(`[data-filter="${el.dataset.filter}"]`); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
      return;
    }
    if (el.dataset.st != null && (el.tagName === 'TEXTAREA' || el.type === 'text' || !el.type || el.type === 'search')) { app.preset[el.dataset.st] = el.value; store(LS_PRESET, app.preset); renderShell(); }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && document.body.classList.contains('reading')) closeReader(); });

  $('#file').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const ok = await loadAny(await f.text(), f.name);
    if (!ok) toast("That file isn't a VTM Builder character, rules file or Foundry export from this builder.");
    ev.target.value = '';
  });
  $('#free-dialog').addEventListener('close', () => { if ($('#free-dialog').returnValue === 'ok') setFree(true); });
  $('#rules-dialog form').addEventListener('submit', async (ev) => {
    const d = $('#rules-dialog');
    if (ev.submitter && ev.submitter.value === 'cancel') return;
    ev.preventDefault();
    const ok = await loadAny(d.querySelector('textarea').value);
    if (ok) d.close(); else d.querySelector('.err').textContent = "That code didn't decode. Paste the whole code your Storyteller sent, or use Open file for a rules file.";
  });

  // boot
  (async function boot() {
    const m = /[#&]preset=([A-Za-z0-9_\-]+)/.exec(location.hash);
    if (m) { try { await applyPreset(await PR.decode(m[1]), 'link'); } catch (e) { toast("The chronicle link didn't decode."); } }
    if (!C.age) C.age = app.preset.age;
    enforceSect();
    if (C.bane && !R.banesFor(C).some((b) => b.id === C.bane)) defaultBane();
    if (!C.gen) { const A = R.AGES[R.ageOf(C)]; C.gen = A.gens[A.gens.length - 1]; }
    render();
  })();
})();
