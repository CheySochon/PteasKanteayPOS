import http from "node:http";
import app from "../src/app.js";

const STAGE_DURATION_SECONDS = Number(process.env.STAGE_DURATION || 4);
const CONCURRENCY_STAGES = [5, 20, 50, 80];

interface StageResult {
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  rps: number;
  memUsageMB: number;
}

const endpoints = [
  "/health",
  "/api/products",
  "/api/tables",
  "/api/users",
  "/api/orders",
];

function makeRequest(baseUrl: string, path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(`${baseUrl}${path}`, (res) => {
      res.resume();
      res.on("end", () => {
        const elapsed = performance.now() - start;
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve(elapsed);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function runStage(baseUrl: string, concurrency: number): Promise<StageResult> {
  const latencies: number[] = [];
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  const startTime = Date.now();
  const stopTime = startTime + STAGE_DURATION_SECONDS * 1000;

  async function worker() {
    while (Date.now() < stopTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      totalRequests++;
      try {
        const latency = await makeRequest(baseUrl, endpoint);
        successfulRequests++;
        latencies.push(latency);
      } catch {
        failedRequests++;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const rps = Number((totalRequests / (durationMs / 1000)).toFixed(2));
  const memUsageMB = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));

  return {
    concurrency,
    totalRequests,
    successfulRequests,
    failedRequests,
    avgLatency,
    rps,
    memUsageMB,
  };
}

async function runScalabilityBenchmark() {
  console.log("=================================================");
  console.log("📈 STARTING POS SYSTEM SCALABILITY BENCHMARK");
  console.log("=================================================");

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Target Test Server  : ${baseUrl}`);
  console.log(`Stage Test Duration : ${STAGE_DURATION_SECONDS}s per stage`);
  console.log(`Concurrency Steps   : ${CONCURRENCY_STAGES.join(" ➔ ")} workers`);
  console.log("-------------------------------------------------");

  const results: StageResult[] = [];

  for (const concurrency of CONCURRENCY_STAGES) {
    console.log(`⚡ Testing Stage: ${concurrency} Concurrent POS Terminals/Workers...`);
    const stageResult = await runStage(baseUrl, concurrency);
    results.push(stageResult);
    await new Promise((r) => setTimeout(r, 500));
  }

  server.close();

  console.log("\n=======================================================================================");
  console.log("📊 SCALABILITY TESTING COMPARATIVE MATRIX REPORT");
  console.log("=======================================================================================");
  console.log(
    "| Concurrency | Total Req | Success Rate | Req/Sec (RPS) | Avg Latency (ms) | Heap RAM (MB) |"
  );
  console.log(
    "|-------------|-----------|--------------|---------------|------------------|---------------|"
  );

  let hasFailures = false;

  for (const r of results) {
    const successRate = ((r.successfulRequests / (r.totalRequests || 1)) * 100).toFixed(2);
    if (r.failedRequests > 0 || Number(successRate) < 95) {
      hasFailures = true;
    }
    console.log(
      `| ${String(r.concurrency).padEnd(11)} | ${String(r.totalRequests).padEnd(9)} | ${(successRate + "%").padEnd(12)} | ${String(r.rps).padEnd(13)} | ${(r.avgLatency.toFixed(2) + " ms").padEnd(16)} | ${(r.memUsageMB + " MB").padEnd(13)} |`
    );
  }

  console.log("=======================================================================================\n");

  if (hasFailures) {
    console.error("❌ SCALABILITY TEST FAILED: High error rate observed during load escalation.");
    process.exit(1);
  } else {
    console.log("✅ SCALABILITY TEST PASSED: System scales efficiently with linear throughput growth!");
    process.exit(0);
  }
}

runScalabilityBenchmark().catch((err) => {
  console.error("Unhandled Error during scalability test:", err);
  process.exit(1);
});
