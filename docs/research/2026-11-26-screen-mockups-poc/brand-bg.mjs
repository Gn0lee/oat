// 브랜드 기준 바탕(띠) 후보: OKLCH로 밝기는 TDS 띠와 같게, 색상각만 바꾼다. 실행: node brand-bg.mjs
import { ratio } from '../2026-11-25-design-tokens-poc/lib.mjs';
const lin=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4, gam=v=>v<=0.0031308?12.92*v:1.055*v**(1/2.4)-0.055;
export const toOk=(h)=>{const c=h.slice(1).match(/../g).map(x=>lin(parseInt(x,16)/255));
 const l=Math.cbrt(0.4122214708*c[0]+0.5363325363*c[1]+0.0514459929*c[2]),m=Math.cbrt(0.2119034982*c[0]+0.6806995451*c[1]+0.1073969566*c[2]),s=Math.cbrt(0.0883024619*c[0]+0.2817188376*c[1]+0.6299787005*c[2]);
 const L=0.2104542553*l+0.7936177850*m-0.0040720468*s,a=1.9779984951*l-2.4285922050*m+0.4505937099*s,b=0.0259040371*l+0.7827717662*m-0.8086757660*s;
 return {L,C:Math.hypot(a,b),h:(Math.atan2(b,a)*180/Math.PI+360)%360};};
export const fromOk=(L,C,h)=>{const a=C*Math.cos(h*Math.PI/180),b=C*Math.sin(h*Math.PI/180);
 const l=(L+0.3963377774*a+0.2158037573*b)**3,m=(L-0.1055613458*a-0.0638541728*b)**3,s=(L-0.0894841775*a-1.2914855480*b)**3;
 const r=[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960771*l-0.7034186147*m+1.7076147010*s];
 return '#'+r.map(v=>Math.round(Math.min(1,Math.max(0,gam(v)))*255).toString(16).padStart(2,'0')).join('').toUpperCase();};
const pine=toOk('#14573F'), tds=toOk('#F2F4F6'), tdsD=toOk('#101013');
console.log('Pine 색상각', pine.h.toFixed(0), '| TDS 띠 L', tds.L.toFixed(3), '| TDS 다크 띠 L', tdsD.L.toFixed(3));
const cands={
 '귀리(지금)':['#F4F5F3','#121413'],
 'Pine 회색':[fromOk(tds.L,0.006,pine.h),fromOk(tdsD.L+0.012,0.006,pine.h)],
 'Linen':['#EFECEA',fromOk(tdsD.L+0.012,0.006,toOk('#EFECEA').h)],
 'TDS':['#F2F4F6','#101013'],
};
const fg={'text-sub':'#5B6470','amount-income':'#1B64DA','border-strong':'#868E8A'};
for (const [n,[l,d]] of Object.entries(cands)) { const o=toOk(l);
 console.log(`${n} 라이트 ${l} (h ${o.h.toFixed(0)}° C ${o.C.toFixed(4)}) 다크 ${d} | `+Object.entries(fg).map(([k,v])=>`${k} ${ratio(v,l).toFixed(2)}`).join(' · ')+` | 다크 text-sub #8E9592 ${ratio('#8E9592',d).toFixed(2)}`);}
