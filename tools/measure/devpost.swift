// Post one dev command to a wallpap launched with LIVEWALL_DEV=1 (what dev.sh does, but compiled once:
// `swift -e` recompiles on every call and can take >30 s on a busy Mac).
//   swiftc -O tools/measure/devpost.swift -o .build/devpost && .build/devpost scene:koi
import Foundation
DistributedNotificationCenter.default().postNotificationName(.init("com.sameep.livewall.dev"), object: CommandLine.arguments[1], userInfo: nil, deliverImmediately: true)
