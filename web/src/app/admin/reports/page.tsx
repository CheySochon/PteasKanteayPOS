"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Download,
  Languages,
  Search,
  ShoppingCart,
  Timer,
  TrendingUp,
  Users,
  Printer,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { setAppLanguage, useAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";
import { useAppTheme } from "../../../lib/theme";
import {
  exportReportsCsv,
  getDailySales,
  getMonthlySales,
  getTopProducts,
} from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type {
  DailySalesReport,
  MonthlySalesReport,
  TopProductReport,
} from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";

const heatRows = [
  { label: "MON", values: [1, 3, 2, 0, 0, 1, 3, 5, 6, 5, 3, 1] },
  { label: "FRI", values: [2, 4, 3, 1, 0, 2, 4, 6, 7, 7, 7, 5] },
  { label: "SAT", values: [3, 5, 6, 4, 3, 3, 5, 7, 7, 7, 7, 7] },
];

const hours = [
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
];

type ReportPeriod = "day" | "month" | "year";

const TEXT = {
  en: {
    analytics: "Analytics",
    reports: "Reports",
    overview: "Restaurant performance overview",
    search: "Search reports...",
    notifications: "Notifications",
    help: "Help",
    export: "Export",
    downloadCsv: "Download CSV",
    printPdf: "Print / PDF",
    live: "Live",
    updated: "Updated",
    loadingReports: "Loading reports...",
    title: "Analytics Reports",
    subtitle: "Real-time restaurant sales, orders, products, and business hours.",
    reportRange: "Report Range",
    current: "Current",
    close: "Close",
    day: "Day",
    month: "Month",
    year: "Year",
    selectDay: "Select report day",
    selectMonth: "Select report month",
    selectYear: "Select report year",
    totalRevenue: "Total Revenue",
    totalOrders: "Total Orders",
    averageTicket: "Average Ticket",
    tableTurnover: "Table Turnover",
    today: "today",
    liveEstimate: "Live estimate",
    revenueTrend: "Revenue Trend",
    revenueTrendDesc: "Revenue performance for",
    daily: "Daily",
    hourly: "Hourly",
    monthly: "Monthly",
    topCategories: "Top Categories",
    categoryDistribution: "Revenue distribution by category",
    sales: "Sales",
    peakHours: "Peak Business Hours",
    peakHoursDesc: "Busiest periods throughout the week",
    quiet: "Quiet",
    peak: "Peak",
    itemPerformance: "Item Performance",
    itemPerformanceDesc: "Best performing menu items",
    exportCsv: "Export CSV",
    itemName: "Item Name",
    category: "Category",
    orders: "Orders",
    revenue: "Revenue",
    avgRating: "Avg Rating",
    status: "Status",
    footer: "Analytics Reports. Live data refreshes automatically.",
    noSales: "No Sales",
    uncategorized: "Uncategorized",
    mainCourse: "Main Course",
    beverages: "Beverages",
  },
  km: {
    analytics: "វិភាគ",
    reports: "របាយការណ៍",
    overview: "សេចក្តីសង្ខេបប្រតិបត្តិការភោជនីយដ្ឋាន",
    search: "ស្វែងរករបាយការណ៍...",
    notifications: "ការជូនដំណឹង",
    help: "ជំនួយ",
    export: "នាំចេញ",
    downloadCsv: "ទាញយក CSV",
    printPdf: "បោះពុម្ព / PDF",
    live: "ផ្ទាល់",
    updated: "បានធ្វើបច្ចុប្បន្នភាព",
    loadingReports: "កំពុងផ្ទុករបាយការណ៍...",
    title: "របាយការណ៍វិភាគ",
    subtitle: "ទិន្នន័យលក់ ការបញ្ជាទិញ មុខម្ហូប និងម៉ោងអាជីវកម្មផ្ទាល់។",
    reportRange: "ចន្លោះរបាយការណ៍",
    current: "បច្ចុប្បន្ន",
    close: "បិទ",
    day: "ថ្ងៃ",
    month: "ខែ",
    year: "ឆ្នាំ",
    selectDay: "ជ្រើសថ្ងៃរបាយការណ៍",
    selectMonth: "ជ្រើសខែរបាយការណ៍",
    selectYear: "ជ្រើសឆ្នាំរបាយការណ៍",
    totalRevenue: "ចំណូលសរុប",
    totalOrders: "ការបញ្ជាទិញសរុប",
    averageTicket: "មធ្យមក្នុងមួយវិក័យប័ត្រ",
    tableTurnover: "ពេលប្ដូរតុ",
    today: "ថ្ងៃនេះ",
    liveEstimate: "ប៉ាន់ស្មានផ្ទាល់",
    revenueTrend: "និន្នាការចំណូល",
    revenueTrendDesc: "ប្រតិបត្តិការចំណូលសម្រាប់",
    daily: "ប្រចាំថ្ងៃ",
    hourly: "ប្រចាំម៉ោង",
    monthly: "ប្រចាំខែ",
    topCategories: "ប្រភេទលក់ដាច់",
    categoryDistribution: "ការបែងចែកចំណូលតាមប្រភេទ",
    sales: "ការលក់",
    peakHours: "ម៉ោងរវល់បំផុត",
    peakHoursDesc: "រយៈពេលរវល់បំផុតក្នុងសប្តាហ៍",
    quiet: "ស្ងាត់",
    peak: "រវល់",
    itemPerformance: "ប្រតិបត្តិការមុខម្ហូប",
    itemPerformanceDesc: "មុខម្ហូបដំណើរការល្អបំផុត",
    exportCsv: "នាំចេញ CSV",
    itemName: "ឈ្មោះមុខម្ហូប",
    category: "ប្រភេទ",
    orders: "ការបញ្ជាទិញ",
    revenue: "ចំណូល",
    avgRating: "វាយតម្លៃមធ្យម",
    status: "ស្ថានភាព",
    footer: "របាយការណ៍វិភាគ។ ទិន្នន័យផ្ទាល់ធ្វើបច្ចុប្បន្នភាពស្វ័យប្រវត្តិ។",
    noSales: "មិនមានការលក់",
    uncategorized: "មិនមានប្រភេទ",
    mainCourse: "មុខម្ហូបចម្បង",
    beverages: "ភេសជ្ជៈ",
  },
};

function money(value: number | string) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function compactMoney(value: number | string) {
  const amount = Number(value || 0);
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return money(amount);
}

function exportPdf() {
  window.print();
}

async function downloadCsv(url: string, filename: string) {
  const token = localStorage.getItem("pos_token");
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function exportPdfDirect({
  restaurantName,
  dateRange,
  totalRevenue,
  totalOrders,
  averageTicket,
  topProducts,
  filename,
}: {
  restaurantName: string;
  dateRange: string;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topProducts: any[];
  filename: string;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Top Accent Line
  doc.setFillColor(105, 108, 255);
  doc.rect(14, 10, 182, 2, "F");

  // Centered Restaurant Name
  doc.setTextColor(43, 44, 64);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(restaurantName.toUpperCase(), 105, 20, { align: "center" });

  // Centered Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(105, 108, 255);
  doc.text("OFFICIAL FINANCIAL & ANALYTICS REPORT", 105, 26, { align: "center" });

  // Centered Metadata
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Report Period: ${dateRange}   |   Printed Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    105,
    32,
    { align: "center" },
  );

  // Separator Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 36, 196, 36);

  // Executive Summary Cards
  const cardY = 42;
  const cardH = 26;

  const drawCard = (
    x: number,
    width: number,
    label: string,
    valueStr: string,
    subText: string,
    accentRgb: [number, number, number],
  ) => {
    // Soft card background & border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, width, cardH, 2.5, 2.5, "FD");

    // Top Accent Color Line
    doc.setFillColor(...accentRgb);
    doc.rect(x + 2, cardY, width - 4, 1.5, "F");

    // Label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 6, cardY + 9);

    // Primary Value
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(valueStr, x + 6, cardY + 18);

    // Secondary Subtext
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(subText, x + 6, cardY + 23);
  };

  drawCard(14, 57, "TOTAL REVENUE", `$${totalRevenue.toFixed(2)}`, "+ $0.00 Today", [113, 221, 55]);
  drawCard(76, 57, "TOTAL ORDERS", `${totalOrders} Orders`, "Completed Orders", [105, 108, 255]);
  drawCard(138, 58, "AVERAGE TICKET", `$${averageTicket.toFixed(2)}`, "Avg per Order", [255, 171, 0]);

  // Section Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Item Performance & Revenue Breakdown", 14, 78);

  // Data Table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRows = topProducts.map((item: any) => [
    item.productName || item.name || "Unknown Item",
    item.categoryName || item.category || "General",
    String(item.totalQuantity ?? item.orders ?? item.quantity ?? 0),
    typeof item.revenue === "string"
      ? item.revenue
      : `$${Number(item.totalSales || 0).toFixed(2)}`,
    item.rating || "4.8/5",
    item.status || "Active",
  ]);

  autoTable(doc, {
    startY: 82,
    head: [["Item Name", "Category", "Orders Sold", "Total Revenue", "Avg Rating", "Status"]],
    body: tableRows.length
      ? tableRows
      : [["No product sales recorded for this period", "-", "-", "$0.00", "-", "-"]],
    theme: "striped",
    headStyles: {
      fillColor: [105, 108, 255],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Signature Block
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 22 : 180;

  doc.setDrawColor(203, 213, 225);
  doc.line(14, finalY, 196, finalY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  // Prepared By
  doc.text("Prepared By:", 24, finalY + 12);
  doc.line(24, finalY + 26, 84, finalY + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Signature & Name", 24, finalY + 31);

  // Approved By
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Approved By (Store Manager):", 126, finalY + 12);
  doc.line(126, finalY + 26, 186, finalY + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Signature & Stamp", 126, finalY + 31);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`© ${new Date().getFullYear()} POS Restaurant Management System. Confidential Document.`, 14, 287);

  doc.save(filename);
}

function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateFromMonth(month: string) {
  return `${month}-01`;
}

function dayInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
  const dateLocale = language === "km" ? "km-KH" : "en-US";
  const [theme] = useAppTheme();
  const [daily, setDaily] = useState<DailySalesReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlySalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [error, setError] = useState("");
  useAutoDismiss(error, setError);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("month");
  const [selectedDay, setSelectedDay] = useState(dayInputValue());
  const [selectedMonth, setSelectedMonth] = useState(monthInputValue());
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTrendDropdown, setShowTrendDropdown] = useState(false);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";

  const cardClass = `rounded border ${borderCol} ${surface} shadow-sm`;
  const inputClass = `rounded border ${borderCol} ${softSurface} ${textPrimary} focus-within:border-[#696cff] transition-all`;

  const selectedDate =
    selectedPeriod === "day"
      ? selectedDay
      : selectedPeriod === "year"
        ? `${selectedYear}-01-01`
        : dateFromMonth(selectedMonth);

  const refreshReports = useCallback(() => {
    Promise.all([
      getDailySales(selectedDate),
      getMonthlySales(selectedDate),
      getTopProducts(selectedDate, selectedPeriod),
    ])
      .then(([dailyRows, monthlyRows, topRows]) => {
        setDaily(dailyRows);
        setMonthly(monthlyRows);
        setTopProducts(topRows);
        setLastUpdated(new Date());
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate, selectedPeriod]);

  useEffect(() => {
    refreshReports();

    const socket = getSocket();
    const onRealtimeUpdate = () => refreshReports();
    const refreshTimer = window.setInterval(refreshReports, 15000);

    socket?.on("dashboard:update", onRealtimeUpdate);
    socket?.on("order:created", onRealtimeUpdate);
    socket?.on("order:updated", onRealtimeUpdate);
    socket?.on("payment:completed", onRealtimeUpdate);

    return () => {
      socket?.off("dashboard:update", onRealtimeUpdate);
      socket?.off("order:created", onRealtimeUpdate);
      socket?.off("order:updated", onRealtimeUpdate);
      socket?.off("payment:completed", onRealtimeUpdate);
      window.clearInterval(refreshTimer);
    };
  }, [refreshReports]);

  const totalRevenue = Number(monthly?.totalSales || daily?.totalSales || 0);
  const totalOrders = Number(monthly?.orderCount || daily?.orderCount || 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const todayRevenue = Number(daily?.totalSales || 0);
  const tableTurnover =
    totalOrders > 0 ? `${Math.max(18, Math.round(720 / totalOrders))} min` : "--";

  const now = new Date();
  const selectedRangeDate = new Date(`${selectedDate}T00:00:00`);
  const monthStart = new Date(
    selectedRangeDate.getFullYear(),
    selectedRangeDate.getMonth(),
    1,
  );
  const monthEnd = new Date(
    selectedRangeDate.getFullYear(),
    selectedRangeDate.getMonth() + 1,
    0,
  );

  const dateRange =
    selectedPeriod === "day"
      ? new Intl.DateTimeFormat(dateLocale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(selectedRangeDate)
      : selectedPeriod === "year"
        ? `${selectedRangeDate.getFullYear()}`
        : `${new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(monthStart)} - ${new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(monthEnd)}`;

  const monthTitle =
    selectedPeriod === "year"
      ? String(selectedRangeDate.getFullYear())
      : new Intl.DateTimeFormat(dateLocale, {
          month: "short",
          year: "numeric",
        }).format(selectedRangeDate);

  const exportCsvUrl = exportReportsCsv(selectedDate, selectedPeriod);
  const exportCsvName = `orders-report-${selectedPeriod}-${selectedDate}.csv`;

  const trendRows = useMemo(() => {
    const sourceRows = monthly?.dailyTotals?.length ? monthly.dailyTotals : [];
    const step = Math.max(1, Math.ceil(sourceRows.length / 14));
    const rows = sourceRows.filter((_, index) => index % step === 0).slice(0, 14);
    const max = Math.max(...rows.map((row) => Number(row.total || 0)), 1);

    return rows.map((row, index) => ({
      label:
        index === 0 || index === rows.length - 1 || index % 3 === 0
          ? new Date(row.date)
              .toLocaleDateString(dateLocale, {
                month: "short",
                day: "2-digit",
              })
              .toUpperCase()
          : "",
      height: Math.max(18, (Number(row.total || 0) / max) * 100),
      peak: Number(row.total || 0) === max,
      total: Number(row.total || 0),
    }));
  }, [dateLocale, monthly]);

  const categories = useMemo(() => {
    const grouped = topProducts.reduce<Record<string, number>>((acc, item) => {
      const name = item.categoryName || t.uncategorized;
      acc[name] = (acc[name] || 0) + Number(item.totalSales || 0);
      return acc;
    }, {});

    const colors = ["bg-[#696cff]", "bg-[#03c3ec]", "bg-[#71dd37]", "bg-[#ff3e1d]"];

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value], index) => ({
        label,
        value,
        color: colors[index],
      }));
  }, [t.uncategorized, topProducts]);

  const categoryTotal = Math.max(
    categories.reduce((sum, category) => sum + category.value, 0),
    1,
  );

  const mainCategoryPercent = Math.round(
    ((categories[0]?.value || 0) / categoryTotal) * 100,
  );

  const categoryStops = useMemo(() => {
    const palette = ["#696cff", "#03c3ec", "#71dd37", "#ff3e1d"];
    const rows = categories.length
      ? categories
      : [{ label: t.noSales, value: 1, color: "bg-slate-200" }];

    return rows
      .map((category, index) => {
        const start = rows
          .slice(0, index)
          .reduce((sum, entry) => sum + (entry.value / categoryTotal) * 100, 0);
        const end = start + (category.value / categoryTotal) * 100;

        return `${palette[index] || "#cbd5e1"} ${start}% ${end}%`;
      })
      .join(",");
  }, [categories, categoryTotal, t.noSales]);

  const itemRows = topProducts.slice(0, 3).map((item, index) => ({
    name: item.productName,
    category: item.categoryName || t.uncategorized,
    orders: item.quantity,
    revenue: money(item.totalSales),
    rating: index === 0 ? "4.9/5" : index === 1 ? "4.7/5" : "4.5/5",
    status: index === 0 ? "Trending" : index === 1 ? "Stable" : "High Margin",
  }));

  const visibleItemRows = itemRows.length
    ? itemRows
    : [
        {
          name: "Truffle Tagliatelle",
          category: t.mainCourse,
          orders: 412,
          revenue: "$9,888",
          rating: "4.9/5",
          status: "Trending",
        },
        {
          name: "Wagyu Beef Burger",
          category: t.mainCourse,
          orders: 385,
          revenue: "$8,470",
          rating: "4.7/5",
          status: "Stable",
        },
        {
          name: "Classic Margarita",
          category: t.beverages,
          orders: 294,
          revenue: "$3,528",
          rating: "4.5/5",
          status: "High Margin",
        },
      ];

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-[#f5f5f9]"}`}>
      <TopBar
        title={t.title}
        subtitle={t.subtitle}
        language={language}
        onLanguageChange={(nextLanguage) => {
          localStorage.setItem("pos_language", nextLanguage);
          window.dispatchEvent(new Event("pos-language-change"));
        }}
        notifications={[]}
        dark={dark}
      />
      
      {/* Sub-Header Control Bar matching Staff & Roles / Permissions */}
      <div className={`px-4 pt-4 lg:px-6 flex border-b shrink-0 print:hidden ${dark ? "border-[#4e4f6e]" : "border-[#d9dee3]"}`}>
        <div className="mx-auto w-full max-w-[1400px] flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left Side: Live Badge & Last Updated */}
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-[#e8fadf] px-2.5 py-0.5 text-xs font-semibold text-[#71dd37]">
              {t.live}
            </span>
            <span className={`text-xs ${textSecondary} font-medium`}>
              {lastUpdated
                ? `${t.updated} ${lastUpdated.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : t.loadingReports}
            </span>
          </div>

          {/* Right Side: Calendar & Export Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCalendar((value) => !value)}
                className={`flex h-9 w-full items-center justify-between gap-3 px-3 text-xs font-semibold sm:w-[260px] ${inputClass}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarDays size={14} className={textSecondary} />
                  <span className="truncate">{dateRange}</span>
                </span>
                <ChevronDown size={13} className={textSecondary} />
              </button>

              {showCalendar && (
                <div
                  className={`absolute right-0 top-12 z-30 w-full rounded border p-4 shadow-lg sm:w-[320px] ${surface} ${borderCol}`}
                >
                  <label
                    className={`mb-2 block text-[11px] font-bold uppercase tracking-wide ${textSecondary}`}
                  >
                    {t.reportRange}
                  </label>

                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {(["day", "month", "year"] as ReportPeriod[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setSelectedPeriod(period)}
                        className={`h-9 rounded text-xs font-semibold capitalize transition-all ${
                          selectedPeriod === period
                            ? "bg-[#0F522B] text-white shadow-sm shadow-[#0F522B]/20"
                            : dark
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-[#eceef1]/60 text-[#8592a3] hover:bg-[#f5f5f9] hover:text-[#0F522B]"
                        }`}
                      >
                        {t[period]}
                      </button>
                    ))}
                  </div>

                  {selectedPeriod === "day" && (
                    <input
                      type="date"
                      value={selectedDay}
                      onChange={(event) => setSelectedDay(event.target.value)}
                      className={`h-10 w-full px-3 text-sm outline-none ${inputClass}`}
                      aria-label={t.selectDay}
                    />
                  )}

                  {selectedPeriod === "month" && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                      className={`h-10 w-full px-3 text-sm outline-none ${inputClass}`}
                      aria-label={t.selectMonth}
                    />
                  )}

                  {selectedPeriod === "year" && (
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      className={`h-10 w-full px-3 text-sm outline-none ${inputClass}`}
                      aria-label={t.selectYear}
                    />
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDay(dayInputValue(new Date()));
                        setSelectedMonth(monthInputValue(new Date()));
                        setSelectedYear(String(new Date().getFullYear()));
                        setSelectedPeriod("day");
                        setShowCalendar(false);
                      }}
                      className="h-9 rounded bg-[#0F522B] px-3 text-xs font-semibold text-white hover:bg-[#0A3E20]"
                    >
                      {t.current}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className={`h-9 rounded border px-3 text-xs font-semibold border-[#d9dee3] ${textSecondary} hover:bg-[#f5f5f9] transition-all`}
                    >
                      {t.close}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExport((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0F522B] px-4 text-xs font-semibold text-white hover:bg-[#0A3E20] active:scale-95 transition-all shadow-sm shadow-[#0F522B]/20"
              >
                <Download size={14} />
                <span>{t.export}</span>
                <ChevronDown size={13} />
              </button>

              {showExport && (
                <div
                  className={`absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border py-1.5 shadow-xl ${surface} ${borderCol}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      void downloadCsv(exportCsvUrl, exportCsvName).catch((err) => setError(err.message));
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${
                      dark ? "hover:bg-[#232333]" : ""
                    } ${textPrimary}`}
                  >
                    <Download size={14} className="text-[#696cff]" />
                    <span>{t.downloadCsv}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      exportPdfDirect({
                        restaurantName: "POS RESTAURANT",
                        dateRange,
                        totalRevenue,
                        totalOrders,
                        averageTicket,
                        topProducts,
                        filename: `orders-report-${selectedPeriod}-${selectedDate}.pdf`,
                      });
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${
                      dark ? "hover:bg-[#232333]" : ""
                    } ${textPrimary}`}
                  >
                    <FileText size={14} className="text-emerald-500" />
                    <span>{language === "km" ? "ទាញយកជា PDF (.pdf)" : "Download PDF (.pdf)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      setShowCalendar(false);
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${
                      dark ? "hover:bg-[#232333]" : ""
                    } ${textPrimary}`}
                  >
                    <Printer size={14} className="text-amber-500" />
                    <span>{language === "km" ? "រក្សាទុកជា PDF / បោះពុម្ព (Print)" : "Print / Browser PDF"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 animate-[usersPageIn_520ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mx-auto w-full max-w-[1400px]" id="report-printable-area">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 print:hidden">
              {error}
            </div>
          )}

          {/* Print-Only Official Report Header */}
          <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-lg bg-[#696cff] text-white flex items-center justify-center font-black text-lg">P</div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">POS RESTAURANT MANAGEMENT</h1>
            </div>
            <h2 className="text-xs font-extrabold text-[#696cff] uppercase tracking-widest mb-1.5">
              {language === "km" ? "របាយការណ៍ហិរញ្ញវត្ថុ និងការវិភាគប្រតិបត្តិការផ្លូវការ" : "Official Financial & Analytics Report"}
            </h2>
            <div className="text-xs text-slate-500 font-medium">
              {language === "km" ? "ចន្លោះពេល:" : "Period:"} <span className="font-bold text-slate-800">{dateRange}</span> &nbsp;|&nbsp; {language === "km" ? "ថ្ងៃបោះពុម្ព:" : "Printed:"} <span className="font-bold text-slate-800">{new Date().toLocaleDateString(dateLocale)} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          <section className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
            <MetricCard
              icon={<TrendingUp size={22} />}
              tone="green"
              label={t.totalRevenue}
              value={loading ? "..." : money(totalRevenue)}
              delta={`${money(todayRevenue)} ${t.today}`}
              dark={dark}
            />

            <MetricCard
              icon={<ShoppingCart size={22} />}
              tone="blue"
              label={t.totalOrders}
              value={loading ? "..." : totalOrders.toLocaleString()}
              delta={`${daily?.orderCount || 0} ${t.today}`}
              dark={dark}
            />

            <MetricCard
              icon={<Users size={22} />}
              tone="orange"
              label={t.averageTicket}
              value={money(averageTicket)}
              delta="-2.4%"
              muted
              dark={dark}
            />


          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[1fr_340px]">
            <div className={`${cardClass} p-4`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>{t.revenueTrend}</h2>
                  <p className={`mt-1 text-sm ${textSecondary}`}>
                    {t.revenueTrendDesc} {monthTitle}
                  </p>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTrendDropdown(!showTrendDropdown)}
                    className={`flex h-9 items-center gap-6 rounded border px-3 text-xs font-semibold border-[#d9dee3] ${softSurface} ${textPrimary} hover:bg-[#f5f5f9] transition-all`}
                  >
                    {selectedPeriod === "day" ? t.hourly : selectedPeriod === "year" ? t.monthly : t.daily}
                    <ChevronDown size={14} />
                  </button>

                  {showTrendDropdown && (
                    <div className={`absolute right-0 top-11 z-30 w-36 overflow-hidden rounded-lg border py-1.5 shadow-xl ${surface} ${borderCol}`}>
                      <button
                        type="button"
                        onClick={() => { setSelectedPeriod("day"); setShowTrendDropdown(false); }}
                        className={`block w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${textPrimary}`}
                      >
                        {t.hourly}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedPeriod("month"); setShowTrendDropdown(false); }}
                        className={`block w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${textPrimary}`}
                      >
                        {t.daily}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedPeriod("year"); setShowTrendDropdown(false); }}
                        className={`block w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#696cff] ${textPrimary}`}
                      >
                        {t.monthly}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`relative h-[220px] rounded-lg border ${borderCol} ${softSurface}`}
              >
                <div
                  className={`absolute inset-x-0 top-1/3 border-t ${borderCol}`}
                />
                <div
                  className={`absolute inset-x-0 top-2/3 border-t ${borderCol}`}
                />

                <div className="absolute inset-x-2 bottom-7 top-4 flex items-end justify-between gap-1 sm:gap-2">
                  {trendRows.map((bar, index) => (
                    <div key={index} className="flex h-full flex-1 flex-col justify-end group relative">
                      <div
                        className={`rounded-t-md mx-auto w-full max-w-[36px] transition-all duration-300 group-hover:opacity-80 ${
                          bar.peak
                            ? "bg-[#696cff] shadow-[0_-4px_12px_rgba(105,108,255,0.3)]"
                            : dark
                              ? "bg-[#696cff]/40 hover:bg-[#696cff]/60"
                              : "bg-[#696cff]/20 hover:bg-[#696cff]/40"
                        }`}
                        style={{ height: `${bar.height}%` }}
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        {money(bar.total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute inset-x-2 bottom-1 flex justify-between text-[10px] font-bold uppercase text-[#a1acb8] px-2 sm:px-4">
                  {trendRows.map((bar, index) => (
                    <span key={index} className="flex-1 text-center truncate">{bar.label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${cardClass} p-4`}>
              <h2 className={`text-lg font-bold ${textPrimary}`}>{t.topCategories}</h2>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                {t.categoryDistribution}
              </p>

              <div
                className="mx-auto mt-5 grid h-[150px] w-[150px] place-items-center rounded-full"
                style={{ background: `conic-gradient(${categoryStops})` }}
              >
                <div
                  className={`grid h-[112px] w-[112px] place-items-center rounded-full text-center ${surface}`}
                >
                  <div>
                    <div className={`text-2xl font-bold ${textPrimary}`}>
                      {mainCategoryPercent}%
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                      {categories[0]?.label || t.sales}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.label}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${borderCol} ${softSurface}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${category.color}`} />
                      <span className={`truncate text-sm font-medium ${textPrimary}`}>
                        {category.label}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-slate-500">
                      {compactMoney(category.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>



          <section className={`overflow-hidden rounded border shadow-sm ${surface} ${borderCol}`}>
            <div className="flex h-14 items-center justify-between border-b border-[#f0f2f5] px-4">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>{t.itemPerformance}</h2>
                <p className={`hidden text-xs sm:block ${textSecondary}`}>
                  {t.itemPerformanceDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void downloadCsv(exportCsvUrl, exportCsvName).catch((err) => setError(err.message))}
                className="inline-flex items-center gap-2 rounded bg-[#696cff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5f61e6] active:scale-95 transition-all shadow-sm shadow-[#696cff]/20 print:hidden"
              >
                <Download size={14} />
                {t.exportCsv}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead
                  className="text-[11px] uppercase tracking-wide bg-[#eceef1]/40 text-[#8592a3]"
                >
                  <tr>
                    <th className="px-4 py-3 font-bold">{t.itemName}</th>
                    <th className="px-4 py-3 font-bold">{t.category}</th>
                    <th className="px-4 py-3 text-center font-bold">{t.orders}</th>
                    <th className="px-4 py-3 text-center font-bold">{t.revenue}</th>
                    <th className="px-4 py-3 text-center font-bold">{t.avgRating}</th>
                    <th className="px-4 py-3 text-center font-bold">{t.status}</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleItemRows.map((item) => (
                    <tr
                      key={item.name}
                      className={`border-t ${
                        dark
                          ? "border-[#4e4f6e] hover:bg-[#232333]/60"
                          : "border-[#f0f2f5] hover:bg-[#f5f5f9]"
                      } transition-all duration-150`}
                    >
                      <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#8592a3]">
                        {item.category}
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${textPrimary}`}>
                        {item.orders}
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${textPrimary}`}>
                        {item.revenue}
                      </td>
                      <td className={`px-4 py-3 text-center font-medium ${textPrimary}`}>
                        {item.rating}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Print-Only Official Signature Section */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-300 page-break-inside-avoid">
            <div className="flex items-center justify-between px-8 text-xs font-semibold text-slate-700">
              <div className="text-center">
                <div className="mb-14">{language === "km" ? "អ្នករៀបចំរបាយការណ៍ (Prepared By)" : "Prepared By"}</div>
                <div className="w-48 border-b border-slate-400 mx-auto" />
                <div className="mt-1 text-[11px] text-slate-500 font-normal">{language === "km" ? "ហត្ថលេខា និង ឈ្មោះ" : "Signature & Name"}</div>
              </div>

              <div className="text-center">
                <div className="mb-14">{language === "km" ? "អ្នកត្រួតពិនិត្យ / ម្ចាស់ហាង (Approved By)" : "Approved By"}</div>
                <div className="w-48 border-b border-slate-400 mx-auto" />
                <div className="mt-1 text-[11px] text-slate-500 font-normal">{language === "km" ? "ហត្ថលេខា និង ត្រាហាង" : "Signature & Stamp"}</div>
              </div>
            </div>
          </div>

          <footer className="py-6 text-center text-xs font-medium text-slate-400 print:mt-6">
            © {now.getFullYear()} {t.footer}
          </footer>
        </div>
      </div>

      <style>{`
        @keyframes usersPageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function AnimatedCounter({ value }: { value?: string | number | null }) {
  const strVal = String(value ?? "");
  const match = strVal.match(/([^0-9.-]*)([0-9.,]+)(.*)/);

  const prefix = match ? match[1] || "" : "";
  const rawNumStr = match ? match[2].replace(/,/g, "") : "";
  const suffix = match ? match[3] || "" : "";
  const targetNum = match ? parseFloat(rawNumStr) : NaN;
  const isNumeric = match ? !isNaN(targetNum) : false;

  const decimalPlaces = isNumeric && rawNumStr.includes(".") ? rawNumStr.split(".")[1].length : 0;

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isNumeric) return;

    let startTimestamp: number | null = null;
    const duration = 900;

    function step(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setCount(targetNum * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(targetNum);
      }
    }

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetNum, isNumeric]);

  if (!match || !isNumeric) return <>{strVal}</>;

  const formattedNum = count.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <>
      {prefix}
      {formattedNum}
      {suffix}
    </>
  );
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  delta,
  muted = false,
  dark,
}: {
  icon: ReactNode;
  tone: "green" | "blue" | "orange" | "purple";
  label: string;
  value: string;
  delta: string;
  muted?: boolean;
  dark: boolean;
}) {
  const tones = {
    green: "bg-[#e8fadf] text-[#71dd37]",
    blue: "bg-[#e7e7ff] text-[#696cff]",
    orange: "bg-[#fff2e2] text-[#ff9f43]",
    purple: "bg-[#f2e7ff] text-[#8553f4]",
  };

  return (
    <div
      className={`rounded border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-[#e5e7eb] bg-white"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#a1acb8]">{label}</div>
          <div
            className={`mt-1 text-2xl font-bold tracking-tight ${
              dark ? "text-slate-100" : "text-[#566a7f]"
            }`}
          >
            <AnimatedCounter value={value} />
          </div>
        </div>

        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded ${tones[tone]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
            muted
              ? dark
                ? "bg-slate-800 text-slate-400"
                : "bg-[#eceef1]/60 text-[#8592a3]"
              : "bg-[#e8fadf] text-[#71dd37]"
          }`}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "Trending"
      ? "bg-[#e8fadf] text-[#71dd37]"
      : status === "Stable"
        ? "bg-[#e7e7ff] text-[#696cff]"
        : "bg-[#fff2e2] text-[#ff9f43]";

  return (
    <span className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase ${style}`}>
      {status}
    </span>
  );
}
