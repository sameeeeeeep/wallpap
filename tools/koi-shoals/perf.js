// wkshot pre-script; virtual simulation, real WebKit clock, paced GPU submissions.
// 60 warmup + 300 measured frames at 1600x1000. Does not use virtual performance.now.
window.__shotPending = true;
(() => {
  const clock = () => Performance.prototype.now.call(performance);
  const original = tick, samples = [], added = [], updates = [], meshes = [], draws = [];
  const draw = gl.drawArrays.bind(gl);
  let count = 0, cost = 0, updateCost = 0, meshCost = 0, drawCount = 0;
  gl.drawArrays = function(mode, first, size) { drawCount++; draw(mode, first, size); };
  if (typeof updateShoals === 'function') {
    const update = updateShoals, emit = emitShoals;
    updateShoals = function(dt, t) { const start = clock(); update(dt, t); updateCost = clock() - start; cost += updateCost; };
    emitShoals = function() { const start = clock(); emit(); meshCost = clock() - start; cost += meshCost; };
  }
  tick = function() {
    cost = 0; drawCount = 0;
    const start = clock(); original(); const elapsed = clock() - start;
    if (count >= 60) { samples.push(elapsed); added.push(cost); updates.push(updateCost); meshes.push(meshCost); draws.push(drawCount); }
  };
  window.__shotPoll = () => {
    for(let i=0;i<6;i++) { LW.advance(1 / 30); count++; }
    if (count >= 360) {
      window.__shotPoll = null;
      const stats = a => {
        a.sort((a,b) => a-b);
        return {mean: a.reduce((a,b) => a+b,0)/a.length, p50:a[Math.floor(a.length*.5)], p95:a[Math.floor(a.length*.95)], frames:a.length};
      };
      const result = {tick:stats(samples), shoals:stats(added), update:stats(updates), mesh:stats(meshes), draws:stats(draws), width:W, height:H, verticesCapacity:vbuf.length/STRIDE};
      // Measure CPU work without driver calls and amortize the 1ms timer quantum.
      // Each block measures 20 real updates + mesh emissions (scheduling can still vary).
      if (typeof updateShoals === 'function') {
        const blocks=[], baseTime=performance.now()/1000;
        for(let block=0;block<40;block++) {
          const start=clock();
          for(let j=0;j<20;j++) {
            updateShoals(1/30,baseTime+(block*20+j)/30);vn=0;emitShoals();vn=0;
          }
          if(block>=10) blocks.push((clock()-start)/20);
        }
        result.cpuBlocks=stats(blocks);
      }
      window.__shotReport = () => result;
      window.__shotPending = false;
    }
  };
})();
