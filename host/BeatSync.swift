// Beat sync: passively listens to system audio (ScreenCaptureKit, audio only —
// output is never touched or rerouted) and turns it into gentle levels + beats
// for the scenes. Opt-in; nothing is recorded or stored.

import Foundation
import ScreenCaptureKit
import Accelerate
import CoreMedia

final class BeatSync: NSObject, SCStreamOutput, SCStreamDelegate {
    /// level, bass, mid, high (0…1, auto-gained) and beat strength (0 = none)
    var onFrame: ((Float, Float, Float, Float, Float) -> Void)?
    var onError: ((Error) -> Void)?
    private var stream: SCStream?
    private let queue = DispatchQueue(label: "wallpap.beatsync")
    private let n = 1024, hop = 512
    private var ring: [Float] = []
    private let fft: vDSP.FFT<DSPSplitComplex>?
    private let window: [Float]
    private var peak: [Float] = [1e-4, 1e-4, 1e-4, 1e-4]
    private var smooth: [Float] = [0, 0, 0, 0]
    private var bassAvg: Float = 0
    private var lastBeat = 0.0
    private var lastSend = 0.0

    override init() {
        fft = vDSP.FFT(log2n: 10, radix: .radix2, ofType: DSPSplitComplex.self)
        window = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: 1024, isHalfWindow: false)
        super.init()
    }

    var running: Bool { stream != nil }

    func start() {
        guard stream == nil else { return }
        Task {
            do {
                let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
                guard let display = content.displays.first else { return }
                let cfg = SCStreamConfiguration()
                cfg.capturesAudio = true
                cfg.excludesCurrentProcessAudio = true      // never hear our own scenes
                cfg.sampleRate = 48000
                cfg.channelCount = 1
                cfg.width = 2; cfg.height = 2                 // video is required but unused: keep it tiny
                cfg.minimumFrameInterval = CMTime(value: 1, timescale: 1)
                cfg.queueDepth = 3
                let s = SCStream(filter: SCContentFilter(display: display, excludingWindows: []), configuration: cfg, delegate: self)
                try s.addStreamOutput(self, type: .audio, sampleHandlerQueue: queue)
                try await s.startCapture()
                await MainActor.run { self.stream = s }
            } catch {
                await MainActor.run { self.onError?(error) }
            }
        }
    }

    func stop() {
        stream?.stopCapture(completionHandler: nil)
        stream = nil
        queue.async { self.ring.removeAll(); self.smooth = [0, 0, 0, 0] }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        DispatchQueue.main.async { self.stream = nil; self.onError?(error) }
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio, sb.isValid else { return }
        var abl = AudioBufferList()
        var block: CMBlockBuffer?
        let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sb, bufferListSizeNeededOut: nil, bufferListOut: &abl, bufferListSize: MemoryLayout<AudioBufferList>.size,
            blockBufferAllocator: nil, blockBufferMemoryAllocator: nil, flags: 0, blockBufferOut: &block)
        guard status == noErr, let data = abl.mBuffers.mData else { return }
        let count = Int(abl.mBuffers.mDataByteSize) / MemoryLayout<Float>.size
        ring.append(contentsOf: UnsafeBufferPointer(start: data.assumingMemoryBound(to: Float.self), count: count))
        while ring.count >= n {
            analyze(Array(ring[0..<n]))
            ring.removeFirst(hop)
        }
    }

    private func analyze(_ frame: [Float]) {
        guard let fft else { return }
        let x = vDSP.multiply(frame, window)
        var re = [Float](repeating: 0, count: n / 2), im = [Float](repeating: 0, count: n / 2)
        var mags = [Float](repeating: 0, count: n / 2)
        re.withUnsafeMutableBufferPointer { rp in
            im.withUnsafeMutableBufferPointer { ip in
                var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                x.withUnsafeBufferPointer { xp in
                    xp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: n / 2) { vDSP_ctoz($0, 2, &split, 1, vDSP_Length(n / 2)) }
                }
                fft.forward(input: split, output: &split)
                vDSP.absolute(split, result: &mags)
            }
        }
        // 46.9 Hz bins: bass 47–190 Hz, mid 190 Hz–1.9 kHz, high 1.9–9.4 kHz
        func band(_ a: Int, _ b: Int) -> Float { vDSP.mean(mags[a...b]) }
        let raw: [Float] = [vDSP.rootMeanSquare(frame), band(1, 4), band(4, 40), band(40, 200)]
        var out = [Float](repeating: 0, count: 4)
        for i in 0..<4 {
            peak[i] = max(peak[i] * 0.9995, raw[i], 1e-4)             // slow auto-gain
            let v = min(1, raw[i] / peak[i])
            smooth[i] += (v - smooth[i]) * (v > smooth[i] ? 0.5 : 0.12)
            out[i] = smooth[i]
        }
        // Beat: bass jumps clearly above its recent average.
        let now = CACurrentMediaTime()
        let bass = raw[1] / peak[1]
        var beat: Float = 0
        if bass > bassAvg * 1.45 && bass > 0.25 && now - lastBeat > 0.28 && raw[0] > 1e-3 {
            beat = min(1, (bass - bassAvg) * 2.2); lastBeat = now
        }
        bassAvg += (bass - bassAvg) * 0.06
        // ~20 Hz to the scenes (beats always go through).
        if beat > 0 || now - lastSend > 0.05 {
            lastSend = now
            let o = out
            DispatchQueue.main.async { self.onFrame?(o[0], o[1], o[2], o[3], beat) }
        }
    }
}
