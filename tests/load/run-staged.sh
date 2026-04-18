#!/usr/bin/env bash
# Run smoke → load → stress, only advancing if the previous stage passed
# k6's thresholds (http_req_failed < 1%, p95 < 800ms). k6 exits non-zero
# when thresholds are crossed, so a failing stage stops the chain.

set -euo pipefail

cd "$(dirname "$0")/../.."
mkdir -p test-results

echo "▶ smoke (1 VU / 1 min)"
k6 run tests/load/smoke.js

echo "▶ load (ramp to 25 VU / 5 min)"
k6 run tests/load/load.js

echo "▶ stress (ramp to 100 VU / 10 min)"
k6 run tests/load/stress.js

echo "✅ staged ramp completed cleanly"
