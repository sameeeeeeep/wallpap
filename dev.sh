#!/bin/zsh
# Dev helper for a running LiveWall launched with LIVEWALL_DEV=1.
#   ./dev.sh js "LW.env"      ./dev.sh snap shots/host.png
#   ./dev.sh reload           ./dev.sh scene:cats    ./dev.sh reminder:water
cmd="$1"; [[ "$1" == js ]] && cmd="js:$2"; [[ "$1" == snap ]] && cmd="snap:$PWD/$2"
rm -f /tmp/livewall-dev.txt
swift -e "import Foundation; DistributedNotificationCenter.default().postNotificationName(.init(\"com.sameep.livewall.dev\"), object: CommandLine.arguments[1], userInfo: nil, deliverImmediately: true)" "$cmd"
[[ "$1" == js ]] && { sleep 0.6; cat /tmp/livewall-dev.txt 2>/dev/null; echo; }
true
