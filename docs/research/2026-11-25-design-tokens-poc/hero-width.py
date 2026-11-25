# 질문 10: 큰 숫자 넘침. Pretendard Bold, 숫자 폭 고정(tnum), 자간 -0.5pt로 금액 문자열 폭을 잰다.
# 실행: <venv>/bin/python -I hero-width.py <Pretendard-Bold.otf>
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1]); cmap = f.getBestCmap(); hmtx = f['hmtx']; upm = f['head'].unitsPerEm
gsub = f['GSUB'].table; tnum = {}
for fr in gsub.FeatureList.FeatureRecord:
    if fr.FeatureTag == 'tnum':
        for li in fr.Feature.LookupListIndex:
            for st in gsub.LookupList.Lookup[li].SubTable:
                if hasattr(st, 'mapping'): tnum.update(st.mapping)
def width(s, size, track=-0.5):
    w = 0
    for ch in s:
        g = cmap.get(ord(ch)); g = tnum.get(g, g); w += hmtx[g][0] / upm * size + track
    return w - track
# iOS largeTitle·body 크기(기본 Large 34·17 기준). 우리 hero 32, amount 17은 같은 비율로 커진다고 본다.
lt = {'L': 34, 'xxxL': 40, 'AX1': 44, 'AX3': 52, 'AX5': 60}; bd = {'L': 17, 'xxxL': 23, 'AX1': 28, 'AX3': 40, 'AX5': 53}
avail = 375 - 16 * 2 - 16 * 2  # SE 폭 - 화면 여백 - 카드 안 여백
cases = ['1,284,500원', '12,845,000원', '−128,450,000원', '1,234,567,890원', '−12,345,678,900원']
print(f'가용 폭 {avail}pt')
for k in lt:
    hero = 32 * lt[k] / 34; amt = 17 * bd[k] / 17
    row = []
    for s in cases:
        w = width(s, hero); need = min(1, avail / w)
        row.append(f"{s} {w:.0f}pt→{'그대로' if need >= 1 else f'{need:.2f}배'}")
    print(f'[{k}] hero {hero:.1f} · 목록 금액 {amt:.0f} · 하한 배율 {amt / hero:.2f}\n   ' + '\n   '.join(row))

# 비교안: 흔한 방식(큰 숫자 커지는 상한 44pt + 고정 하한 0.7배). 상한이 있으면 두 줄이 필요한지 본다.
print('\n[상한 44pt + 하한 0.7]')
for s in cases:
    w = width(s, 44); need = min(1, avail / w)
    print(f"  {s} 44pt에서 {w:.0f}pt → {'그대로' if need >= 1 else f'{need:.2f}배'}{' (두 줄)' if need < 0.7 else ''}")
