// 바탕(띠) 후보 색의 대비와 색상각. 실행: node bg-candidates.mjs
import { ratio } from '../2026-11-25-design-tokens-poc/lib.mjs';
const toOk=(h)=>{const c=h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 const l=Math.cbrt(0.4122214708*c[0]+0.5363325363*c[1]+0.0514459929*c[2]),m=Math.cbrt(0.2119034982*c[0]+0.6806995451*c[1]+0.1073969566*c[2]),s=Math.cbrt(0.0883024619*c[0]+0.2817188376*c[1]+0.6299787005*c[2]);
 const L=0.2104542553*l+0.7936177850*m-0.0040720468*s,a=1.9779984951*l-2.4285922050*m+0.4505937099*s,b=0.0259040371*l+0.7827717662*m-0.8086757660*s;
 return {L,C:Math.hypot(a,b),h:(Math.atan2(b,a)*180/Math.PI+360)%360};};
const fg={text:'#191F28','text-sub':'#5B6470','amount-income':'#1B64DA','amount-up':'#C81E2D','border-strong':'#868E8A','primary-text':'#14573F'};
for (const [n,bg] of [['지금 background','#F4F5F3'],['TDS greyBackground','#F2F4F6'],['무채 회색','#F2F3F4']]) {
  const o=toOk(bg); console.log(`\n${n} ${bg}  OKLCH L ${o.L.toFixed(3)} C ${o.C.toFixed(4)} h ${o.h.toFixed(0)}°`);
  console.log('  '+Object.entries(fg).map(([k,v])=>`${k} ${ratio(v,bg).toFixed(2)}`).join(' · '));
}
