// Beat sync: passively listens to system audio (ScreenCaptureKit, audio only —
// output is never touched or rerouted) and turns it into gentle levels, beats and
// harmony for the scenes. Opt-in; nothing is recorded or stored.
//
// What the scenes get (one `__lw('beat', {...})` message, ~20 Hz; kicks/onsets go out at once):
//   l, b, m, h   level / bass / mid / high, 0…1, auto-gained + smoothed (unchanged since v1)
//   k            kick strength on the frame a bass kick is detected (0 otherwise)
//   o            onset strength (spectral flux, all bands — hats, plucks, chords), 0 otherwise
//   c            spectral centroid ("brightness"), 0 (≈200 Hz) … 1 (≈8 kHz), smoothed
//   ch           chroma: 12 pitch-class energies C…B, 0…1 (max = 1), smoothed ~0.25 s
//   r, q, rc     current chord root (0 = C … 11 = B), quality (1 major / 0 minor), match 0…1;
//                debounced (a new chord must win for ~0.35 s)
//   key, mo, kc  estimated key (pitch class), mode (1 major / 0 minor), confidence;
//                Krumhansl–Schmuckler over a ~10 s chroma memory, debounced ~4 s
//   bpm, bc, ph  tempo (78…160), confidence 0…1, beat phase 0…1 (0 = on the beat), phase-locked to kicks
//   e, tr        energy 0…1 (gained level) and trend −1…1 (4 s vs 30 s loudness, ±12 dB)
//   sec          section: 0 groove, 1 build, 2 drop (held ~1.5 s), 3 breakdown, 4 silence
//
// Cost: a 1024-pt FFT every 512 samples (as before) + an 8192-pt FFT every 8th hop + a 64-lag
// autocorrelation every ~0.5 s, all vDSP with preallocated buffers: ≈ 0.1–0.2 % of one M1 core.

import Foundation
import ScreenCaptureKit
import Accelerate
import CoreMedia
import QuartzCore

final class BeatSync: NSObject, SCStreamOutput, SCStreamDelegate {
    /// Legacy: level, bass, mid, high (0…1, auto-gained) and beat strength (0 = none).
    /// Not called when `onMusic` is set.
    var onFrame: ((Float, Float, Float, Float, Float) -> Void)?
    /// Full analysis as a JSON object literal, ready for `__lw('beat', <json>)`.
    var onMusic: ((String) -> Void)?
    var onError: ((Error) -> Void)?
    private var stream: SCStream?
    private let queue = DispatchQueue(label: "wallpap.beatsync")
    private let analyzer = MusicAnalyzer(sampleRate: 48000)

    override init() {
        super.init()
        analyzer.emit = { [weak self] f in
            guard let self else { return }
            if let onMusic = self.onMusic {
                let json = f.json
                DispatchQueue.main.async { onMusic(json) }
            } else {
                DispatchQueue.main.async { self.onFrame?(f.level, f.bass, f.mid, f.high, f.kick) }
            }
        }
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
        queue.async { self.analyzer.reset() }
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
        analyzer.feed(UnsafeBufferPointer(start: data.assumingMemoryBound(to: Float.self), count: count),
                      now: CACurrentMediaTime())
    }
}

/// One analysis snapshot (what goes to the scenes).
struct MusicFrame {
    var level: Float = 0, bass: Float = 0, mid: Float = 0, high: Float = 0, kick: Float = 0
    var onset: Float = 0, centroid: Float = 0.4
    var chroma = [Float](repeating: 0, count: 12)
    var root = 9, major = false, rootConf: Float = 0
    var key = 9, keyMajor = false, keyConf: Float = 0
    var bpm: Float = 120, bpmConf: Float = 0, phase: Float = 0
    var energy: Float = 0, trend: Float = 0, section = 4

    var json: String {
        let ch = chroma.map { String(format: "%.2f", $0) }.joined(separator: ",")
        return String(format: "{\"l\":%.3f,\"b\":%.3f,\"m\":%.3f,\"h\":%.3f,\"k\":%.2f,\"o\":%.2f,\"c\":%.3f,\"ch\":[%@],"
                      + "\"r\":%d,\"q\":%d,\"rc\":%.2f,\"key\":%d,\"mo\":%d,\"kc\":%.2f,\"bpm\":%.1f,\"bc\":%.2f,\"ph\":%.3f,"
                      + "\"e\":%.3f,\"tr\":%.3f,\"sec\":%d}",
                      level, bass, mid, high, kick, onset, centroid, ch,
                      root, major ? 1 : 0, rootConf, key, keyMajor ? 1 : 0, keyConf, bpm, bpmConf, phase,
                      energy, trend, section)
    }
}

/// The DSP, separate from capture so it can be tested/benchmarked with synthetic audio.
/// Not thread-safe: call `feed` from one queue.
final class MusicAnalyzer {
    var emit: ((MusicFrame) -> Void)?
    let sr: Float
    // short FFT (levels, kick, flux, centroid)
    private let n = 1024, hop = 512
    private let fft: vDSP.FFT<DSPSplitComplex>?
    private let window: [Float]
    private var frame: [Float], wbuf: [Float], re: [Float], im: [Float], mags: [Float], logMag: [Float], prevLog: [Float], diff: [Float]
    // long FFT (chroma)
    private let nL = 8192, longEvery = 8
    private let fftL: vDSP.FFT<DSPSplitComplex>?
    private let windowL: [Float]
    private var hist: [Float], histI = 0, histFill = 0
    private var frameL: [Float], reL: [Float], imL: [Float], magsL: [Float]
    private var pcOf: [Int8], pcW: [Float]
    private let chromaLo: Int, chromaHi: Int
    private var hopCount = 0
    private var pending = 0                     // samples received since the last hop
    // levels / kick (unchanged behaviour)
    private var peak: [Float] = [1e-4, 1e-4, 1e-4, 1e-4]
    private var smooth: [Float] = [0, 0, 0, 0]
    private var raw: [Float] = [0, 0, 0, 0]
    private var cf = [Float](repeating: 0, count: 12)
    private var bassAvg: Float = 0
    private var lastBeat = 0.0, lastSend = 0.0, lastOnset = 0.0
    // onsets
    private var fluxMean: Float = 0, fluxVar: Float = 0
    private var env: [Float], envI = 0
    private let envLen = 768                    // ≈ 8.2 s of onset envelope at 93.75 Hz
    private var envLin: [Float]
    private var acc: [Float] = []
    private var tempoHops = 0, bpmCand: Float = 0, bpmCandN = 0
    private var beatPhase: Double = 0
    // harmony
    private var chromaS = [Float](repeating: 0, count: 12)
    private var chromaLong = [Float](repeating: 0, count: 12)
    private var chordCand = -1, chordCandT: Float = 0, chordCur = -1
    private var keyCand = -1, keyCandT: Float = 0, keyCur = -1
    // sections
    private var eS: Float = -60, eM: Float = -60, eL: Float = -60, bS: Float = -60, bM: Float = -60, bL: Float = -60, hM: Float = -60, hL: Float = -60
    private var hMPrev: Float = -60, hSlope: Float = 0, buildOn = false, breakOn = false, soundT: Float = 0, sinceKick: Float = 99, buildScore: Float = 0, breakT: Float = 0, dropHold: Float = 0, sinceDrop: Float = 99, sinceTension: Float = 99
    private var silentT: Float = 99
    private var f = MusicFrame()

    init(sampleRate: Float) {
        sr = sampleRate
        fft = vDSP.FFT(log2n: 10, radix: .radix2, ofType: DSPSplitComplex.self)
        window = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: 1024, isHalfWindow: false)
        fftL = vDSP.FFT(log2n: 13, radix: .radix2, ofType: DSPSplitComplex.self)
        windowL = vDSP.window(ofType: Float.self, usingSequence: .hanningDenormalized, count: 8192, isHalfWindow: false)
        frame = [Float](repeating: 0, count: 1024); wbuf = frame
        re = [Float](repeating: 0, count: 512); im = re; mags = re; logMag = re; prevLog = re; diff = re
        hist = [Float](repeating: 0, count: 8192); frameL = hist
        reL = [Float](repeating: 0, count: 4096); imL = reL; magsL = reL
        env = [Float](repeating: 0, count: envLen); envLin = env
        // pitch-class map for the long FFT: 100 Hz … 2.5 kHz, bins weighted toward semitone centres
        let hz = sampleRate / 8192
        pcOf = [Int8](repeating: -1, count: 4096); pcW = [Float](repeating: 0, count: 4096)
        chromaLo = Int(100 / hz); chromaHi = min(4095, Int(2500 / hz))
        for i in chromaLo...chromaHi {
            let semis = 12 * log2(Float(i) * hz / 440) + 69, near = semis.rounded()
            pcOf[i] = Int8(((Int(near) % 12) + 12) % 12)
            let c = cos(Float.pi * (semis - near)); pcW[i] = c * c
        }
    }

    func reset() {
        histI = 0; histFill = 0; pending = 0; hopCount = 0
        for i in 0..<hist.count { hist[i] = 0 }
        smooth = [0, 0, 0, 0]
        for i in 0..<env.count { env[i] = 0 }
        f.section = 4; f.level = 0; f.bass = 0; f.mid = 0; f.high = 0
    }

    /// Feed mono float samples (any block size).
    func feed(_ samples: UnsafeBufferPointer<Float>, now: Double) {
        guard var src = samples.baseAddress else { return }
        var left = samples.count
        while left > 0 {
            // copy up to the next hop boundary (and the ring's end) in one go
            let take = min(left, hop - pending, nL - histI)
            hist.withUnsafeMutableBufferPointer { h in (h.baseAddress! + histI).update(from: src, count: take) }
            histI = (histI + take) & (nL - 1); pending += take; src += take; left -= take
            if pending >= hop {
                pending = 0
                histFill = min(nL, histFill + hop)
                if histFill >= n { analyze(now: now) }
            }
        }
    }

    private func copyRecent(_ count: Int, into dst: inout [Float]) {
        // the most recent `count` samples, oldest first
        let start = (histI - count + nL) & (nL - 1)
        let first = min(count, nL - start)
        hist.withUnsafeBufferPointer { h in
            dst.withUnsafeMutableBufferPointer { d in
                d.baseAddress!.update(from: h.baseAddress! + start, count: first)
                if first < count { (d.baseAddress! + first).update(from: h.baseAddress!, count: count - first) }
            }
        }
    }

    private func spectrum(_ x: [Float], _ fft: vDSP.FFT<DSPSplitComplex>, re: inout [Float], im: inout [Float], mags: inout [Float]) {
        let half = x.count / 2
        re.withUnsafeMutableBufferPointer { rp in
            im.withUnsafeMutableBufferPointer { ip in
                var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                x.withUnsafeBufferPointer { xp in
                    xp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: half) { vDSP_ctoz($0, 2, &split, 1, vDSP_Length(half)) }
                }
                fft.forward(input: split, output: &split)
                vDSP.absolute(split, result: &mags)
            }
        }
    }

    private func analyze(now: Double) {
        guard let fft else { return }
        let dt = Float(hop) / sr
        copyRecent(n, into: &frame)
        vDSP.multiply(frame, window, result: &wbuf)
        spectrum(wbuf, fft, re: &re, im: &im, mags: &mags)

        // ── levels (46.9 Hz bins: bass 47–190 Hz, mid 190 Hz–1.9 kHz, high 1.9–9.4 kHz) — as v1
        func band(_ a: Int, _ b: Int) -> Float { vDSP.mean(mags[a...b]) }
        let rms = vDSP.rootMeanSquare(frame)
        raw[0] = rms; raw[1] = band(1, 4); raw[2] = band(4, 40); raw[3] = band(40, 200)
        for i in 0..<4 {
            peak[i] = max(peak[i] * 0.9995, raw[i], 1e-4)             // slow auto-gain
            let v = min(1, raw[i] / peak[i])
            smooth[i] += (v - smooth[i]) * (v > smooth[i] ? 0.5 : 0.12)
        }
        f.level = smooth[0]; f.bass = smooth[1]; f.mid = smooth[2]; f.high = smooth[3]
        let sounding = rms > 1e-3
        silentT = sounding ? 0 : silentT + dt

        // ── kick: bass jumps clearly above its recent average
        let bassN = raw[1] / peak[1]
        var kick: Float = 0
        if bassN > bassAvg * 1.45 && bassN > 0.25 && now - lastBeat > 0.28 && sounding {
            kick = min(1, (bassN - bassAvg) * 2.2); lastBeat = now
        }
        bassAvg += (bassN - bassAvg) * 0.06

        // ── spectral flux (log magnitude, half-wave rectified), all bands up to ~17 kHz
        vDSP.multiply(8 / max(peak[1], 1e-4), mags, result: &logMag)
        var one: Float = 1
        logMag.withUnsafeMutableBufferPointer { p in
            vDSP_vsadd(p.baseAddress!, 1, &one, p.baseAddress!, 1, vDSP_Length(512))
            var cnt = Int32(512); vvlogf(p.baseAddress!, p.baseAddress!, &cnt)
        }
        vDSP.subtract(logMag, prevLog, result: &diff)
        var zero: Float = 0
        diff.withUnsafeMutableBufferPointer { p in vDSP_vthres(p.baseAddress!, 1, &zero, p.baseAddress!, 1, vDSP_Length(512)) }
        let flux = vDSP.sum(diff[1..<370]) / 64
        swap(&logMag, &prevLog)
        env[envI] = flux + 1.5 * vDSP.sum(diff[1..<7]); envI = (envI + 1) % envLen   // tempo: kick-weighted
        let aF: Float = 1 - exp(-dt / 0.6)
        let d = flux - fluxMean
        fluxMean += aF * d; fluxVar += aF * (d * d - fluxVar)
        var onset: Float = 0
        let sd = sqrt(max(fluxVar, 1e-8))
        if flux > fluxMean + 1.6 * sd && flux > 0.02 && now - lastOnset > 0.1 && sounding {
            onset = min(1, (flux - fluxMean) / (4 * sd)); lastOnset = now
        }

        // ── centroid → 0 (200 Hz) … 1 (8 kHz)
        var num: Float = 0, den: Float = 0
        for i in 2..<400 { num += Float(i) * mags[i]; den += mags[i] }
        if den > 1e-6 && sounding {
            let cHz = num / den * sr / Float(n)
            let c = min(1, max(0, log2(max(cHz, 1) / 200) / log2(40)))
            f.centroid += (c - f.centroid) * (1 - exp(-dt / 0.8))
        }

        // ── tempo + beat phase
        beatPhase += Double(dt * f.bpm / 60)
        if beatPhase >= 1 { beatPhase -= floor(beatPhase) }
        let lockOn = max(kick, onset * 0.5)
        if lockOn > 0 && f.bpmConf > 0.05 {
            var err = beatPhase; if err > 0.5 { err -= 1 }            // distance to the nearest beat
            beatPhase -= err * Double(0.12 + 0.18 * lockOn)
            if beatPhase < 0 { beatPhase += 1 }
        }
        tempoHops += 1
        if tempoHops >= 47 { tempoHops = 0; if sounding { estimateTempo(fr: sr / Float(hop)) } }
        f.phase = Float(beatPhase)

        // ── sections: short / mid / long energy in dB of the RAW (un-gained) signal, so slow swells
        //    and builds aren't flattened by the auto-gain
        soundT = sounding ? soundT + dt : soundT
        func ema(_ x: inout Float, _ v: Float, _ tau: Float) { x += (v - x) * (1 - exp(-dt / min(tau, max(0.3, soundT)))) }
        func dB(_ v: Float) -> Float { 20 * log10(max(v, 1e-6)) }
        if sounding {
            let lv = dB(raw[0]), bv = dB(raw[1]), hv = dB(raw[3])
            if soundT <= dt { eS = lv; eM = lv; eL = lv; bS = bv; bM = bv; bL = bv; hM = hv; hL = hv; hMPrev = hv }   // start from here, not from silence
            ema(&eS, lv, 0.4); ema(&eM, lv, 4); ema(&eL, lv, 30)
            ema(&bS, bv, 0.5); ema(&bM, bv, 4); ema(&bL, bv, 30)
            ema(&hM, hv, 3); ema(&hL, hv, 30)
        }
        if soundT > 1 { ema(&hSlope, (hM - hMPrev) / dt, 2) }; hMPrev = hM
        f.energy = smooth[0]
        f.trend = max(-1, min(1, (eM - eL) / 12))
        sinceDrop += dt; sinceTension += dt
        sinceKick = kick > 0.3 ? 0 : sinceKick + dt
        // build: the highs keep rising for a few seconds (risers, hats, snare rolls)
        if soundT > 6 && hSlope > 0.2 && hM > hL + 1.5 { buildScore = min(8, buildScore + dt) } else { buildScore = max(0, buildScore - dt * 0.7) }
        // breakdown: the kick has stopped for a while, or clearly quieter with the bass gone
        if soundT > 6 && sounding && (sinceKick > 3 || (eM < eL - 5 && bM < bL - 6)) { breakT = min(8, breakT + dt) } else { breakT = max(0, breakT - dt * 3) }
        if soundT > 6 && (buildScore > 2.5 || breakT > 2 || sinceKick > 2) { sinceTension = 0 }
        // drop: the kick comes back hard (bass jump) right after a build / breakdown / gap
        if sinceTension < 8 && sinceDrop > 12 && kick > 0.3 && bS > bM + 3 {
            dropHold = 1.5; sinceDrop = 0; buildScore = 0; breakT = 0
        }
        dropHold = max(0, dropHold - dt)
        buildOn = buildOn ? buildScore > 1 : buildScore > 2.5
        breakOn = breakOn ? breakT > 0.8 : breakT > 2
        f.section = silentT > 2 ? 4 : dropHold > 0 ? 2 : breakOn ? 3 : buildOn ? 1 : 0

        // ── harmony (8192-pt FFT, every 8th hop ≈ 11.7 Hz)
        hopCount += 1
        if hopCount >= longEvery && histFill >= nL && sounding { hopCount = 0; harmony(dt: dt * Float(longEvery)) }

        // ── emit ~20 Hz (kicks and onsets always go through)
        f.kick = kick; f.onset = onset
        if kick > 0 || onset > 0 || now - lastSend > 0.05 {
            lastSend = now
            emit?(f)
        }
    }

    private func estimateTempo(fr: Float) {
        // linearise the onset envelope (oldest first) and remove its mean
        for i in 0..<envLen { envLin[i] = env[(envI + i) % envLen] }
        let mean = vDSP.mean(envLin)
        vDSP.add(-mean, envLin, result: &envLin)
        let minLag = Int(60 * fr / 180), maxLag = Int(60 * fr / 60) + 1
        if acc.count != maxLag * 2 + 2 { acc = [Float](repeating: 0, count: maxLag * 2 + 2) }
        var e0: Float = 0
        envLin.withUnsafeBufferPointer { p in
            vDSP_dotpr(p.baseAddress!, 1, p.baseAddress!, 1, &e0, vDSP_Length(envLen))
            for lag in minLag...(maxLag * 2 + 1) where lag < envLen / 2 {
                var s: Float = 0
                vDSP_dotpr(p.baseAddress!, 1, p.baseAddress! + lag, 1, &s, vDSP_Length(envLen - lag))
                acc[lag] = s / Float(envLen - lag) * Float(envLen)
            }
        }
        guard e0 > 1e-6 else { return }
        var best = -1, bestS: Float = -1e9
        for lag in minLag...maxLag {
            let bpm = 60 * fr / Float(lag)
            let w = exp(-0.5 * pow(log2(bpm / 120) / 0.6, 2))       // prefer ~120 bpm
            let comb = acc[lag] + (2 * lag < acc.count ? 0.5 * acc[2 * lag] : 0)
            let s = comb * w
            if s > bestS { bestS = s; best = lag }
        }
        guard best > minLag, best < maxLag else { return }
        let a = acc[best - 1], b = acc[best], c = acc[best + 1]
        let den = a - 2 * b + c
        let off = abs(den) > 1e-9 ? max(-0.5, min(0.5, 0.5 * (a - c) / den)) : 0
        var bpm = 60 * fr / (Float(best) + off)
        while bpm < 78 { bpm *= 2 }
        while bpm >= 160 { bpm /= 2 }
        let conf = max(0, min(1, b / e0 * 1.5))
        if abs(bpm - f.bpm) / f.bpm < 0.04 { f.bpm += (bpm - f.bpm) * 0.3; bpmCandN = 0 }
        else if abs(bpm - bpmCand) / max(bpmCand, 1) < 0.04 { bpmCandN += 1; if bpmCandN >= (sinceKick > 3 ? 12 : 5) || f.bpmConf < 0.08 { f.bpm = bpm; bpmCandN = 0 } }
        else { bpmCand = bpm; bpmCandN = 1 }
        f.bpmConf += (conf - f.bpmConf) * 0.3
    }

    // Krumhansl–Kessler key profiles, mean-removed, with their norms
    private static func centred(_ p: [Float]) -> ([Float], Float) {
        let m = p.reduce(0, +) / 12, c = p.map { $0 - m }
        return (c, sqrt(c.reduce(0) { $0 + $1 * $1 }))
    }
    private static let majorProfile = centred([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    private static let minorProfile = centred([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

    private func harmony(dt: Float) {
        guard let fftL else { return }
        copyRecent(nL, into: &frameL)
        vDSP.multiply(frameL, windowL, result: &frameL)
        spectrum(frameL, fftL, re: &reL, im: &imL, mags: &magsL)
        for i in 0..<12 { cf[i] = 0 }
        for i in chromaLo...chromaHi { let pc = Int(pcOf[i]); if pc >= 0 { cf[pc] += magsL[i] * pcW[i] } }
        let mx = max(cf.max() ?? 0, 1e-9)
        let a = 1 - exp(-dt / 0.25), aL = 1 - exp(-dt / 10)
        for i in 0..<12 {
            let v = cf[i] / mx
            chromaS[i] += (v - chromaS[i]) * a
            chromaLong[i] += (v - chromaLong[i]) * aL
        }
        let m2 = max(chromaS.max() ?? 0, 1e-6)
        for i in 0..<12 { f.chroma[i] = chromaS[i] / m2 }

        // chord: best of 24 triad templates (cosine similarity), debounced
        var norm: Float = 0; for v in chromaS { norm += v * v }; norm = sqrt(max(norm, 1e-9))
        func chordScore(_ c: Int) -> Float {
            let r = c % 12, minor = c >= 12
            let third = (r + (minor ? 3 : 4)) % 12, fifth = (r + 7) % 12
            return (chromaS[r] + 0.85 * chromaS[third] + 0.9 * chromaS[fifth]) / (norm * 1.5)
        }
        var best = 0, bestS: Float = -1
        for c in 0..<24 { let s = chordScore(c); if s > bestS { bestS = s; best = c } }
        if chordCur < 0 { chordCur = best }
        if best != chordCur {
            if best == chordCand { chordCandT += dt; if chordCandT > 0.35 && bestS > chordScore(chordCur) * 1.06 { chordCur = best; chordCandT = 0 } }
            else { chordCand = best; chordCandT = 0 }
        } else { chordCand = -1 }
        f.root = chordCur % 12; f.major = chordCur < 12; f.rootConf = min(1, chordScore(chordCur))

        // key: Krumhansl–Schmuckler (Pearson correlation with the 24 rotated profiles), debounced
        let cm = vDSP.mean(chromaLong)
        var sxx: Float = 0; for v in chromaLong { sxx += (v - cm) * (v - cm) }
        let sx = sqrt(max(sxx, 1e-12))
        var kBest = 0, kS: Float = -2
        var keyScore = [Float](repeating: 0, count: 24)
        for k in 0..<24 {
            let (prof, py) = k < 12 ? MusicAnalyzer.majorProfile : MusicAnalyzer.minorProfile
            let r = k % 12
            var sxy: Float = 0
            for i in 0..<12 { sxy += (chromaLong[(i + r) % 12] - cm) * prof[i] }
            let corr = sxy / (sx * py)
            keyScore[k] = corr
            if corr > kS { kS = corr; kBest = k }
        }
        if keyCur < 0 { keyCur = kBest }
        if kBest != keyCur {
            if kBest == keyCand { keyCandT += dt; if keyCandT > 5 && kS > keyScore[keyCur] + 0.04 { keyCur = kBest; keyCandT = 0 } }
            else { keyCand = kBest; keyCandT = 0 }
        } else { keyCand = -1 }
        f.key = keyCur % 12; f.keyMajor = keyCur < 12; f.keyConf = max(0, kS)
    }
}
