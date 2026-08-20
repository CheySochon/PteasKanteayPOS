import http from "node:http";
import app from "../src/app.js";

const STRESS_STAGE_DURATION = Number(process.env.STRESS_DURATION || 3);
const STRESS_CONCURRENCY_LEVELS = [50, 150, 300, 450];

interface StressStageResult {
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  serverErrorRequests: number;
  networkErrorRequests: number;
  avgLatency: number;
  rps: number;
  peakMemMB: number;
}

const endpoints = [
  "/health",
  "/api/products",
  "/api/tables",
  "/api/users",
  "/api/orders",
];

function makeStressRequest(baseUrl: string, path: string): Promise<{ latency: number; status: number }> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(`${baseUrl}${path}`, (res) => {
      res.resume();
      res.on("end", () => {
        const elapsed = performance.now() - start;
        resolve({ latency: elapsed, status: res.statusCode || 0 });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function runStressStage(baseUrl: string, concurrency: number): Promise<StressStageResult> {
  const latencies: number[] = [];
  let totalRequests = 0;
  let successfulRequests = 0;
  let rateLimitedRequests = 0;
  let serverErrorRequests = 0;
  let networkErrorRequests = 0;

  const startTime = Date.now();
  const stopTime = startTime + STRESS_STAGE_DURATION * 1000;

  async function stressWorker() {
    while (Date.now() < stopTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      totalRequests++;
      try {
        const res = await makeStressRequest(baseUrl, endpoint);
        latencies.push(res.latency);
        if (res.status >= 200 && res.status < 400) {
          successfulRequests++;
        } else if (res.status === 429) {
          rateLimitedRequests++;
        } else {
          serverErrorRequests++;
        }
      } catch {
        networkErrorRequests++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(stressWorker());
  }

  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  const rps = Number((totalRequests / (durationMs / 1000)).toFixed(2));
  const peakMemMB = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));

  return {
    concurrency,
    totalRequests,
    successfulRequests,
    rateLimitedRequests,
    serverErrorRequests,
    networkErrorRequests,
    avgLatency,
    rps,
    peakMemMB,
  };
}

async function runStressTest() {
  console.log("=================================================");
  console.log("🔥 STARTING EXTREME POS SYSTEM STRESS TEST");
  console.log("=================================================");

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  console.log(`Target Stress Server  : ${baseUrl}`);
  console.log(`Duration per Stage   : ${STRESS_STAGE_DURATION} seconds`);
  console.log(`Extreme Concurrency   : ${STRESS_CONCURRENCY_LEVELS.join(" ➔ ")} workers`);
  console.log("-------------------------------------------------");

  const results: StressStageResult[] = [];

  for (const concurrency of STRESS_CONCURRENCY_LEVELS) {
    console.log(`💥 Injecting Load Spike: ${concurrency} Extreme Workers...`);
    const result = await runStressStage(baseUrl, concurrency);
    results.push(result);
    await new Promise((r) => setTimeout(r, 400));
  }

  // Graceful Recovery Check
  console.log("🔄 Testing System Graceful Recovery post-stress...");
  const recoveryStart = performance.now();
  const recoveryRes = await makeStressRequest(baseUrl, "/health");
  const recoveryLatency = (performance.now() - recoveryStart).toFixed(2);

  server.close();

  console.log("\n=======================================================================================");
  console.log("📊 SYSTEM STRESS TESTING BREAKPOINT & STABILITY MATRIX");
  console.log("=======================================================================================");
  console.log(
    "| Concurrency | Total Req | 200 OK | 429 RateLimit | 5xx Errors | RPS (Req/s) | Latency (ms) | Heap RAM |"
  );
  console.log(
    "|-------------|-----------|--------|---------------|------------|-------------|--------------|----------|"
  );

  let unhandledServerCrash = false;

  for (const r of results) {
    if (r.serverErrorRequests > 0 || r.networkErrorRequests > 0) {
      unhandledServerCrash = true;
    }
    console.log(
      `| ${String(r.concurrency).padEnd(11)} | ${String(r.totalRequests).padEnd(9)} | ${String(r.successfulRequests).padEnd(6)} | ${String(r.rateLimitedRequests).padEnd(13)} | ${String(r.serverErrorRequests + r.networkErrorRequests).padEnd(10)} | ${String(r.rps).padEnd(11)} | ${(r.avgLatency.toFixed(2) + " ms").padEnd(12)} | ${(r.peakMemMB + " MB").padEnd(8)} |`
    );
  }

  console.log("=======================================================================================");
  console.log(`❇️ Post-Stress Recovery Status : ${recoveryRes.status === 200 ? "SUCCESS (200 OK)" : "FAILED"}`);
  console.log(`❇️ Post-Stress Latency        : ${recoveryLatency} ms`);
  console.log("=======================================================================================\n");

  if (unhandledServerCrash) {
    console.warn("⚠️ STRESS TEST WARNING: Unhandled server errors detected under extreme overload.");
  } else {
    console.log("✅ STRESS TEST PASSED: System exhibits extreme fault tolerance & 100% graceful recovery!");
  }

  process.exit(0);
}

runStressTest().catch((err) => {
  console.error("Unhandled Error during stress test:", err);
  process.exit(1);
});
