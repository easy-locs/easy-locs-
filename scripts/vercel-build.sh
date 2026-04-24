#!/usr/bin/env bash
# Vercel build — defensive against the project's "Root Directory" setting.
# Works whether Vercel runs us from the repo root (and we must `cd` into
# the inner project) or directly from inside `easy-locs-ea1eb0ed/`.
# At the end, ensures `./dist` exists at the cwd so `outputDirectory: dist`
# resolves correctly in both cases.
set -euo pipefail

START_DIR="$PWD"
echo "[vercel-build] starting at $START_DIR"

if [ -d easy-locs-ea1eb0ed ] && [ -f easy-locs-ea1eb0ed/package.json ]; then
  echo "[vercel-build] detected outer layout — entering easy-locs-ea1eb0ed/"
  cd easy-locs-ea1eb0ed
elif [ -f package.json ] && grep -q '"name": *"easy-locs"' package.json 2>/dev/null; then
  echo "[vercel-build] already inside the inner project"
else
  echo "[vercel-build] WARNING: did not detect inner project; building from $PWD"
fi

echo "[vercel-build] npm install ($(pwd))"
npm install --legacy-peer-deps

echo "[vercel-build] npm run build"
npm run build

# Expose dist/ to the parent dir too, so `outputDirectory: dist` works
# regardless of Vercel's Root Directory setting.
if [ -d dist ] && [ "$PWD" != "$START_DIR" ] && [ ! -e "$START_DIR/dist" ]; then
  echo "[vercel-build] symlinking $PWD/dist -> $START_DIR/dist"
  ln -s "$PWD/dist" "$START_DIR/dist"
fi

echo "[vercel-build] done"
