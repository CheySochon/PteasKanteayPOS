import fs from "fs";

const filePath = "d:/Years4-Semeter2/ThesisPosManagerment/pos-newflow/web/src/app/admin/page.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// 1. Add Line to import
content = content.replace(
  /import \{ Bar, Doughnut \} from "react-chartjs-2";/,
  `import { Bar, Doughnut, Line } from "react-chartjs-2";`
);

// 2. Change Sales Trend Chart Data
const oldDataStart = `const salesTrendChartData = {
    labels: salesByHour.map((item) => hourLabel(item.hour)),
    datasets: [
      {
        label: "Hourly Sales",
        data: salesByHour.map((item) => item.total),
        backgroundColor: salesByHour.map((item) =>
          item.total === peakSalesHour.total && item.total > 0
            ? "#696cff"
            : dark ? "rgba(105, 108, 255, 0.15)" : "rgba(105, 108, 255, 0.15)"
        ),
        hoverBackgroundColor: "#696cff",
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 24,
      },
    ],
  };`;

const newData = `const salesTrendChartData = {
    labels: salesByHour.map((item) => hourLabel(item.hour)),
    datasets: [
      {
        label: "Hourly Sales",
        data: salesByHour.map((item) => item.total),
        fill: true,
        tension: 0.4,
        borderColor: "#696cff",
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(105, 108, 255, 0.4)");
          gradient.addColorStop(1, "rgba(105, 108, 255, 0.0)");
          return gradient;
        },
        pointBackgroundColor: "#fff",
        pointBorderColor: "#696cff",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
    ],
  };`;

content = content.replace(oldDataStart, newData);

// 3. Update Options Type
content = content.replace(
  /const salesChartOptions: ChartOptions<"bar"> = \{/,
  `const salesChartOptions: ChartOptions<"line"> = {`
);

content = content.replace(
  /label: \(context: TooltipItem<"bar">\) =>/,
  `label: (context: TooltipItem<"line">) =>`
);

// 4. Update JSX Component
content = content.replace(
  /<Bar data=\{salesTrendChartData\} options=\{salesChartOptions\} \/>/,
  `<Line data={salesTrendChartData} options={salesChartOptions} />`
);

fs.writeFileSync(filePath, content);
console.log("Successfully upgraded Sales chart to a sleek Line chart!");
