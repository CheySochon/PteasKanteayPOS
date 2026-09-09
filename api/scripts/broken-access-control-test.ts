import http from "node:http";
import app from "../src/app.js";
import { signToken } from "../src/utils/jwt.js";

const TEST_PORT = 0; // Dynamic test port

// Tokens for different User Contexts
const staffToken = signToken({ userId: 999, role: "Staff" });
const cashierToken = signToken({ userId: 888, role: "Cashier" });
const adminToken = signToken({ userId: 1, role: "Admin Group" });

interface TestCase {
  name: string;
  path: string;
  method: string;
  token?: string;
  expectedStatus: number[]; // e.g. [401, 403]
  description: string;
}

const testCases: TestCase[] = [
  // --- Category A: No Token (Unauthenticated Access Attempts) ---
  {
    name: "Unauthenticated GET /api/users",
    path: "/api/users",
    method: "GET",
    expectedStatus: [401],
    description: "Try accessing User List without JWT Token",
  },
  {
    name: "Unauthenticated GET /api/groups",
    path: "/api/groups",
    method: "GET",
    expectedStatus: [401],
    description: "Try accessing Role Groups without JWT Token",
  },
  {
    name: "Unauthenticated GET /api/permissions",
    path: "/api/permissions",
    method: "GET",
    expectedStatus: [401],
    description: "Try accessing System Permissions without JWT Token",
  },
  {
    name: "Unauthenticated GET /api/audit",
    path: "/api/audit",
    method: "GET",
    expectedStatus: [401],
    description: "Try accessing Security Audit Logs without JWT Token",
  },

  // --- Category B: Low-Privilege Staff Token accessing Admin Endpoints ---
  {
    name: "Staff Role GET /api/users",
    path: "/api/users",
    method: "GET",
    token: staffToken,
    expectedStatus: [401, 403],
    description: "Staff User trying to access User Management",
  },
  {
    name: "Cashier Role GET /api/groups",
    path: "/api/groups",
    method: "GET",
    token: cashierToken,
    expectedStatus: [401, 403],
    description: "Cashier User trying to access Group Management",
  },
  {
    name: "Staff Role GET /api/permissions",
    path: "/api/permissions",
    method: "GET",
    token: staffToken,
    expectedStatus: [401, 403],
    description: "Staff User trying to access Permission Configs",
  },
  {
    name: "Staff Role GET /api/audit",
    path: "/api/audit",
    method: "GET",
    token: staffToken,
    expectedStatus: [401, 403],
    description: "Staff User trying to access Audit Logs",
  },

  // --- Category C: High-Privilege Admin Token (Authorized Baseline) ---
  {
    name: "Admin Role GET /api/users",
    path: "/api/users",
    method: "GET",
    token: adminToken,
    expectedStatus: [200],
    description: "Admin User accessing User Management (Authorized)",
  },
  {
    name: "Admin Role GET /api/products",
    path: "/api/products",
    method: "GET",
    token: adminToken,
    expectedStatus: [200],
    description: "Admin User accessing Products (Authorized)",
  },
];

function executeTest(baseUrl: string, tc: TestCase): Promise<{ pass: boolean; actualStatus: number; details: string }> {
  return new Promise((resolve) => {
    const url = new URL(`${baseUrl}${tc.path}`);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (tc.token) {
      headers["Authorization"] = `Bearer ${tc.token}`;
    }

    const req = http.request(
      url,
      {
        method: tc.method,
        headers,
      },
      (res) => {
        res.resume();
        const actualStatus = res.statusCode || 0;
        const pass = tc.expectedStatus.includes(actualStatus);
        const details = pass
          ? `HTTP ${actualStatus} (Matches Expected: ${tc.expectedStatus.join("/")})`
          : `VULNERABILITY DETECTED! Returned HTTP ${actualStatus}, but Expected ${tc.expectedStatus.join("/")}`;
        resolve({ pass, actualStatus, details });
      }
    );

    req.on("error", (err) => {
      resolve({ pass: false, actualStatus: 0, details: `Network Error: ${err.message}` });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ pass: false, actualStatus: 0, details: "Timeout" });
    });

    req.end();
  });
}

async function runBrokenAccessControlTest() {
  console.log("=================================================================");
  console.log("🛡️ OWASP SECURITY BENCHMARK: BROKEN ACCESS CONTROL TEST");
  console.log("=================================================================");

  const server = app.listen(TEST_PORT);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Test Target Server : ${baseUrl}`);
  console.log(`Total Test Cases   : ${testCases.length}`);
  console.log("-----------------------------------------------------------------\n");

  let passedCount = 0;
  let failedCount = 0;
  const resultsTable: any[] = [];

  for (const tc of testCases) {
    console.log(`Testing: [${tc.method}] ${tc.path} (${tc.name})...`);
    const res = await executeTest(baseUrl, tc);
    if (res.pass) {
      passedCount++;
    } else {
      failedCount++;
    }

    resultsTable.push({
      TestCase: tc.name,
      Endpoint: `${tc.method} ${tc.path}`,
      UserContext: tc.token ? (tc.token === adminToken ? "Admin User" : "Low-Privilege Staff") : "No Token (Anonymous)",
      ExpectedHTTP: tc.expectedStatus.join("/"),
      ActualHTTP: res.actualStatus,
      Result: res.pass ? "✅ SECURE (PASSED)" : "❌ VULNERABLE (FAILED)",
    });
  }

  server.close();

  console.log("\n=================================================================");
  console.log("📋 BROKEN ACCESS CONTROL TEST RESULT TABLE (COPY TO THESIS)");
  console.log("=================================================================\n");

  console.log("| Test Scenario | Target Endpoint | User Context | Expected HTTP | Actual HTTP | Security Status |");
  console.log("| :--- | :--- | :--- | :---: | :---: | :---: |");
  for (const r of resultsTable) {
    console.log(`| ${r.TestCase} | ${r.Endpoint} | ${r.UserContext} | ${r.ExpectedHTTP} | ${r.ActualHTTP} | ${r.Result} |`);
  }

  console.log("\n=================================================================");
  console.log("💡 SUMMARY SECURITY METRICS FOR THESIS:");
  console.log(`• Total Security Cases Executed: ${testCases.length}`);
  console.log(`• Protected Endpoints Passed  : ${passedCount}`);
  console.log(`• Vulnerabilities Found        : ${failedCount}`);
  console.log(`• Access Control Protection    : ${((passedCount / testCases.length) * 100).toFixed(1)}%`);
  console.log("=================================================================\n");

  if (failedCount > 0) {
    console.warn("⚠️ SECURITY WARNING: Broken Access Control vulnerabilities detected.");
  } else {
    console.log("✅ SECURITY PASSED: Access Control is fully protected against unauthorized access!");
  }
}

runBrokenAccessControlTest().catch((err) => {
  console.error("Unhandled error during security test:", err);
  process.exit(1);
});
