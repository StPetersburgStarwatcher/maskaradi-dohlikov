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
  P.encode = async function (preset) {
    const raw = new TextEncoder().encode(JSON.stringify(preset));
    if (typeof CompressionStream === 'function') {
      try { return 'Z' + b64u(await pipe(raw, new CompressionStream('deflate-raw'))); } catch (e) { /* fall through */ }
    }
    let s = ''; raw.forEach((b) => (s += String.fromCharCode(b)));
    return 'J' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  P.decode = async function (code) {
    code = (code || '').trim();
    const m = /[#&?]preset=([A-Za-z0-9_\-]+)/.exec(code);
    if (m) code = m[1];
    if (code.startsWith('{')) return JSON.parse(code);
    const kind = code[0], body = code.slice(1);
    const bytes = unb64u(body);
    let raw = bytes;
    if (kind === 'Z') raw = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(raw));
  };
  P.normalize = function (p) {
    const d = D.rules.defaultPreset();
    const out = Object.assign(d, p || {});
    ['disabledClans', 'bannedPowers', 'bannedAdv', 'ages', 'baneKinds'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = d[k]; });
    if (!out.ages.length) out.ages = ['neonate'];
    if (!out.ages.includes(out.age)) out.age = out.ages[0];
    return out;
  };
})();
