// 주의색 후보 대비. 실행: node warning.mjs
import { ratio } from '../2026-11-25-design-tokens-poc/lib.mjs';
const L={surface:'#FFFFFF',background:'#F4F5F3','surface-alt':'#EFECEA'}, D={surface:'#1C1F1E',background:'#121413','surface-alt':'#242826'};
for (const [n,fg,soft,S] of [['라이트 warning','#A85400','#FFF3E0',L],['라이트 warning(진함)','#9A4D00','#FFF3E0',L],['다크 warning','#FFA861','#3D2500',D]]) {
  console.log(n,fg,'on soft',soft,ratio(fg,soft).toFixed(2),'|',Object.entries(S).map(([k,v])=>`${k} ${ratio(fg,v).toFixed(2)}`).join(' · '));
}
