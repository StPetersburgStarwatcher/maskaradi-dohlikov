/* VTM Builder — Storyteller presets: encode/decode shareable codes */
(function () {
  'use strict';
  const D = window.VTMB;
  const P = (D.presets = {});
  const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = (s) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
  };
  async function pipe(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  // ---- compact codes (v2): letters and digits only, so chat apps can't mangle them (no _ or - for Markdown to eat)
  const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  function toB62(bytes) {
    let n = BigInt('0x01' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')); // leading 01 keeps leading zero bytes
    let out = '';
    while (n > 0n) { out = B62[Number(n % 62n)] + out; n /= 62n; }
    return out;
  }
  function fromB62(str) {
    let n = 0n;
    for (const ch of str) { const v = B62.indexOf(ch); if (v < 0) throw new Error('bad character'); n = n * 62n + BigInt(v); }
    const hex = n.toString(16);
    const h = hex.length % 2 ? '0' + hex : hex;
    const bytes = new Uint8Array(h.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.substr(i * 2, 2), 16);
    return bytes.slice(1);
  }
  // a 4-character fingerprint per clan, power or Advantage instead of its full id
  const fp = (id) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    let n = h % 14776336, o = '';
    for (let i = 0; i < 4; i++) { o = B62[n % 62] + o; n = Math.floor(n / 62); }
    return o;
  };
  const universe = {
    clans: () => D.core.clans.map((c) => c.id),
    powers: () => D.core.disciplines.flatMap((d) => d.powers).concat(Object.values(D.core.paths).flatMap((p) => (p.fx || []).concat(p.rit || []))),
    adv: () => (D.allAdv || []).map((a) => a.id),
  };
  function pack(ids, uni) {
    const known = new Set(uni);
    const h = ids.filter((id) => known.has(id)).map(fp).join('');
    const x = ids.filter((id) => !known.has(id));
    return x.length ? [h, x] : h;
  }
  function unpack(v, uni) {
    const [h, x] = Array.isArray(v) ? v : [v, []];
    const map = new Map(uni.map((id) => [fp(id), id]));
    const out = [];
    for (let i = 0; i < h.length; i += 4) { const id = map.get(h.slice(i, i + 4)); if (id) out.push(id); }
    return out.concat(x);
  }
  const LISTS = ['disabledClans', 'bannedPowers', 'bannedAdv'];
  function compact(preset) {
    const d = D.rules.defaultPreset(), o = {};
    Object.keys(preset).forEach((k) => {
      if (LISTS.includes(k) || k === 'v') return;
      if (JSON.stringify(preset[k]) !== JSON.stringify(d[k])) o[k] = preset[k];
    });
    const clans = universe.clans(), off = new Set(preset.disabledClans || []);
    // whichever is shorter: the banned clans, or the allowed ones
    if (off.size > clans.length / 2) o.ca = pack(clans.filter((id) => !off.has(id)), clans);
    else if (off.size) o.cd = pack([...off], clans);
    if ((preset.bannedPowers || []).length) o.pb = pack(preset.bannedPowers, universe.powers());
    if ((preset.bannedAdv || []).length) o.ab = pack(preset.bannedAdv, universe.adv());
    return o;
  }
  function expand(o) {
    const p = Object.assign(D.rules.defaultPreset(), o);
    const clans = universe.clans();
    if (o.ca != null) { const on = new Set(unpack(o.ca, clans)); p.disabledClans = clans.filter((id) => !on.has(id)); }
    else p.disabledClans = o.cd != null ? unpack(o.cd, clans) : [];
    p.bannedPowers = o.pb != null ? unpack(o.pb, universe.powers()) : [];
    p.bannedAdv = o.ab != null ? unpack(o.ab, universe.adv()) : [];
    ['ca', 'cd', 'pb', 'ab'].forEach((k) => delete p[k]);
    return p;
  }

  P.encode = async function (preset) {
    const raw = new TextEncoder().encode(JSON.stringify(compact(preset)));
    if (typeof CompressionStream === 'function') {
      try { return '2' + toB62(await pipe(raw, new CompressionStream('deflate-raw'))); } catch (e) { /* fall through */ }
    }
    return '3' + toB62(raw);
  };
  P.decode = async function (code) {
    code = (code || '').trim();
    const m = /[#&?]preset=([A-Za-z0-9_\-]+)/.exec(code);
    if (m) code = m[1];
    code = code.replace(/\s+/g, '');
    if (code.startsWith('{')) return JSON.parse(code);
    const kind = code[0], body = code.slice(1);
    if (kind === '2' || kind === '3') {
      let raw = fromB62(body);
      if (kind === '2') raw = await pipe(raw, new DecompressionStream('deflate-raw'));
      return expand(JSON.parse(new TextDecoder().decode(raw)));
    }
    // older codes (Z: deflate + base64url, J: base64url)
    const bytes = unb64u(body);
    let raw = bytes;
    if (kind === 'Z') raw = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(raw));
  };
  P.normalize = function (p) {
    const d = D.rules.defaultPreset();
    const out = Object.assign(d, p || {});
    ['disabledClans', 'bannedPowers', 'bannedAdv', 'bannedAdvCats', 'bannedDiscs', 'ages', 'baneKinds'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = d[k]; });
    if (!out.ages.length) out.ages = ['neonate'];
    if (!out.ages.includes(out.age)) out.age = out.ages[0];
    return out;
  };
})();
