#!/bin/bash
set -e

cd easy-locs-ea1eb0ed
npm install --no-fund --no-audit 2>&1 | tail -5
