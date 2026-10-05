// Isolated WebKit comparison. Actual production loader/pose selector and atlases.
// Equal cycle duration makes the approved side phase a direct motion reference.
window.__shotReady=()=>{
 const P=window.__pets;for(let i=0;i<4;i++)LW.advance(1/30);
 const original=P.items.find(p=>p.rosterId===(window.__qaCoat||'orange')),asset=original.asset;
 const canvas=document.createElement('canvas');canvas.width=1260;canvas.height=600;
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'1260px',height:'600px',zIndex:'999999'});document.body.append(canvas);
 const g=canvas.getContext('2d'),views=['side','near','far'],zoom=3.8,unit=asset.unit,period=1;
 let t=0;const pets=views.map((view,i)=>({asset,state:'move',gait:'walk',gd:0,dir:1,turn:null,_catDir:{view,face:1,octant:[0,1,7][i]},_catRest:'stand',_catMotion:{distance:0,phase:0,gait:'walk'}}));
 function draw(){
  g.fillStyle='#e3e9e6';g.fillRect(0,0,1260,600);g.fillStyle='#17272e';g.fillRect(0,0,1260,58);
  g.fillStyle='#ffffff';g.font='20px -apple-system';g.fillText((window.__qaCoat||'orange').toUpperCase()+' | approved side / diagonal v3 | '+(t<7.5?'right-facing':'mirrored (cut at 7.5s)'),20,36);
  pets.forEach((p,j)=>{
   const view=views[j],stride=asset.clips['walk-'+view].stride,face=t<7.5?1:-1;
   p._catDir.face=face;p.gd=t*stride/period;LW.cats.pose(p,1/30);
   g.save();g.beginPath();g.rect(j*420,58,420,542);g.clip();g.translate(j*420,0);
   g.fillStyle=j===1?'#d8e2dd':j===2?'#dfe5df':'#e9ede8';g.fillRect(0,58,420,542);
   g.fillStyle='#263b43';g.font='20px -apple-system';g.fillText(['APPROVED SIDE','TOWARD DIAGONAL','AWAY DIAGONAL'][j],18,93);
   g.font='16px -apple-system';g.fillText('frame '+p.spP.split('-').pop()+' / 8  |  phase '+p._catMotion.phase.toFixed(2),18,123);
   const vx=(view==='side'?1:Math.SQRT1_2)*stride*zoom,vy=(view==='side'?0:(view==='near'?1:-1)*Math.SQRT1_2*.55)*stride*zoom;
   const tx=((t*vx*face)%70+70)%70,ty=((t*vy)%70+70)%70;
   g.strokeStyle='#c2cec7';g.lineWidth=1;
   for(let x=-70;x<500;x+=70){g.beginPath();g.moveTo(x-tx,180);g.lineTo(x-tx,550);g.stroke();}
   for(let y=160;y<630;y+=70){g.beginPath();g.moveTo(0,y-ty);g.lineTo(420,y-ty);g.stroke();}
   const im=asset.img[p.spP],ax=im.petContact.x,ay=im.petContact.y,scale=unit*zoom;
   g.translate(210,440);g.scale(face*scale,scale);g.drawImage(im,-ax,-ay);g.restore();
   g.fillStyle='#30454d';g.font='15px -apple-system';g.fillText('1 cycle/s | '+stride.toFixed(2)+' floor units/cycle',j*420+18,560);
  });
  g.fillStyle='#263b43';g.font='14px -apple-system';g.fillText('Production sprite frames; moving floor grid follows each measured stride. No interpolation or hidden foot correction.',18,589);
 }
 const advance=LW.advance.bind(LW);LW.advance=(dt,fps)=>{advance(dt,fps);t+=dt;draw();};draw();
 window.__shotReport=()=>({time:t,coat:window.__qaCoat,rect:[0,0,1260,600],poses:pets.map(p=>({pose:p.spP,phase:p._catMotion.phase,distance:p.gd,face:p.dir})),errors:__errs});
};
