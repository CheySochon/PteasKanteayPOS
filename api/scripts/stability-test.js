import http from 'k6/http';
import { check, sleep } from 'k6';

// Configurable Test Options for Stability & Endurance Test
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // 1. Ramp-up ដល់ 20 Virtual Users ក្នុង 2 នាទី
    { duration: '10m', target: 20 },  // 2. Soak Phase: រក្សា 20 Users នេះរត់ចោលរយៈពេល 10 នាទី (ឬដូរដល់ 8h)
    { duration: '2m', target: 0 },    // 3. Ramp-down មក 0 Users វិញក្នុង 2 នាទី
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],    // Error rate ត្រូវ < 1%
    http_req_duration: ['p(95)<1000'], // 95% នៃ Request ត្រូវលឿនជាង 1000ms
  },
};

// Base URL នៃ backend POS Server
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Test GET Public Staff Endpoint
  const resStaff = http.get(`${BASE_URL}/api/public/staff`, params);
  check(resStaff, {
    'GET /api/public/staff success (200)': (r) => r.status === 200,
  });

  sleep(1); // Sleep 1 វិនាទី

  // 2. Test GET Users List
  const resUsers = http.get(`${BASE_URL}/api/users`, params);
  check(resUsers, {
    'GET /api/users response ok (200/401)': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);

  // 3. Test GET Audit Logs
  const resAudit = http.get(`${BASE_URL}/api/audit-logs`, params);
  check(resAudit, {
    'GET /api/audit-logs response ok (200/401)': (r) => r.status === 200 || r.status === 401,
  });

  sleep(2); // Wait 2s មុននឹងរត់ Loop បន្ទាប់
}
