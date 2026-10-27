#!/usr/bin/env bash
# Bumps the site version in the three places that must agree, so open tabs show the
# "new version" card and the service worker drops its old cache:
#   assets/app.js (APP_VERSION), version.json, sw.js (CACHE = 'bdk-<version>').
# Usage: tools/bump-version.sh            (v13 -> v14)
set -euo pipefail
cd "$(dirname "$0")/.."
cur=$(sed -n "s/.*const APP_VERSION = 'v\([0-9]*\)'.*/\1/p" assets/app.js)
[ -n "$cur" ] || { echo "APP_VERSION not found in assets/app.js" >&2; exit 1; }
next=$((cur + 1))
sed -i "s/const APP_VERSION = 'v$cur'/const APP_VERSION = 'v$next'/" assets/app.js
sed -i "s/const CACHE = 'bdk-v[0-9]*'/const CACHE = 'bdk-v$next'/" sw.js
printf '{ "v": "v%s" }\n' "$next" > version.json
grep -q "APP_VERSION = 'v$next'" assets/app.js && grep -q "bdk-v$next" sw.js && grep -q "\"v$next\"" version.json
echo "v$cur -> v$next"
