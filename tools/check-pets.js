// wkshot pre-script: waits for art, then checks departures, reminders while off, and returns.
window.__shotReady=()=>{
 const grass=!!window.__grass,d=grass?__grass:__cats,animals=grass?d.pandas:d.cats,issues=[],states=[];
 const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=1350;const g=sheet.getContext('2d');
 const sources=grass?[document.getElementById('gl'),document.getElementById('ov')]:[document.querySelector('canvas')];
 const marks=[0,3,12,40,80,86,110,150,170];let idx=0;
 const capture=(t)=>{const x=idx%3*480,y=Math.floor(idx/3)*450;for(const c of sources)g.drawImage(c,x,y,480,450);g.fillStyle='#000a';g.fillRect(x,y,480,22);g.fillStyle='white';g.font='12px system-ui';g.fillText(t+'s · '+(LW.settings.pets===false?'Pets off':'Pets on')+' · '+animals.map(a=>a.state).join('/'),x+6,y+15);states.push({t,states:animals.map(a=>a.state)});idx++};
 LW.set('pets',false);capture(0);
 for(let f=1;f<=170*15;f++){
  if(f===6*15){LW.emit('calm',true);LW.emit('reminder',{kind:'stretch'});LW.emit('reminder',{kind:'breathe'});}
  if(f===20*15)LW.emit('calm',false);
  if(f===80*15){if(animals.some(a=>a.state!=='away'))issues.push('not all away after 80s');LW.emit('reminder',{kind:'stretch'});LW.emit('reminder',{kind:'breathe'});}
  if(f===82*15){if(animals.some(a=>a.state!=='away'))issues.push('reminder revived absent pet');LW.emit('calm',false);LW.set('pets',true);}
  LW.advance(1/15);
  if(animals.some(a=>!Number.isFinite(a.x)||!Number.isFinite(a.y)))issues.push('nonfinite pet');
  if(f===marks[idx]*15)capture(marks[idx]);
 }
 if(animals.some(a=>a.state==='away'))issues.push('pet did not return');
 sheet.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:99999';document.body.appendChild(sheet);
 window.__shotReport=()=>({issues:[...new Set(issues)],states});
};
