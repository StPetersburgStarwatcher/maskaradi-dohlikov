import { ClassicLevel } from 'classic-level';
import fs from 'fs';
const packs = fs.readdirSync('packs');
fs.mkdirSync('dump', {recursive:true});
for (const p of packs) {
  const db = new ClassicLevel('packs/'+p, {valueEncoding:'json'});
  const out = {};
  for await (const [k,v] of db.iterator()) out[k]=v;
  await db.close();
  fs.writeFileSync('dump/'+p+'.json', JSON.stringify(out,null,1));
  const keys = Object.keys(out);
  const prefixes = {};
  keys.forEach(k=>{const pre=k.split('!').slice(0,2).join('!'); prefixes[pre.split('!')[1]?'!'+pre.split('!')[1]:pre]=(prefixes['!'+pre.split('!')[1]]||0)+1});
  console.log(p, keys.length, JSON.stringify(prefixes));
}
