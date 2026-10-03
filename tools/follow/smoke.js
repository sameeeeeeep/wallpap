window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);P.initialized=true;
 const hero=P.items.find(p=>p.kind==='cat')||P.items[0],S=P.stage;let time=0,released=false,events=[],bad=[];
 for(const p of P.items){p.away=p.gone=true;p.mission='qa-hidden';p.j=null;p.path=null;p.goal=null;}
 const q=P.project(hero,(S.bounds[0]+S.bounds[2])*.5,(S.bounds[1]+S.bounds[3])*.5);
 if(!q)throw Error('No smoke floor');P.forceWalk(hero.id,...q,{from:q});hero.mission='qa';
 const start=[hero.x,hero.y],step=P.step;
 function screen(x,y){const cv=document.querySelector('canvas'),r=cv.getBoundingClientRect(),g=hero.kind==='panda'?null:cv.getContext('2d'),m=g?.getTransform();return m?[(m.a*x+m.c*y+m.e)/cv.width*r.width,(m.b*x+m.d*y+m.f)/cv.height*r.height]:[LW.layout?.side==='left'?r.width-x:x,y];}
 function tap(){const [x,y]=screen(hero.x,hero.y-hero.spec.height*hero.k*.4);__lw('move',x,y);__lw('down',x,y);events.push({time,picked:hero.picked});}
 LW.advance(1/30);tap();let [x,y]=screen(q[0]+270,q[1]+55);__lw('move',x,y);
 P.step=(dt,t)=>{time+=dt;if(time>5&&!released){tap();released=true;}step(dt,t);if(P.overlaps().length)bad.push(P.overlaps());};
 window.__shotReport=()=>({time,events,bad,start,pet:{id:hero.rosterId,picked:hero.picked,x:hero.x,y:hero.y,state:hero.state,frame:P.frame(hero)?.key},errors:__errs});
};
