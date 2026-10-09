process.env.NODE_ENV = "test"; // Bypass strict production rate limits during stability testing

import http from "node:http";
import app from "../src/app.js";
import { signToken } from "../src/utils/jwt.js";

const DURATION_SECONDS = Number(process.env.TEST_DURATION || 10);
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);

// Generate valid Admin Token for authenticating API requests
const authToken = signToken({ userId: 1, role: "Admin Group" });

interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
  statusCodes: Record<number, number>;
}

const metrics: Metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  latencies: [],
  statusCodes: {},
};

const endpoints = [
  "/health",
  "/api/products",
  "/api/tables",
  "/api/users",
  "/api/orders",
  "/api/categories",
];

function makeRequest(baseUrl: string, path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const url = new URL(`${baseUrl}${path}`);
    
    const req = http.request(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        metrics.statusCodes[res.statusCode || 0] = (metrics.statusCodes[res.statusCode || 0] || 0) + 1;
        res.resume();
        res.on("end", () => {
          const elapsed = performance.now() - start;
          // Standard check: Only HTTP 2xx (200-299) is considered a TRUE successful response
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(elapsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });

    req.end();
  });
}

async function worker(baseUrl: string, stopTime: number) {
  while (Date.now() < stopTime) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    metrics.totalRequests++;
    try {
      const latency = await makeRequest(baseUrl, endpoint);
      metrics.successfulRequests++;
      metrics.latencies.push(latency);
    } catch {
      metrics.failedRequests++;
    }
    await new Promise((r) => setTimeout(r, 15));
  }
}

async function runStabilityTest() {
  console.log("=================================================");
  console.log("🚀 STARTING REAL POS STABILITY TEST (HTTP 200 OK)");
  console.log("=================================================");

  // Start temporary test server dynamically
  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Target Server      : ${baseUrl}`);
  console.log(`Duration           : ${DURATION_SECONDS} seconds`);
  console.log(`Concurrency        : ${CONCURRENCY} parallel workers`);
  console.log(`Auth Bearer Token  : Active (Admin Group)`);
  console.log("-------------------------------------------------");

  const startTime = Date.now();
  const stopTime = startTime + DURATION_SECONDS * 1000;

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(baseUrl, stopTime));
  }

  await Promise.all(workers);

  server.close();

  const durationMs = Date.now() - startTime;
  const avgLatency =
    metrics.latencies.length > 0
      ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
      : 0;
  const rps = (metrics.totalRequests / (durationMs / 1000)).toFixed(2);
  const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const successRate = ((metrics.successfulRequests / (metrics.totalRequests || 1)) * 100).toFixed(2);

  console.log("\n=================================================");
  console.log("📊 REAL STABILITY TEST SUMMARY REPORT (STANDARD)");
  console.log("=================================================");
  console.log(`Total Requests Sent : ${metrics.totalRequests}`);
  console.log(`Successful (200 OK) : ${metrics.successfulRequests}`);
  console.log(`Failed / Blocked    : ${metrics.failedRequests}`);
  console.log(`Success Rate (%)    : ${successRate}%`);
  console.log(`Avg Latency (ms)    : ${avgLatency.toFixed(2)} ms`);
  console.log(`Requests / Sec (RPS): ${rps} req/sec`);
  console.log(`Heap Memory Used    : ${memUsage} MB`);
  console.log("Status Breakdown    :", JSON.stringify(metrics.statusCodes));
  console.log("=================================================\n");

  if (metrics.failedRequests > 0 || Number(successRate) < 95) {
    console.error("❌ STABILITY TEST FAILED: Error or non-200 responses detected.");
    process.exit(1);
  } else {
    console.log("✅ STABILITY TEST PASSED: All requests returned HTTP 200 OK under continuous load!");
    process.exit(0);
  }
}

runStabilityTest().catch((err) => {
  console.error("Unhandled Error during stability test:", err);
  process.exit(1);
});
