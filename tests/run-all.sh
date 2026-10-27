#!/usr/bin/env bash
# Runs every browser test against a local copy of the site.
#   tests/run-all.sh            all tests
#   tests/run-all.sh data ui    only these
# Needs Node and Playwright with Chromium (preinstalled in the Claude Code cloud environment).
set -uo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8765}
export BDK_URL="http://localhost:$PORT/"
if ! curl -s -o /dev/null "$BDK_URL"; then
  (setsid python3 -m http.server "$PORT" >/dev/null 2>&1 &)
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "$BDK_URL" && break; sleep 0.5; done
fi
node --check assets/app.js || exit 1
tests=("$@"); [ ${#tests[@]} -eq 0 ] && tests=(data ui refresh cram regression)
failed=()
for t in "${tests[@]}"; do
  echo "===== $t"
  timeout 900 node "tests/$t.js" || failed+=("$t")
done
echo "====="
if [ ${#failed[@]} -eq 0 ]; then echo "ALL TESTS PASSED (${tests[*]})"; else echo "FAILED: ${failed[*]}"; exit 1; fi
