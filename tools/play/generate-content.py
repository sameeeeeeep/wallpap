#!/usr/bin/env python3
"""Offline reproducible fill generator. Inputs are vendored SCOWL and original reviewed clues."""
from pathlib import Path
import json,random,re,hashlib,datetime,collections
ROOT=Path(__file__).resolve().parents[2]
HERE=ROOT/'tools/play'
rng=random.Random(20261004)
words=set();levels={}
for f in sorted((HERE/'sources').glob('*words.*')):
    for w in f.read_text(encoding='latin1').splitlines():
        if re.fullmatch('[a-z]+',w):
            words.add(w.upper());levels[w.upper()]=min(levels.get(w.upper(),100),int(f.suffix[1:]))
answers=(HERE/'answers.txt').read_text().upper().split()
assert len(answers)==len(set(answers)) and len(answers)>=731
assert all(w in words and len(w)==5 and levels[w]<=35 for w in answers)
rng.shuffle(answers)
data=ROOT/'scenes/play/cards/word-of-the-day/data';data.mkdir(parents=True,exist_ok=True)
(data/'words.json').write_text(json.dumps(dict(answers=answers,guesses=sorted(w for w in words if len(w)==5)),separators=(',',':'))+'\n')
clues={w.strip().upper():c.strip() for w,c in (line.split('|',1) for line in (HERE/'clues.txt').read_text().splitlines() if line.strip())}
clues={w:c for w,c in clues.items() if levels.get(w,100)<=35}
# Every white square is checked in both directions, all entries length >=3,
# rotational symmetry and a connected fill. Alternate the mirrored block pattern.
patterns=['...##...##.....##...##...','##...##...........##...##']
assert all(len(p)==25 for p in patterns)
def slots_for(pattern):
    slots=[];starts={}
    for i,ch in enumerate(pattern):
        if ch=='#':continue
        for direction,step in [('across',1),('down',5)]:
            start=(i%5==0 or pattern[i-1]=='#') if step==1 else (i<5 or pattern[i-5]=='#')
            if not start:continue
            indices=[];j=i
            while j<25 and pattern[j]!='#' and (step==5 or j//5==i//5):indices.append(j);j+=step
            assert len(indices)>=3
            starts[i]=None;slots.append(dict(direction=direction,cells=indices))
    numbers={i:n+1 for n,i in enumerate(sorted(starts))}
    for s in slots:s['number']=numbers[s['cells'][0]]
    return slots
bylen={n:[w for w in sorted(clues) if len(w)==n] for n in [3,5]}
def fill(pattern,slots):
    board=list(pattern);used=set();chosen={};visits=0
    def search():
        nonlocal visits
        visits+=1
        if visits>10000:return False
        if len(chosen)==len(slots):return True
        options=[]
        for k,s in enumerate(slots):
            if k in chosen:continue
            opts=[w for w in bylen[len(s['cells'])] if w not in used and all(board[i]=='.' or board[i]==w[j] for j,i in enumerate(s['cells']))]
            if not opts:return False
            options.append((len(opts),rng.random(),k,opts))
        _,_,k,opts=min(options);rng.shuffle(opts);cells=slots[k]['cells']
        for w in opts:
            prev=[board[i] for i in cells]
            for i,c in zip(cells,w):board[i]=c
            used.add(w);chosen[k]=w
            if search():return True
            used.remove(w);del chosen[k]
            for i,c in zip(cells,prev):board[i]=c
        return False
    if not search():return None
    return ''.join(board),[{**s,'answer':chosen[k],'clue':clues[chosen[k]],'level':levels[chosen[k]]} for k,s in enumerate(slots)]
puzzles=[];seen=set();attempts=0
while len(puzzles)<365:
    attempts+=1
    pattern=patterns[len(puzzles)%len(patterns)];slots=slots_for(pattern);result=fill(pattern,slots)
    if not result:continue
    solution,entries=result
    if solution in seen:continue
    seen.add(solution);day=str(datetime.date(2026,1,1)+datetime.timedelta(days=len(puzzles)))
    puzzles.append(dict(day=day,solution=solution,entries=entries))
    if len(puzzles)%50==0:print('generated',len(puzzles),flush=True)
data=ROOT/'scenes/play/cards/crossword-of-the-day/data';data.mkdir(parents=True,exist_ok=True)
(data/'2026.json').write_text(json.dumps(puzzles,separators=(',',':'))+'\n')
report={'generatorSeed':20261004,'days':len(puzzles),'uniqueGrids':len(seen),'answers':len(answers),'crosswordWords':len({e['answer'] for p in puzzles for e in p['entries']}),'maxScowlLevel':35,'attempts':attempts,'allCellsCheckedBothDirections':True,'clues':'Original Codex-authored clues; reviewed against the answer and crossing letters; no external clue corpus.','sourceSHA256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((HERE/'sources').glob('*words.*'))}}
(HERE/'content-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
