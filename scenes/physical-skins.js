// Music installations: bounded smoke-ring model, analytic ripple interference and pendulum revival.
// No private clock/RAF: the owning scene updates LW.mx and calls tick exactly once per frame.
(function(root){
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(v,t,dt)=>v+(t-v)*(1-Math.exp(-dt/2));
function pendulumAngle(i,phase,amplitude){return amplitude*Math.cos(TAU*(23+i)*phase);}
function rosetteAt(t,s){
 const a=s.A*.56,b=s.A*.44;
 let x=a*Math.sin(s.f1*t+s.p[0])+b*Math.sin(s.f2*t+s.p[1]);
 let y=a*Math.sin(s.f1*t+s.p[0]+s.k1)+b*Math.sin(s.f2*t+s.p[1]+s.spin*s.k2);
 if(s.R3>0){x+=s.R3*Math.cos(s.f3*t);y+=s.R3*Math.sin(s.f3*t);}
 return [x,y];
}
function create(parent){
 const el=document.createElement('div');el.style.cssText='position:fixed;inset:0;display:none;pointer-events:none';parent.appendChild(el);
 const cv=document.createElement('canvas'),pc=document.createElement('canvas');el.append(cv,pc);
 for(const c of [cv,pc])c.style.cssText='position:absolute;inset:0;width:100%;height:100%';
 const gl=cv.getContext('webgl2',{alpha:false,antialias:false}),g=pc.getContext('2d');
 let mode='',time=0,lastRing=-99,phase=0,period=64,amp=.3,energy=0,bright=.4,sourcePhase=0,wasPlaying=false;
 const rings=[],sources=Array.from({length:4},(_,i)=>({x:0,y:0,pc:i*3,a:i===0?1:0}));
 let program,loc={};
 const vs=`#version 300 es
 void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
 const fs=`#version 300 es
 precision highp float;
 uniform vec2 size,center;uniform float radius,t,energy,bright;uniform int mode;
 uniform vec4 rings[5],sources[4];uniform vec3 accent;out vec4 color;
 float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1)),f.x),f.y),f.z);}
 void main(){
 vec2 px=vec2(gl_FragCoord.x,size.y-gl_FragCoord.y),p=(px-center)/radius;
 vec3 col=vec3(.025,.031,.04);float vign=exp(-dot(p,p)*.35);
 if(mode==1){
  // The projected caustic field: sum cylindrical waves before shading, so intersections interfere.
  float h=0.,lap=0.;vec2 grad=vec2(0);
  for(int i=0;i<4;i++){vec4 s=sources[i];vec2 d=p-s.xy;float r=length(d)+.04;
   float k=18.+bright*8.+s.z*.36,w=k*r-t*(2.1+s.z*.045);
   float a=s.w*exp(-r*.75)/sqrt(1.+r*7.);h+=a*sin(w);lap-=a*k*k*sin(w);grad+=a*k*cos(w)*d/r;
  }
  float edge=1.-smoothstep(1.02,1.08,max(abs(p.x),abs(p.y*.82)));
  float light=clamp(.55-lap*.003*(.45+energy*.35)+dot(grad,vec2(.012,-.02)),.08,.94);
  vec3 water=mix(vec3(.19,.28,.28),vec3(.71,.80,.74),light)*(.7+.3*vign);
  col=mix(col,water,edge);float rim=exp(-pow((max(abs(p.x),abs(p.y*.82))-1.065)*90.,2.));col+=vec3(.2,.24,.23)*rim;
 }else{
  // Integrate a lit toroidal density field. Rings travel along one common axis.
  float alpha=0.;vec3 smoke=vec3(0.);
  if(abs(p.x)<1.6&&abs(p.y)<1.3){for(int j=0;j<56;j++){
   float z=-1.25+float(j)*.046;vec3 q=vec3(p,z);
   q.xz=mat2(.82,-.57,.57,.82)*q.xz;
   float den=0.,lit=0.;
   for(int i=0;i<5;i++){vec4 r=rings[i];if(r.w<.001)continue;
    vec3 v=q-vec3(r.x,0,0);float angle=atan(v.y,v.z);
    float rr=r.y*(1.+energy*.05*sin(angle*7.+t*.7));
    float core=length(vec2(length(v.yz)-rr,v.x));
    float n=noise(v*18.+vec3(t*.15,0,-t*.3));
    float tube=.045+r.z*.02;float d=exp(-pow(core/tube,2.))*(.35+.65*n)*r.w;
    den+=d;lit+=d*(.48+.45*clamp(-v.y/max(rr,.1),-1.,1.)+.1*n);
   }
   float a=1.-exp(-den*.45);smoke+=(1.-alpha)*a*(vec3(.64,.69,.73)+accent*.08)*clamp(lit/max(den,.001)+.3,.1,1.2);alpha+=(1.-alpha)*a;
  }}
  col+=smoke+vec3(.015,.021,.027)*vign;
 }
 col*=.8+.2*exp(-dot(p,p)*.12);color=vec4(pow(max(col,vec3(0)),vec3(.8)),1);
 }`;
 if(gl){
  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  for(const n of ['size','center','radius','t','energy','bright','mode','rings','sources','accent'])loc[n]=gl.getUniformLocation(program,n);
 }
 function zone(){
  const w=innerWidth,h=innerHeight,l=LW.layout||{},clear=l.clear||[0,.72];let x0=clear[0]*w,x1=clear[1]*w,y0=h*.13,y1=h*.80;
  // Choose the largest free rectangle around each avoid box, preserving a useful portrait/landscape hero.
  for(const [ax,ay,aw,ah] of l.avoid||[]){const a=ax*w,b=ay*h,c=(ax+aw)*w,d=(ay+ah)*h;if(c<=x0||a>=x1||d<=y0||b>=y1)continue;
   const options=[[x0,y0,Math.min(x1,a),y1],[Math.max(x0,c),y0,x1,y1],[x0,y0,x1,Math.min(y1,b)],[x0,Math.max(y0,d),x1,y1]];
   options.sort((a,b)=>Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1])-Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]));[x0,y0,x1,y1]=options[0];
  }
  return {w,h,cx:(x0+x1)/2,cy:(y0+y1)/2,r:Math.max(1,Math.min((x1-x0)*.36,(y1-y0)*.4)),x0,x1,y0,y1};
 }
 function release(strength=.3){if(time-lastRing<2.4||rings.length>=5)return;lastRing=time;rings.push({x:-1.1,r:.38+strength*.1,v:.065+strength*.025,age:0,strength});}
 LW.mx.on('kick',s=>{if(mode==='vortex'&&LW.mx.playing&&!LW.calm)release(s);});
 LW.mx.on('phrase',()=>{if(mode==='pendulum')period=clamp(60/Math.max(40,LW.mx.bpm)*64,24,120);});
 LW.mx.on('drop',()=>{if(mode==='vortex'){release(.9);}if(mode==='pendulum')phase=0;});
 function set(name){mode=name;el.style.display=name?'block':'none';cv.style.display=name==='pendulum'?'none':'block';pc.style.display=name==='pendulum'?'block':'none';}
 function tick(dt){
  if(!mode)return;dt=clamp(dt,0,.1);time+=dt;const m=LW.mx,z=zone();LW.breathLabelAt=[z.cx/z.w,Math.min(.9,(z.cy+z.r*1.4)/z.h)];energy=smooth(energy,m.playing?m.energy:0,dt);bright=smooth(bright,m.bright,dt);
  if(mode==='pendulum'){
   if(m.playing&&!wasPlaying){phase=0;period=clamp(60/Math.max(40,m.bpm)*64,24,120);}wasPlaying=m.playing;
   const br=LW.breathState(LW.breathTime()),target=LW.calm?.16+br.level*.08:.28+energy*.23;amp=smooth(amp,target,dt);
   phase=(phase+dt/(LW.calm?40:period))%1;
   const dpr=Math.min(1.5,devicePixelRatio||1);if(pc.width!==Math.round(z.w*dpr)||pc.height!==Math.round(z.h*dpr)){pc.width=Math.round(z.w*dpr);pc.height=Math.round(z.h*dpr);}g.setTransform(dpr,0,0,dpr,0,0);
   g.fillStyle='#090b0f';g.fillRect(0,0,z.w,z.h);const wash=g.createRadialGradient(z.cx,z.cy,0,z.cx,z.cy,z.r*2.2);wash.addColorStop(0,'#25231f');wash.addColorStop(1,'#090b0f');g.fillStyle=wash;g.fillRect(0,0,z.w,z.h);
   const span=z.r*2.25,top=z.cy-z.r*.9;
   g.strokeStyle='#69553e';g.lineWidth=5;g.beginPath();g.moveTo(z.cx-span*.6,top-12);g.lineTo(z.cx+span*.6,top+24);g.stroke();
   for(let i=0;i<15;i++){
    const length=z.r*(2.1*Math.pow(23/(23+i),2)),anchor=z.cx-span*.5+i*span/14,ay=top+i*2.4;
    const a=pendulumAngle(i,phase,amp),x=anchor+Math.sin(a)*length,y=ay+Math.cos(a)*length;
    g.strokeStyle='rgba(190,180,159,.6)';g.lineWidth=.7;g.beginPath();g.moveTo(anchor,ay);g.lineTo(x,y);g.stroke();
    const r=z.r*.032*(1+(m.chroma[i%12]||0)*.08),gr=g.createRadialGradient(x-r*.35,y-r*.45,r*.04,x,y,r);gr.addColorStop(0,'#ead6a0');gr.addColorStop(.3,'#a78043');gr.addColorStop(.75,'#4b351b');gr.addColorStop(1,'#c29c57');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
   }
   return;
  }
  if(!gl)return;
  if(mode==='vortex'){
   const br=LW.breathState(LW.breathTime());
   if(LW.calm){if(br.phase==='out'&&tick.lastBreath!=='out')release(.2);tick.lastBreath=br.phase;}
   else if(time-lastRing>(m.playing?5.5:9))release(m.playing?energy:.25);
   for(const a of rings){let vx=a.v,vr=.0015;for(const b of rings){if(a===b)continue;const dx=a.x-b.x,den=Math.pow(dx*dx+b.r*b.r+.03,1.5);vx+=.009*b.r*b.r/den;vr+=.004*dx/den;}
    a.x+=vx*dt;a.r=clamp(a.r+vr*dt,.18,.62);a.age+=dt;}
   while(rings.length&&(rings[0].x>1.7||rings[0].age>38))rings.shift();
  }
  sourcePhase+=dt*.05;
  const ranked=Array.from(m.chroma,(a,pc)=>({a,pc})).sort((a,b)=>b.a-a.a);
  for(let i=0;i<4;i++){const s=sources[i],r=ranked[i],active=m.playing&&!LW.calm;
   const angle=TAU*((r.pc*7)%12)/12; s.x=smooth(s.x,active?Math.cos(angle)*.46:0,dt);s.y=smooth(s.y,active?Math.sin(angle)*.46:0,dt);s.pc=smooth(s.pc,active?r.pc:0,dt);s.a=smooth(s.a,active?r.a*(i<3?1:.5):(i===0?.32:0),dt);
  }
  const scale=Math.min(1,960/z.w,640/z.h),w=Math.round(z.w*scale),h=Math.round(z.h*scale);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}gl.viewport(0,0,w,h);gl.useProgram(program);
  gl.uniform2f(loc.size,w,h);gl.uniform2f(loc.center,z.cx*scale,z.cy*scale);gl.uniform1f(loc.radius,z.r*scale);gl.uniform1f(loc.t,time);gl.uniform1f(loc.energy,energy);gl.uniform1f(loc.bright,bright);gl.uniform1i(loc.mode,mode==='ripple'?1:0);
  const rs=new Float32Array(20);rings.forEach((r,i)=>rs.set([r.x,r.r,r.strength,Math.min(1,r.age/2)*Math.min(1,(38-r.age)/8)*Math.min(1,(1.7-r.x)/.4)],i*4));gl.uniform4fv(loc.rings,rs);
  gl.uniform4fv(loc.sources,new Float32Array(sources.flatMap(s=>[s.x,s.y,s.pc,s.a])));gl.uniform3fv(loc.accent,m.pal.accent);gl.drawArrays(gl.TRIANGLES,0,3);
 }
 return {el,set,tick,zone,rings,bench(n=30){const start=new Event('bench').timeStamp;for(let i=0;i<n;i++){tick(1/30);if(gl&&mode!=='pendulum')gl.finish();}return {mode,ms:(new Event('bench').timeStamp-start)/n};},get phase(){return phase},get period(){return period},get mode(){return mode}};
}
root.PhysicalSkins={create,pendulumAngle,rosetteAt};
if(typeof module!=='undefined')module.exports=root.PhysicalSkins;
})(typeof window!=='undefined'?window:globalThis);
