import { sleep } from 'k6';
import { READ_ENDPOINTS, SHARED_THRESHOLDS, checkOk, getTagged } from './lib/common.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: SHARED_THRESHOLDS,
  summaryTrendStats: ['avg', 'p(50)', 'p(95)', 'p(99)', 'max'],
};

const PROFILE = __ENV.LOAD_PROFILE || 'guest';

export default function () {
  for (const ep of READ_ENDPOINTS) {
    const res = getTagged(ep.path, PROFILE, { endpoint: ep.name });
    checkOk(res, ep.name);
  }
  sleep(1);
}

export function handleSummary(data) {
  return { 'test-results/k6-smoke-summary.json': JSON.stringify(data, null, 2) };
}
