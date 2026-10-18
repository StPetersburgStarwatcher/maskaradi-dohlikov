import pymupdf as f, sys, json
sys.path.insert(0,'/home/claude/work')
from pdfstream import ordered
pdf,lo,hi,out,tagjson,skipjson=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4],sys.argv[5],sys.argv[6]
TAG=json.loads(tagjson); SK=json.loads(skipjson)
d=f.open(pdf)
def skip(font,size):
    for rule in SK:
        if font.startswith(rule[0]) and rule[1]<=size<=rule[2]: return True
    return False
res=[]
for pi in range(lo,hi):
    res.append(f'#### PAGE {pi}')
    for l in ordered(d[pi],skip):
        s=''
        for font,size,flags,t in l['spans']:
            tg=''
            for rule in TAG:
                if font.startswith(rule[0]) and rule[1]<=size<=rule[2]: tg=rule[3]; break
            s+=(f'<{tg}>{t}</{tg}>' if tg else t)
        res.append(f"{int(l['x'])}|{s}")
open(out,'w').write('\n'.join(res))
