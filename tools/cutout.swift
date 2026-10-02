// cutout — lift every subject out of an image (macOS Vision subject lifting, on-device)
// and save each as a tightly-cropped transparent PNG.
//   swift tools/cutout.swift sheet.png out/dir prefix [strip]
//   (strip = one row of animation frames: order purely left→right, e.g. a jump arc)
// → out/dir/prefix-1.png, prefix-2.png … ordered left→right, top→bottom.
import AppKit
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 4, let src = NSImage(contentsOfFile: args[1]),
      let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("usage: cutout <image> <outdir> <prefix>"); exit(1)
}
let outDir = URL(fileURLWithPath: args[2]); let prefix = args[3]
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cg)
try handler.perform([req])
guard let obs = req.results?.first else { print("no subjects found"); exit(2) }

let ci = CIContext()
struct Piece { let rect: CGRect; let image: CGImage }
var pieces: [Piece] = []
for inst in obs.allInstances {
    let masked = try obs.generateMaskedImage(ofInstances: IndexSet(integer: inst), from: handler, croppedToInstancesExtent: true)
    let img = CIImage(cvPixelBuffer: masked)
    // Where is it on the sheet? (for reading order)
    let mask = try obs.generateScaledMaskForImage(forInstances: IndexSet(integer: inst), from: handler)
    let m = CIImage(cvPixelBuffer: mask)
    guard let out = ci.createCGImage(img, from: img.extent) else { continue }
    // approximate bounds via mask extent scan (coarse)
    let w = CVPixelBufferGetWidth(mask), h = CVPixelBufferGetHeight(mask)
    CVPixelBufferLockBaseAddress(mask, .readOnly)
    let base = CVPixelBufferGetBaseAddress(mask)!.assumingMemoryBound(to: Float32.self)
    let stride = CVPixelBufferGetBytesPerRow(mask) / 4
    var minX = w, minY = h, maxX = 0, maxY = 0
    for y in Swift.stride(from: 0, to: h, by: 4) { for x in Swift.stride(from: 0, to: w, by: 4) where base[y * stride + x] > 0.5 {
        minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) } }
    CVPixelBufferUnlockBaseAddress(mask, .readOnly)
    _ = m
    pieces.append(Piece(rect: CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY), image: out))
}
// Reading order: rows (by center y, tolerance = 1/3 of median height), then x.
let medH = pieces.map { $0.rect.height }.sorted().dropFirst(pieces.count / 2).first ?? 100
let strip = args.count > 4 && args[4] == "strip"
let sorted = pieces.sorted { a, b in
    strip ? a.rect.midX < b.rect.midX : abs(a.rect.midY - b.rect.midY) > medH / 3 ? a.rect.midY < b.rect.midY : a.rect.midX < b.rect.midX
}
for (i, p) in sorted.enumerated() {
    let rep = NSBitmapImageRep(cgImage: p.image)
    let url = outDir.appendingPathComponent("\(prefix)-\(i + 1).png")
    try rep.representation(using: .png, properties: [:])!.write(to: url)
    print("\(url.lastPathComponent)  \(p.image.width)x\(p.image.height)  at \(Int(p.rect.minX)),\(Int(p.rect.minY))")
}
