import { sleep } from 'k6';
import { READ_ENDPOINTS, SHARED_THRESHOLDS, checkOk, getTagged } from './lib/common.js';

export const options = {
  thresholds: SHARED_THRESHOLDS,
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 25 },
    { duration: '1m', target: 0 },
  ],
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

const PROFILE = __ENV.LOAD_PROFILE || 'mixed';

export default function () {
  for (const ep of READ_ENDPOINTS) {
    const res = getTagged(ep.path, PROFILE, { endpoint: ep.name });
    checkOk(res, ep.name);
  }
  sleep(0.5);
}

export function handleSummary(data) {
  return { 'test-results/k6-load-summary.json': JSON.stringify(data, null, 2) };
}
