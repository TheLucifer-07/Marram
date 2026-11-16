#!/bin/sh
# Runs the QA matrix one viewport at a time. Usage: qa/run-all.sh [viewport ...]   (default: all six)
cd "$(dirname "$0")/.."
VIEWPORTS=${*:-desktop laptop tablet-l tablet mobile mobile-s}
for v in $VIEWPORTS; do
  node qa/run.mjs --viewports=$v --out=qa/shots/$v > qa/shots/$v.log 2>&1
done
echo done > qa/shots/DONE
