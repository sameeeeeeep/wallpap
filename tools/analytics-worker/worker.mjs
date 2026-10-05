// No request headers, IP, cookies, identifiers, body logs or per-request records are stored.
export const events=new Set(['play_open','card_open:word-of-the-day','card_open:crossword-of-the-day','card_open:news','puzzle_complete:word-of-the-day','puzzle_complete:crossword-of-the-day','news_click',
  'active','panel_open','breathe_start','music_on','soundscape_on','water_reminder_on','breathe_reminder_on','scene_action']);
export const allowedEvent=e=>events.has(e)||/^scene:[a-z0-9-]{1,32}$/.test(e);
export function validateBatch(b,now=new Date()){
  if(!b||Array.isArray(b)||Object.keys(b).sort().join()!=='appVersion,counts,day')return false;
  if(typeof b.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.day))return false;
  const date=Date.parse(b.day+'T12:00:00Z');if(!Number.isFinite(date)||new Date(date).toISOString().slice(0,10)!==b.day||Math.abs(+now-date)>8*86400000)return false;
  if(typeof b.appVersion!=='string'||!/^\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/.test(b.appVersion))return false;
  if(!b.counts||typeof b.counts!=='object'||Array.isArray(b.counts))return false;
  const entries=Object.entries(b.counts);return entries.length>0&&entries.length<=48&&entries.every(([event,n])=>allowedEvent(event)&&Number.isInteger(n)&&n>0&&n<=9999);
}
export default {async fetch(request,env){
  const respond=status=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
  if(request.method!=='POST'||new URL(request.url).pathname!=='/counts')return respond(404);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return respond(415);
  if(Number(request.headers.get('content-length')||0)>2048)return respond(413);
  // Bounded streaming read prevents an absent/forged Content-Length from allocating huge bodies.
  const reader=request.body?.getReader();if(!reader)return respond(400);let size=0,text='';const decoder=new TextDecoder();
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return respond(413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}catch{return respond(400);}
  let batch;try{batch=JSON.parse(text);}catch{return respond(400);}if(!validateBatch(batch))return respond(400);
  try{await env.DB.batch(Object.entries(batch.counts).map(([event,n])=>env.DB.prepare('INSERT INTO daily_counts(day, app_version, event, count) VALUES (?, ?, ?, ?) ON CONFLICT(day, app_version, event) DO UPDATE SET count = count + excluded.count').bind(batch.day,batch.appVersion,event,n)));return respond(204);}catch{return respond(503);}
}};
