#!/bin/zsh
# Dev helper for a running LiveWall launched with LIVEWALL_DEV=1.
#   ./dev.sh js "LW.env"      ./dev.sh snap shots/host.png
#   ./dev.sh reload           ./dev.sh scene:cats    ./dev.sh reminder:water
#   ./dev.sh panel  ./dev.sh pjs "S.scene"  ./dev.sh psnap shots/panel.png  ./dev.sh state
cmd="$1"; [[ "$1" == js ]] && cmd="js:$2"; [[ "$1" == snap ]] && cmd="snap:$PWD/$2"
[[ "$1" == pjs ]] && cmd="pjs:$2"; [[ "$1" == psnap ]] && cmd="psnap:$PWD/$2"   # menu-bar panel (dev.sh panel opens it)
rm -f /tmp/livewall-dev.txt
swift -e "import Foundation; DistributedNotificationCenter.default().postNotificationName(.init(\"com.sameep.livewall.dev\"), object: CommandLine.arguments[1], userInfo: nil, deliverImmediately: true)" "$cmd"
[[ "$1" == js || "$1" == pjs || "$1" == state ]] && { sleep 0.6; cat /tmp/livewall-dev.txt 2>/dev/null; echo; }
true
