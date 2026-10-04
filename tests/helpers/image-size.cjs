const assert = require('node:assert/strict');
// Read the stored canvas dimensions, not payload bytes at PNG-only offsets.
module.exports = function imageSize(b) {
  if (b.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    return {width:b.readUInt32BE(16), height:b.readUInt32BE(20)};
  }
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  assert.equal(b.readUInt32LE(4) + 8, b.length);
  for (let offset=12; offset+8<=b.length;) {
    const kind=b.toString('ascii',offset,offset+4), length=b.readUInt32LE(offset+4), p=offset+8;
    assert.ok(p+length<=b.length, 'truncated WebP chunk');
    if (kind==='VP8X') return {width:1+b.readUIntLE(p+4,3), height:1+b.readUIntLE(p+7,3)};
    if (kind==='VP8L') {
      assert.equal(b[p],0x2f);
      const bits=b.readUInt32LE(p+1);
      return {width:1+(bits&0x3fff), height:1+((bits>>>14)&0x3fff)};
    }
    if (kind==='VP8 ') {
      assert.equal(b.toString('hex',p+3,p+6),'9d012a');
      return {width:b.readUInt16LE(p+6)&0x3fff,height:b.readUInt16LE(p+8)&0x3fff};
    }
    offset=p+length+(length&1);
  }
  throw new Error('WebP has no canvas dimensions');
};
