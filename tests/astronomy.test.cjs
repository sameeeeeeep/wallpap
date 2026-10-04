const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),window={};
vm.runInNewContext(fs.readFileSync(require.resolve('../scenes/astronomy.js'),'utf8'),{window});
const sun=window.SunCalc,calc=window.LWAstronomy.calculate;
const delhi={latitude:28.6139,longitude:77.209,approximate:false};
test('solar lighting anchors follow local rise/set in summer and winter',()=>{
 for(const month of ['06','12']){const date=new Date(`2026-${month}-21T06:00:00Z`),times=sun.getTimes(date,delhi.latitude,delhi.longitude);
 for(const [key,hour]of [['sunrise',6.3],['solarNoon',12],['sunset',18.3]])assert.ok(Math.abs(calc(times[key],delhi).hour-hour)<.04,key);
 }
 const summer=calc(new Date('2026-06-21T13:00:00Z'),delhi),winter=calc(new Date('2026-12-21T13:00:00Z'),delhi);assert.equal(summer.isDay,true);assert.equal(winter.isDay,false);
});
test('moon visibility follows its horizon crossing, independently of night',()=>{
 const where={latitude:51.5,longitude:-.1},day=new Date('2026-10-02T12:00:00Z'),times=sun.getMoonTimes(day,where.latitude,where.longitude,true);
 assert.ok(times.rise);assert.ok(times.set);
 assert.equal(calc(new Date(+times.rise-3600000),where).moon.visibility,0);
 assert.ok(calc(new Date(+times.rise+3600000),where).moon.visibility>.8);
 assert.equal(calc(new Date(+times.set+3600000),where).moon.visibility,0);
});
test('polar day/night remain finite without invented rise/set times',()=>{
 const where={latitude:89,longitude:15};const summer=calc(new Date('2026-06-21T12:00:00Z'),where),winter=calc(new Date('2026-12-21T12:00:00Z'),where);
 assert.equal(summer.sunset,null);assert.equal(winter.sunrise,null);assert.equal(summer.isDay,true);assert.equal(winter.isDay,false);assert.ok(Number.isFinite(summer.hour));assert.ok(Number.isFinite(winter.hour));
});
test('missing/invalid coordinates fall back and zero coordinates remain valid',()=>{
 assert.equal(calc(new Date(),null),null);assert.equal(calc(new Date(),{latitude:100,longitude:0}),null);assert.ok(calc(new Date(),{latitude:0,longitude:0}));
});
test('moonrise/moonset match an independent ephemeris (astronomy-engine) to within ~1.5 min',()=>{
 // reference: astronomy-engine SearchRiseSet (upper limb, standard refraction), 2026-10-04/05
 const cases=[[{latitude:12.97,longitude:77.59},'2026-10-04T19:36:41Z','2026-10-05T08:47:34Z'],
  [{latitude:40.71,longitude:-74.01},'2026-10-05T05:08:04Z','2026-10-05T20:05:06Z'],
  [{latitude:51.51,longitude:-.13},'2026-10-04T23:12:56Z','2026-10-05T15:38:18Z']];
 const M=60000;
 for(const [where,rise,set] of cases){
  const r=+new Date(rise),s=+new Date(set),{moonTimes}=window.LWAstronomy;
  assert.ok(Math.abs(+moonTimes(new Date(r),where.latitude,where.longitude).rise-r)<1.5*M,'rise '+rise);
  assert.ok(Math.abs(+moonTimes(new Date(s),where.latitude,where.longitude).set-s)<1.5*M,'set '+set);
  assert.equal(calc(new Date(r-3*M),where).moon.visibility,0);assert.equal(calc(new Date(r+3*M),where).moon.visibility,1);
  assert.equal(calc(new Date(s-3*M),where).moon.visibility,1);assert.equal(calc(new Date(s+3*M),where).moon.visibility,0);
 }
});
