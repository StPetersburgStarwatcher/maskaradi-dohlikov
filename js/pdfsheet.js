// Fills the "V5 Vampire 35th Anniversary — VtM Revised 2-Page Interactive" sheet from a character.
// Loaded on demand (with pdf-lib, fontkit and the sheet itself) the first time someone exports a PDF.
(function () {
  const D = window.VTMB, R = D.rules;
  const X = D.exporter;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
  const ord = (n) => (n ? n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th') : '');
  const pips = (n) => '•'.repeat(Math.max(0, n || 0));

  // ---- field names on the sheet (worked out from the form's layout)
  const row5 = (n, q) => (q ? [n, n + 1, n + 2, n + 3].map((i) => `dot${i}qb`).concat(`dot${n + 3}qab`)
    : [n, n + 1, n + 2, n + 3].map((i) => `dot${i}b`).concat(`dot${n + 3}ab`));
  const ATTR_ROW = {}; R.ATTR_LIST.forEach((a, i) => (ATTR_ROW[a] = row5(5 + 8 * i)));
  const SKILL_ROW = {}, SPEC_FIELD = {};
  [['physical', 77, 1], ['social', 157, 11], ['mental', 237, 21]].forEach(([g, start, f]) => R.SKILLS[g].forEach((s, i) => { SKILL_ROW[s] = row5(start + 8 * i); SPEC_FIELD[s] = `abilities${f + i}b`; }));
  const DISC = [ // name field, dot row, five power lines
    ['disciplineslist1', row5(149), [2, 3, 4, 5, 6]], ['disciplineslist2', row5(149, true), [8, 9, 10, 11, 12]], ['disciplineslist3', row5(309), [14, 15, 16, 17, 18]],
    ['disciplineslist4', row5(229), [20, 21, 22, 23, 24]], ['disciplineslist5', row5(229, true), [26, 27, 28, 29, 30]], ['disciplineslist6', row5(309, true), [32, 33, 34, 35, 36]],
  ];
  const BG_ROWS = [317, 325, 333, 341, 349, 357, 365, 373, 381].map((n, i) => [`backgrounds${i + 1}`, row5(n)]);
  const MERIT_ROWS = [row5(389), row5(397), row5(405), row5(541), row5(549), row5(557), row5(557, true)].map((r, i) => [`merits${i + 1}`, r]);
  const FLAW_ROWS = [row5(566), row5(574), row5(582), row5(582, true), row5(590), row5(598), row5(606)].map((r, i) => [`flaws${i + 1}`, r]);
  const HAVEN_DOTS = [1, 2, 3, 4, 5].map((i) => `havendot${i}`);
  const HAVEN_MF = [0, 1, 2, 3].map((r) => [`havenmf${r + 1}`, [1, 2, 3, 4, 5].map((i) => `havendot${5 + r * 5 + i}`)]);

  async function loadDeps() {
    const need = [];
    if (!window.PDFLib) need.push('js/vendor/pdf-lib.min.js');
    if (!window.fontkit) need.push('js/vendor/fontkit.umd.min.js');
    if (!D.sheetPdf) need.push('data/sheet-pdf.js');
    for (const src of need) {
      await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Could not load ' + src)); document.head.appendChild(s); });
    }
  }

  X.pdfSheet = async function (c) {
    await loadDeps();
    const { PDFDocument } = window.PDFLib;
    const doc = await PDFDocument.load(b64(D.sheetPdf.pdf));
    doc.registerFontkit(window.fontkit);
    const goudy = await doc.embedFont(b64(D.sheetPdf.goudy), { subset: true });
    const garamond = await doc.embedFont(b64(D.sheetPdf.garamond), { subset: true });
    const form = doc.getForm();
    const fits = (font, t) => { try { font.encodeText(t); return true; } catch (e) { return false; } };
    const fontFor = (t) => (fits(goudy, t) ? goudy : garamond);
    const notes = [];
    const done = new Set();

    const text = (name, value, size) => {
      if (value == null || value === '') return;
      const v = String(value);
      let f; try { f = form.getField(name); } catch (e) { return; }
      const font = fontFor(v);
      if (f instanceof window.PDFLib.PDFDropdown) {
        try { f.enableEditing(); } catch (e) { /* already editable */ }
        f.select(v);
      } else f.setText(v);
      let sz = size || 10;
      try { const w = f.acroField.getWidgets()[0].getRectangle().width - 4; const at1 = font.widthOfTextAtSize(v, 1); if (at1 * sz > w) sz = Math.max(6, w / at1); } catch (e) { /* no widget */ }
      try { f.setFontSize(sz); } catch (e) { /* keep auto */ }
      f.defaultUpdateAppearances(font);
      done.add(name);
    };
    const dots = (names, n) => names.forEach((nm, i) => { if (i < n) { try { form.getCheckBox(nm).check(); } catch (e) { /* missing */ } } });
    // Wrap text across a run of single-line fields; returns what didn't fit
    const wrap = (names, value, size, dry) => {
      size = size || 9;
      const words = String(value || '').split(/\s+/).filter(Boolean);
      const lines = [];
      for (const name of names) {
        let w; try { w = form.getField(name).acroField.getWidgets()[0].getRectangle().width - 4; } catch (e) { continue; }
        let line = '';
        while (words.length) {
          const next = line ? line + ' ' + words[0] : words[0];
          if (fontFor(next).widthOfTextAtSize(next, size) > w && line) break;
          line = next; words.shift();
        }
        lines.push([name, line]);
        if (!words.length) break;
      }
      if (!dry) lines.forEach(([n, l]) => l && text(n, l, size));
      return words.join(' ');
    };
    const longText = (names, value, size) => { const rest = wrap(names, value, size); if (rest) notes.push('…' + rest); };

    // ---- page 1: identity
    const mk = R.isMortalKind(c);
    const cl = mk ? null : R.clan(c.clan);
    const caste = cl && cl.castes ? ((R.casteOf(c) || {}).n || '').replace(/ Caste$/, '') : '';
    const pred = mk ? null : R.predator(c.predator);
    const dom = R.isGhoul(c) ? R.clan(c.clan) : null;
    text('name', c.name);
    text('concept', c.concept);
    text('chronicle', c.chronicle || R.preset().name);
    text('ambition', c.ambition);
    text('desire', c.desire);
    text('sire', R.isGhoul(c) && c.sire ? 'Domitor: ' + c.sire : mk ? '' : c.sire);
    if (!mk) text('generation', c.gen ? ord(c.gen) : '');
    if (cl) text('clan', cl.dn + (caste ? ` (${caste})` : ''));
    if (mk) text('clan', R.KINDS[c.kind] + (dom ? ` (${dom.dn} domitor)` : ''));
    if (pred) text('predator', pred.n);

    // attributes and skills
    R.ATTR_LIST.forEach((a) => dots(ATTR_ROW[a], R.attr(c, a)));
    const specs = R.allSpecs(c);
    R.SKILL_LIST.forEach((s) => {
      dots(SKILL_ROW[s], R.skill(c, s));
      const sp = specs.filter((x) => x.skill === s).map((x) => x.name).filter(Boolean);
      if (sp.length) text(SPEC_FIELD[s], sp.join(', '), 7.5);
    });

    // convictions and touchstones, bane
    const conv = (c.convictions || []).filter((x) => (x.c || '').trim() || (x.t || '').trim());
    if (conv.length) {
      const per = Math.max(1, Math.floor(6 / conv.length));
      conv.forEach((x, i) => {
        const names = ['TC1', 'TC2', 'TC3', 'TC4', 'TC5', 'TC6'].slice(i * per, i * per + per);
        const rest = wrap(names, [x.c, x.t].filter(Boolean).join(' — '));
        if (rest) notes.push('Conviction (cont.): ' + rest);
      });
    }
    const bane = cl && (cl.banes || []).find((b) => b.id === c.bane);
    if (bane) {
      // Mechanics only; a line of flavour goes in front when the box has room for it
      const CB = ['CB1', 'CB2', 'CB3', 'CB4', 'CB5', 'CB6'];
      const mech = bane.mech || plain(bane.html);
      const first = (plain(bane.html).match(/^.*?[.!?](\s|$)/) || [''])[0].trim();
      const isFlavor = first && !/\b(Flaws?|Merits?|dice|die|Difficulty|difficulty|Severity|rolls?|tests?|damage|Willpower|frenzy|frenzies|cannot|must|Appearance|reflections?|derangement|Embrace|\d)\b/.test(first);
      const withFlavor = isFlavor ? `${bane.title}: ${first} ${mech}` : '';
      const body = withFlavor && !wrap(CB, withFlavor, 8, true) ? withFlavor : `${bane.title}: ${mech}`;
      const rest = wrap(CB, body, 8);
      if (rest) notes.push(`Bane (cont.): …${rest}`);
    }

    // disciplines
    const powers = R.allPowerIds(c).map(R.power).filter(Boolean);
    const sorc = c.sorc.concat(c.xp.sorc || []).map(R.power).filter(Boolean);
    // The sheet's Discipline names are dropdowns pre-filled with the official list; clear them and write our own names.
    DISC.forEach(([name]) => { try { const f = form.getField(name); if (f instanceof window.PDFLib.PDFDropdown) { f.setOptions([]); try { f.enableEditing(); } catch (e) { /* ok */ } } } catch (e) { /* missing */ } });
    // One block per sheet slot: a Discipline, a Blood Sorcery Path ("Lifeblood (HT)"), or the Rituals that go with it.
    const blocks = [];
    const initials = (n) => n.replace(/\(.*?\)/g, '').split(/[\s-]+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('');
    const pathOf = (id) => Object.values(D.core.paths).find((p) => (p.fx || []).includes(id) || (p.rit || []).includes(id));
    R.activeDiscs(c).forEach((k) => {
      if (R.isSchool(k)) {
        const sc = R.school(k); const tag = initials(sc.n);
        const paths = sc.paths.map(R.path).filter((p) => p && R.pathDots(c, p.key));
        const rit = sorc.filter((p) => p.d === 'rituals').sort((a, b) => a.lv - b.lv);
        if (rit.length) blocks.push({ n: 'Rituals', dots: 0, lines: rit.map((p) => { const pa = pathOf(p.id); return `${p.n}${pa ? ` (${pa.n})` : ''}`; }) });
        paths.forEach((p) => blocks.push({ n: `${p.n} (${tag})`, dots: R.pathDots(c, p.key),
          lines: sorc.filter((x) => x.d !== 'rituals' && (p.fx || []).includes(x.id)).sort((a, b) => a.lv - b.lv).map((x) => x.n) }));
        // effects that don't belong to a Path the character has dots in
        const loose = sorc.filter((x) => x.d !== 'rituals' && !paths.some((p) => (p.fx || []).includes(x.id)));
        if (loose.length) notes.push(`${sc.n} effects: ${loose.map((x) => x.n).join(', ')}.`);
      } else blocks.push({ n: R.discName(k), dots: R.discTotal(c, k), lines: powers.filter((p) => p.d === k).sort((a, b) => a.lv - b.lv).map((p) => p.n) });
    });
    blocks.forEach((b, i) => {
      const slot = DISC[i];
      if (!slot) { notes.push(`${b.n}${b.dots ? ' ' + pips(b.dots) : ''}: ${b.lines.join(', ')}.`); return; }
      try { const f = form.getField(slot[0]); if (f instanceof window.PDFLib.PDFDropdown) f.setOptions([b.n]); } catch (e) { /* text field */ }
      text(slot[0], b.n);
      dots(slot[1], b.dots);
      b.lines.slice(0, 5).forEach((l, j) => text('disciplines' + slot[2][j], l));
      if (b.lines.length > 5) notes.push(`${b.n} (cont.): ${b.lines.slice(5).join(', ')}.`);
    });

    // humanity, blood potency, hunting
    dots([31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map((i) => 'check' + i), R.humanity(c));
    const bp = R.bp(c), B = R.BP[bp];
    if (!mk) {
    dots([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => 'hdot' + i), bp);
    text('BPstat1', `Add ${B.surge} ${B.surge === 1 ? 'die' : 'dice'}`);
    text('BPstat2', `${B.mend} Superficial`);
    text('BPstat3', B.bonus ? `Add ${B.bonus}` : 'None');
    text('BPstat4', B.reroll ? `Level ${B.reroll}` : 'None');
    text('BPstat5', B.feed, 7);
    text('BPstat6', String(B.bane));
    }
    if (pred && pred.pool) text('hunting1', pred.pool.split(':')[0].trim(), 8);

    // ---- page 2: advantages
    const isHaven = (A) => R.bgGroup(A) === 'Haven';
    const bgRows = [], meritRows = [], flawRows = [], havenRows = [];
    let havenDots = 0, havenNote = '', noHaven = false;
    const label = (n, note) => n + (note ? ` (${note})` : '');
    c.adv.forEach((x) => {
      const A = R.adv(x.id); if (!A) return;
      if (A.n === 'Haven') { havenDots = Math.max(havenDots, x.dots); havenNote = x.note || havenNote; return; }
      if (/^no haven$/i.test(A.n)) noHaven = true;
      if (A.id === 'v5-allies' && x.eff != null) { bgRows.push([label('Allies (Effectiveness)', x.note), x.eff]); bgRows.push([label('Allies (Reliability)', x.note), x.rel]); return; }
      const row = [label(A.n, x.note), x.dots, A.kind];
      if (isHaven(A)) havenRows.push([label(A.n + (A.kind === 'flaw' ? ' (Flaw)' : ''), x.note), x.dots]);
      else if (R.isBgEntry(A)) bgRows.push(row);
      else (A.kind === 'flaw' ? flawRows : meritRows).push(row);
    });
    R.predGrants(c).forEach((g) => {
      const A = R.adv(g.id);
      const row = [label(g.n, g.note), g.dots];
      if (g.n === 'Haven') { havenDots = Math.max(havenDots, g.dots); return; }
      if (A && isHaven(A)) havenRows.push(row);
      else if (A ? R.isBgEntry(A) : R.BG_GROUPS.includes(g.n)) bgRows.push(row);
      else if ((A && A.kind === 'flaw') || /flaws?$/i.test(g.n)) flawRows.push(row);
      else meritRows.push(row);
    });
    const fill = (rows, slots, title) => {
      rows.forEach(([n, d], i) => {
        if (i < slots.length) { text(slots[i][0], n); dots(slots[i][1], d); } else notes.push(`${title}: ${n} ${pips(d)}`);
      });
    };
    fill(bgRows, BG_ROWS, 'Background');
    fill(meritRows, MERIT_ROWS, 'Merit');
    fill(flawRows, FLAW_ROWS, 'Flaw');
    fill(havenRows, HAVEN_MF, 'Haven');
    if (havenDots) dots(HAVEN_DOTS, havenDots);
    if (havenNote) text('haven1', havenNote);
    if (noHaven) { try { form.getCheckBox('havencheck1').check(); } catch (e) { /* none */ } }

    // experience
    const total = R.xpTotal(c), spent = sum(R.xpSpent(c).map((r) => r[1]));
    if (total || spent) { text('exp1', String(total)); text('exp2', String(spent)); }

    // biography
    if (c.appearance) longText(['bio5', 'bio6', 'bio7', 'bio8', 'bio9', 'bio10'], c.appearance);
    if (c.history) longText(Array.from({ length: 14 }, (_, i) => 'bio' + (16 + i)), c.history);

    // notes: whatever didn't fit, plus a few things the sheet has no box for
    if (c.sabbat) notes.unshift('Sabbat.');
    if (c.kind && c.kind !== 'vampire') notes.unshift(R.KINDS[c.kind] + (R.tmpl(c).attrs ? `, ${R.tmpl(c).label} template` : '') + '.');
    R.companionSlots(c).forEach((slot) => { const n = (c.npcs || {})[slot.key]; if (n && n.mode) notes.push(R.npcSummary(c, slot, n)); });
    if (c.notes) notes.push(c.notes);
    if (notes.length) {
      const rest = wrap(Array.from({ length: 13 }, (_, i) => 'notes' + (i + 1)), notes.join(' '), 8);
      if (rest) { const f = form.getTextField('notes13'); f.setText((f.getText() || '').replace(/\s*\S*$/, '') + ' …'); f.defaultUpdateAppearances(fontFor(rest)); }
    }
    return doc.save({ updateFieldAppearances: false });
  };
})();
