// wpmeter — measure what wallpap really costs: CPU, memory and energy of the app AND the WebKit
// helper processes it is responsible for (WebContent renders the scene, GPU draws it).
// Uses the kernel's own per-process accounting (proc_pid_rusage v6: CPU time, physical footprint,
// energy in nanojoules). No root needed for your own processes. Nothing is changed or injected.
//
//   swiftc -O tools/measure/wpmeter.swift -o .build/wpmeter
//   .build/wpmeter [seconds=30] [pid]        → one JSON line: per process + total
import Foundation
import Darwin

typealias RespFn = @convention(c) (pid_t) -> pid_t
let respFn: RespFn? = {
    guard let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "responsibility_get_pid_responsible_for_pid") else { return nil }
    return unsafeBitCast(sym, to: RespFn.self)
}()

func allPids() -> [pid_t] {
    let n = proc_listallpids(nil, 0)
    var pids = [pid_t](repeating: 0, count: Int(n) * 2)
    let got = proc_listallpids(&pids, Int32(pids.count * MemoryLayout<pid_t>.size))
    return Array(pids.prefix(Int(got))).filter { $0 > 0 }
}
func name(_ pid: pid_t) -> String {
    var buf = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    return proc_pidpath(pid, &buf, UInt32(buf.count)) > 0 ? (String(cString: buf) as NSString).lastPathComponent : "?"
}
struct Sample { let cpuNs: UInt64; let footprint: UInt64; let energyNj: UInt64 }
var tb = mach_timebase_info_data_t(); mach_timebase_info(&tb)
func sample(_ pid: pid_t) -> Sample? {
    var info = rusage_info_v6()
    let ok = withUnsafeMutablePointer(to: &info) { p in
        p.withMemoryRebound(to: Optional<rusage_info_t>.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V6, $0) }
    }
    guard ok == 0 else { return nil }
    let ticks = info.ri_user_time + info.ri_system_time
    return Sample(cpuNs: ticks * UInt64(tb.numer) / UInt64(tb.denom), footprint: info.ri_phys_footprint, energyNj: info.ri_energy_nj)
}

let args = CommandLine.arguments
let seconds = args.count > 1 ? Double(args[1]) ?? 30 : 30
var app: pid_t = 0
if args.count > 2, let p = Int32(args[2]) { app = p }
else { app = allPids().first { name($0) == "wallpap" } ?? 0 }
guard app > 0 else { print(#"{"error":"wallpap is not running"}"#); exit(1) }

func family() -> [pid_t] {
    guard let resp = respFn else { return [app] }
    return allPids().filter { $0 == app || resp($0) == app }
}
let pids = family()
var a: [pid_t: Sample] = [:]; for p in pids { a[p] = sample(p) }
let t0 = DispatchTime.now().uptimeNanoseconds
Thread.sleep(forTimeInterval: seconds)
let dt = Double(DispatchTime.now().uptimeNanoseconds - t0)

var rows: [[String: Any]] = []
var cpu = 0.0, mem = 0.0, mw = 0.0
for p in pids {
    guard let s0 = a[p], let s1 = sample(p) else { continue }
    let c = Double(s1.cpuNs &- s0.cpuNs) / dt * 100
    let m = Double(s1.footprint) / 1_048_576
    let w = Double(s1.energyNj &- s0.energyNj) / dt * 1000   // nJ/ns = W → mW
    cpu += c; mem += m; mw += w
    rows.append(["pid": Int(p), "name": name(p), "cpu": (c * 10).rounded() / 10, "mb": m.rounded(), "mw": w.rounded()])
}
let out: [String: Any] = ["seconds": seconds, "respKnown": respFn != nil, "total": ["cpu": (cpu * 10).rounded() / 10, "mb": mem.rounded(), "mw": mw.rounded()], "procs": rows]
let data = try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
