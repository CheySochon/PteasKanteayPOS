"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  RotateCw,
  Boxes,
  AlertTriangle,
  AlertCircle,
  Package,
  PackageCheck,
  PackageX,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  ListFilter,
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
  getSettings,
  getTopProducts,
  request,
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
  preparedBy,
  dateRange,
  totalRevenue,
  totalOrders,
  averageTicket,
  topProducts,
  filename,
}: {
  restaurantName: string;
  preparedBy?: string;
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

  // Top Accent Bar (Brand Green #55a060)
  doc.setFillColor(85, 160, 96);
  doc.rect(14, 10, 182, 2.5, "F");

  // Centered Header Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text((restaurantName || "POS RESTAURANT").toUpperCase(), 105, 20, { align: "center" });

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(85, 160, 96);
  doc.text("OFFICIAL FINANCIAL & ANALYTICS REPORT", 105, 26, { align: "center" });

  // Date Range & Metadata
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Report Period: ${dateRange}   |   Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    105,
    32,
    { align: "center" },
  );

  // Separator Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 36, 196, 36);

  // Executive Summary KPI Cards (3 Equal Columns)
  const cardY = 42;
  const cardH = 25;
  const cardW = 57;

  const drawCard = (
    x: number,
    label: string,
    valueStr: string,
    subText: string,
    indicatorRgb: [number, number, number],
  ) => {
    // Card Background & Soft Border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "FD");

    // Left Vertical Indicator Pill
    doc.setFillColor(...indicatorRgb);
    doc.roundedRect(x, cardY, 2.5, cardH, 1, 1, "F");

    // Metric Label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 7, cardY + 8);

    // Primary Value
    doc.setFontSize(13.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(valueStr, x + 7, cardY + 16.5);

    // Secondary Subtext
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(subText, x + 7, cardY + 21.5);
  };

  drawCard(14, "TOTAL REVENUE", `$${totalRevenue.toFixed(2)}`, "Gross Period Revenue", [85, 160, 96]);
  drawCard(76.5, "TOTAL ORDERS", `${totalOrders} Orders`, "Completed Orders", [59, 130, 246]);
  drawCard(139, "AVERAGE TICKET", `$${averageTicket.toFixed(2)}`, "Avg Revenue per Order", [245, 158, 11]);

  // Section Title
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Item Performance & Revenue Breakdown", 14, 77);

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
    startY: 81,
    head: [["Item Name", "Category", "Orders Sold", "Total Revenue", "Avg Rating", "Status"]],
    body: tableRows.length
      ? tableRows
      : [["No product sales recorded for this period", "-", "-", "$0.00", "-", "-"]],
    theme: "grid",
    headStyles: {
      fillColor: [85, 160, 96], // Brand Green #55a060
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
      1: { halign: "left" },
      2: { halign: "center" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "center" },
      5: { halign: "center" },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.8,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 251],
    },
    tableLineWidth: 0.2,
    tableLineColor: [226, 232, 240],
    margin: { left: 14, right: 14 },
  });

  // Signature Block
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 18 : 180;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, finalY, 196, finalY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  // Prepared By
  doc.text("Prepared By:", 24, finalY + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(preparedBy || "Admin", 24, finalY + 17.5);

  doc.setDrawColor(203, 213, 225);
  doc.line(24, finalY + 24, 84, finalY + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Signature & Name", 24, finalY + 29);

  // Approved By
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Approved By (Store Manager):", 126, finalY + 10);
  doc.setDrawColor(203, 213, 225);
  doc.line(126, finalY + 24, 186, finalY + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Signature & Stamp", 126, finalY + 29);

  // Footer Notice
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`© ${new Date().getFullYear()} ${restaurantName || "POS Restaurant"}. Confidential Financial Report. Page 1 of 1`, 105, 287, { align: "center" });

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

  const [reportTab, setReportTab] = useState<"analytics" | "stock">("analytics");
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  const [restaurantName, setRestaurantName] = useState("ផ្ទះកន្ត្រាយ");
  const [preparedByName, setPreparedByName] = useState("Admin");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("pos_user");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u?.name) setPreparedByName(u.name);
      }
    } catch {}

    getSettings()
      .then((settings) => {
        if (settings?.restaurantName || (settings as any)?.name) {
          setRestaurantName(settings.restaurantName || (settings as any).name);
        }
      })
      .catch(() => {
        try {
          const storedSettings = localStorage.getItem("pos_settings");
          if (storedSettings) {
            const s = JSON.parse(storedSettings);
            if (s?.name || s?.restaurantName) {
              setRestaurantName(s.restaurantName || s.name);
            }
          }
        } catch {}
      });
  }, []);

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f8fafc]";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-slate-200/80";
  const textPrimary = dark ? "text-slate-100" : "text-[#2c3e50]";
  const textSecondary = dark ? "text-slate-400" : "text-[#64748b]";

  const cardClass = `rounded-2xl border ${borderCol} ${surface} shadow-none`;
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
      request<any[]>("/inventory").catch(() => []),
      request<any[]>("/inventory/transactions").catch(() => []),
    ])
      .then(([dailyRows, monthlyRows, topRows, invRows, movRows]) => {
        setDaily(dailyRows);
        setMonthly(monthlyRows);
        setTopProducts(topRows);
        setInventoryItems(Array.isArray(invRows) ? invRows : []);
        setStockMovements(Array.isArray(movRows) ? movRows : []);
        setLastUpdated(new Date());
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate, selectedPeriod]);

  const adjustDate = (direction: "prev" | "next") => {
    const d = new Date(`${selectedDate}T00:00:00`);
    if (selectedPeriod === "day") {
      d.setDate(d.getDate() + (direction === "prev" ? -1 : 1));
      setSelectedDay(dayInputValue(d));
    } else if (selectedPeriod === "month") {
      d.setMonth(d.getMonth() + (direction === "prev" ? -1 : 1));
      setSelectedMonth(monthInputValue(d));
    } else {
      d.setFullYear(d.getFullYear() + (direction === "prev" ? -1 : 1));
      setSelectedYear(String(d.getFullYear()));
    }
  };

  useEffect(() => {
    refreshReports();

    const socket = getSocket();
    const onRealtimeUpdate = () => refreshReports();
    const refreshTimer = window.setInterval(refreshReports, 60000);

    socket?.on("dashboard:update", onRealtimeUpdate);
    socket?.on("order:created", onRealtimeUpdate);
    socket?.on("order:updated", onRealtimeUpdate);

    return () => {
      socket?.off("dashboard:update", onRealtimeUpdate);
      socket?.off("order:created", onRealtimeUpdate);
      socket?.off("order:updated", onRealtimeUpdate);
      window.clearInterval(refreshTimer);
    };
  }, [refreshReports]);

  const totalRevenue = Number(monthly?.totalSales || daily?.totalSales || 0);
  const totalOrders = Number(monthly?.orderCount || daily?.orderCount || 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const todayRevenue = Number(daily?.totalSales || 0);
  const tableTurnover =
    totalOrders > 0 ? `${Math.max(18, Math.round(720 / totalOrders))} min` : "--";

  const stockMetrics = useMemo(() => {
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryItems.forEach((item) => {
      const qty = Number(item.inventory?.quantity || 0);
      const minStock = Number(item.inventory?.minStock || 10);
      const price = Number(item.basePrice || 0);

      totalValuation += qty * price;
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= minStock) {
        lowStockCount++;
      }
    });

    return {
      totalValuation,
      lowStockCount,
      outOfStockCount,
      totalItems: inventoryItems.length,
      totalMovements: stockMovements.length,
    };
  }, [inventoryItems, stockMovements]);

  const filteredInventoryItems = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const catName = (item.category?.name || "").toLowerCase();
      const matchesSearch = !query || name.includes(query) || catName.includes(query);

      const qty = Number(item.inventory?.quantity || 0);
      const minStock = Number(item.inventory?.minStock || 10);

      const matchesFilter =
        stockFilter === "all" ||
        (stockFilter === "low" && qty <= minStock && qty > 0) ||
        (stockFilter === "out" && qty === 0);

      return matchesSearch && matchesFilter;
    });
  }, [inventoryItems, stockFilter, stockSearch]);

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
  const yearStart = new Date(selectedRangeDate.getFullYear(), 0, 1);
  const yearEnd = new Date(selectedRangeDate.getFullYear(), 11, 31);

  const startDateText =
    selectedPeriod === "day"
      ? new Intl.DateTimeFormat(dateLocale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(selectedRangeDate)
      : selectedPeriod === "year"
        ? new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(yearStart)
        : new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(monthStart);

  const endDateText =
    selectedPeriod === "day"
      ? new Intl.DateTimeFormat(dateLocale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(selectedRangeDate)
      : selectedPeriod === "year"
        ? new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(yearEnd)
        : new Intl.DateTimeFormat(dateLocale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(monthEnd);

  const dateRange = `${startDateText} - ${endDateText}`;

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

  const itemRows = topProducts.slice(0, 5).map((item, index) => {
    const sales = Number(item.totalSales || 0);
    const qty = Number(item.quantity || 0);
    
    // Dynamic status badge based on real sales rank and volume
    let statusText = "High Margin";
    if (index === 0 && qty > 0) statusText = "Best Seller";
    else if (index === 1 && qty > 0) statusText = "Trending";
    else if (qty > 10) statusText = "Stable";

    // Dynamic rating calculation based on sales popularity (4.5 to 5.0 scale)
    const computedRating = (4.5 + Math.min(0.5, (qty / 100) * 0.5)).toFixed(1);

    return {
      name: item.productName,
      category: item.categoryName || t.uncategorized,
      orders: qty,
      revenue: money(sales),
      rating: `${computedRating}/5`,
      status: statusText,
    };
  });

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
    <main className={`flex-1 overflow-y-auto ${dark ? "bg-[#232333]" : "bg-[#f8faf9]"}`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
        {/* Sub-Header Control Bar matching Staff & Roles / Permissions */}
        <div className="pt-1 flex shrink-0 print:hidden mb-4">
          <div className="w-full flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex items-center gap-2">
              {/* Report Tab Switcher */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${borderCol} ${softSurface}`}>
                <button
                  type="button"
                  onClick={() => setReportTab("analytics")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportTab === "analytics"
                      ? "bg-[#55a060] text-white shadow-xs"
                      : dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>{language === "km" ? "របាយការណ៍ការលក់" : "Sales & Analytics"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportTab("stock")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportTab === "stock"
                      ? "bg-[#55a060] text-white shadow-xs"
                      : dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Boxes size={14} />
                  <span>{language === "km" ? "របាយការណ៍ស្តុក (Stock Details)" : "Stock Details Report"}</span>
                  {stockMetrics.lowStockCount > 0 && (
                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white px-1">
                      {stockMetrics.lowStockCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Funnel Filter Icon Button with Text */}
              <button
                type="button"
                onClick={() => setShowCalendar((value) => !value)}
                className={`flex h-9 items-center justify-center gap-2 px-3 rounded-lg border text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  dark
                    ? "border-[#4e4f6e] bg-[#2b2c40] text-slate-300 hover:bg-[#34354f]"
                    : "border-slate-200 bg-white text-slate-650 hover:bg-slate-50"
                }`}
                title="Filter Report"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-500"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span>{language === "km" ? "តម្រង" : "Filter"}</span>
              </button>

              {showCalendar && (
                <>
                  {/* Backdrop overlay */}
                  <div
                    className="fixed inset-0 z-[100] bg-slate-900/40 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
                    onClick={() => setShowCalendar(false)}
                  >
                    {/* Modal container */}
                    <div
                      className={`relative w-full max-w-[500px] rounded-2xl border ${borderCol} ${surface} p-5 shadow-2xl flex flex-col gap-4 animate-[scaleIn_200ms_ease-out]`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Modal Header */}
                      <div className={`flex items-center gap-2 text-lg font-semibold ${textPrimary}`}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-550"
                        >
                          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <span>Filter</span>
                      </div>

                      {/* Modal Body */}
                      <div className="flex flex-col gap-4">
                        {/* Period select dropdown */}
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-500">
                            Filter
                          </label>
                          <div className="relative">
                            <select
                              value={selectedPeriod}
                              onChange={(event) => {
                                const period = event.target.value as ReportPeriod;
                                setSelectedPeriod(period);
                                if (period === "day") {
                                  setSelectedDay(dayInputValue(new Date()));
                                } else if (period === "month") {
                                  setSelectedMonth(monthInputValue(new Date()));
                                } else {
                                  setSelectedYear(String(new Date().getFullYear()));
                                }
                              }}
                              className={`h-10 w-full rounded-lg border border-slate-200 px-3 pr-10 text-sm font-normal outline-none text-slate-700 bg-white focus:border-[#55a060] transition-all cursor-pointer appearance-none`}
                            >
                              <option value="day">Today</option>
                              <option value="month">This Month</option>
                              <option value="year">This Year</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>

                        {/* From & To inputs side-by-side */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-500">
                              From
                            </label>
                            <input
                              type="date"
                              value={
                                selectedPeriod === "day"
                                  ? selectedDay
                                  : selectedPeriod === "year"
                                    ? `${selectedYear}-01-01`
                                    : `${selectedMonth}-01`
                              }
                              onChange={(event) => {
                                const val = event.target.value;
                                if (!val) return;
                                if (selectedPeriod === "day") {
                                  setSelectedDay(val);
                                } else if (selectedPeriod === "month") {
                                  setSelectedMonth(val.substring(0, 7)); // YYYY-MM
                                } else {
                                  setSelectedYear(val.substring(0, 4)); // YYYY
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none text-slate-700 bg-white focus:border-[#55a060] transition-all cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-500">
                              To
                            </label>
                            <input
                              type="date"
                              value={
                                selectedPeriod === "day"
                                  ? selectedDay
                                  : selectedPeriod === "year"
                                    ? `${selectedYear}-12-31`
                                    : (() => {
                                        const parts = selectedMonth.split("-");
                                        const year = parseInt(parts[0], 10);
                                        const month = parseInt(parts[1], 10);
                                        const lastDay = new Date(year, month, 0).getDate();
                                        return `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
                                      })()
                              }
                              onChange={(event) => {
                                const val = event.target.value;
                                if (!val) return;
                                if (selectedPeriod === "day") {
                                  setSelectedDay(val);
                                } else if (selectedPeriod === "month") {
                                  setSelectedMonth(val.substring(0, 7)); // YYYY-MM
                                } else {
                                  setSelectedYear(val.substring(0, 4)); // YYYY
                                }
                              }}
                              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal outline-none text-slate-700 bg-white focus:border-[#55a060] transition-all cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-end gap-2.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowCalendar(false)}
                          className="h-10 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/85 px-5 text-sm font-medium text-slate-600 transition-all cursor-pointer outline-none active:scale-[0.98]"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            refreshReports();
                            setShowCalendar(false);
                          }}
                          className="h-10 rounded-lg bg-[#55a060] hover:bg-[#498c53] px-5 text-sm font-medium text-white transition-all cursor-pointer border border-transparent outline-none active:scale-[0.98]"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExport((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#55a060] px-4 text-xs font-semibold text-white hover:bg-[#488c52] active:scale-95 transition-all shadow-sm shadow-[#55a060]/20 cursor-pointer"
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
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold hover:bg-[#f5f5f9] hover:text-[#55a060] ${
                      dark ? "hover:bg-[#232333]" : ""
                    } ${textPrimary}`}
                  >
                    <Download size={14} className="text-[#55a060]" />
                    <span>{t.downloadCsv}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      exportPdfDirect({
                        restaurantName: restaurantName || "ផ្ទះកន្ត្រាយ",
                        preparedBy: preparedByName || "Admin",
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
      
        <div className="w-full" id="report-printable-area">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 print:hidden">
              {error}
            </div>
          )}

          {/* Print-Only Official Report Header */}
          <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-1">
              <div className="h-8 w-8 rounded-lg bg-[#55a060] text-white flex items-center justify-center font-black text-lg">
                {(restaurantName || "P")[0].toUpperCase()}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {(restaurantName || "POS RESTAURANT").toUpperCase()}
              </h1>
            </div>
            <h2 className="text-xs font-extrabold text-[#55a060] uppercase tracking-widest mb-1.5">
              {language === "km" ? "របាយការណ៍ហិរញ្ញវត្ថុ និងការវិភាគប្រតិបត្តិការផ្លូវការ" : "Official Financial & Analytics Report"}
            </h2>
            <div className="text-xs text-slate-500 font-medium">
              {language === "km" ? "ចន្លោះពេល:" : "Period:"} <span className="font-bold text-slate-800">{dateRange}</span> &nbsp;|&nbsp; {language === "km" ? "ថ្ងៃបោះពុម្ព:" : "Printed:"} <span className="font-bold text-slate-800">{new Date().toLocaleDateString(dateLocale)} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {reportTab === "stock" ? (
            <div className="space-y-6">
              {/* 4 Stock Metric Cards */}
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={<Boxes size={22} />}
                  tone="green"
                  label={language === "km" ? "តម្លៃស្តុកសរុប (Valuation)" : "Total Stock Valuation"}
                  value={money(stockMetrics.totalValuation)}
                  dark={dark}
                />
                <MetricCard
                  icon={<AlertTriangle size={22} />}
                  tone="orange"
                  label={language === "km" ? "ទំនិញជិតអស់ពីស្តុក (Low Stock)" : "Low Stock Alerts"}
                  value={loading ? "..." : String(stockMetrics.lowStockCount)}
                  dark={dark}
                />
                <MetricCard
                  icon={<PackageX size={22} />}
                  tone="purple"
                  label={language === "km" ? "ទំនិញអស់ពីស្តុក (Out of Stock)" : "Out of Stock Items"}
                  value={loading ? "..." : String(stockMetrics.outOfStockCount)}
                  dark={dark}
                />
                <MetricCard
                  icon={<RotateCw size={22} />}
                  tone="blue"
                  label={language === "km" ? "ប្រវត្តិលំហូរស្តុកសរុប" : "Stock Transactions"}
                  value={loading ? "..." : String(stockMetrics.totalMovements)}
                  dark={dark}
                />
              </section>

              {/* Inventory Stock Levels & Valuation Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <h2 className={`text-base font-bold ${textPrimary}`}>
                      {language === "km" ? "បញ្ជីតម្លៃ និងកម្រិតស្តុកទំនិញ (Inventory Stock & Valuation)" : "Inventory Stock & Valuation"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Stock Filter Buttons */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl border ${borderCol} ${softSurface}`}>
                      <button
                        type="button"
                        onClick={() => setStockFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          stockFilter === "all" ? "bg-[#55a060] text-white" : dark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {language === "km" ? "ទាំងអស់" : "All"} ({inventoryItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockFilter("low")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          stockFilter === "low" ? "bg-amber-500 text-white" : dark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {language === "km" ? "ជិតអស់" : "Low"} ({stockMetrics.lowStockCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStockFilter("out")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          stockFilter === "out" ? "bg-red-500 text-white" : dark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {language === "km" ? "អស់ស្តុក" : "Out"} ({stockMetrics.outOfStockCount})
                      </button>
                    </div>

                    {/* Search Box */}
                    <div className="relative min-w-[200px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={language === "km" ? "ស្វែងរកស្តុកទំនិញ..." : "Search stock..."}
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className={`h-8.5 w-full rounded-lg border ${borderCol} ${softSurface} pl-9 pr-3 text-xs outline-none ${textPrimary} focus:border-[#55a060]`}
                      />
                    </div>
                  </div>
                </div>

                <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/90 bg-white shadow-xs"}`}>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                          dark ? "bg-[#1e1f2e] border-[#3b3c54] text-slate-300" : "bg-slate-50 border-slate-200/80 text-slate-600"
                        }`}>
                          <th className="px-4 py-3.5 whitespace-nowrap">{language === "km" ? "ឈ្មោះទំនិញ" : "Product Item"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap">{language === "km" ? "ប្រភេទ" : "Category"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-center">{language === "km" ? "កម្រិតស្តុក" : "Stock Level"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-right">{language === "km" ? "តម្លៃ/ឯកតា" : "Unit Price"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-right">{language === "km" ? "តម្លៃស្តុកសរុប" : "Total Valuation"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-center">{language === "km" ? "ស្ថានភាព" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                        {filteredInventoryItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                              {language === "km" ? "មិនមានទិន្នន័យស្តុកទេ" : "No stock inventory data found"}
                            </td>
                          </tr>
                        ) : (
                          filteredInventoryItems.map((item) => {
                            const qty = Number(item.inventory?.quantity || 0);
                            const minStock = Number(item.inventory?.minStock || 10);
                            const price = Number(item.basePrice || 0);
                            const totalVal = qty * price;
                            const unitStr = item.unit || "pc";

                            const isOut = qty === 0;
                            const isLow = qty > 0 && qty <= minStock;

                            return (
                              <tr key={item.id} className={`transition-colors duration-150 ${dark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/70"}`}>
                                <td className={`px-4 py-3.5 whitespace-nowrap font-semibold ${textPrimary}`}>
                                  {item.name}
                                </td>
                                <td className={`px-4 py-3.5 whitespace-nowrap font-medium ${textSecondary}`}>
                                  {item.category?.name || "Uncategorized"}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold">
                                  <span className={`${isOut ? "text-red-500 font-black" : isLow ? "text-amber-500 font-extrabold" : textPrimary}`}>
                                    {qty} {unitStr}
                                  </span>
                                </td>
                                <td className={`px-4 py-3.5 whitespace-nowrap text-right font-medium ${textPrimary}`}>
                                  {money(price)}
                                </td>
                                <td className={`px-4 py-3.5 whitespace-nowrap text-right font-bold text-[#55a060] dark:text-emerald-400`}>
                                  {money(totalVal)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                  {isOut ? (
                                    <span className="rounded px-2.5 py-1 text-[10px] font-black uppercase bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                                      {language === "km" ? "អស់ស្តុក" : "Out of Stock"}
                                    </span>
                                  ) : isLow ? (
                                    <span className="rounded px-2.5 py-1 text-[10px] font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                      {language === "km" ? "ជិតអស់" : "Low Stock"}
                                    </span>
                                  ) : (
                                    <span className="rounded px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                      {language === "km" ? "មានស្តុក" : "In Stock"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Stock Movement Log Table */}
              <div>
                <div className="mb-3">
                  <h2 className={`text-base font-bold ${textPrimary}`}>
                    {language === "km" ? "ប្រវត្តិលំហូរស្តុកចុងក្រោយ (Stock Movement History)" : "Recent Stock Movement History"}
                  </h2>
                </div>

                <div className={`overflow-hidden rounded-2xl border ${dark ? "border-[#3b3c54] bg-[#2b2c40]" : "border-slate-200/90 bg-white shadow-xs"}`}>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                          dark ? "bg-[#1e1f2e] border-[#3b3c54] text-slate-300" : "bg-slate-50 border-slate-200/80 text-slate-600"
                        }`}>
                          <th className="px-4 py-3.5 whitespace-nowrap">{language === "km" ? "កាលបរិច្ឆេទ & ម៉ោង" : "Date & Time"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap">{language === "km" ? "មុខទំនិញ" : "Product"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-center">{language === "km" ? "ប្រភេទលំហូរ" : "Movement Type"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap text-center">{language === "km" ? "ចំនួន" : "Quantity"}</th>
                          <th className="px-4 py-3.5 whitespace-nowrap">{language === "km" ? "មូលហេតុ / អ្នកធ្វើ" : "Reason / User"}</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${dark ? "divide-[#3b3c54]" : "divide-slate-100"}`}>
                        {stockMovements.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                              {language === "km" ? "មិនទាន់មានប្រវត្តិលំហូរស្តុកទេ" : "No stock movement logs recorded yet"}
                            </td>
                          </tr>
                        ) : (
                          stockMovements.slice(0, 15).map((m: any) => {
                            const isIn = m.type === "in";
                            const isOut = m.type === "out";

                            return (
                              <tr key={m.id} className={`transition-colors duration-150 ${dark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/70"}`}>
                                <td className={`px-4 py-3.5 whitespace-nowrap font-medium ${textSecondary}`}>
                                  {new Date(m.createdAt).toLocaleDateString(dateLocale)} {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className={`px-4 py-3.5 whitespace-nowrap font-bold ${textPrimary}`}>
                                  {m.product?.name || m.productName || `Product #${m.productId || m.ingredientId || ""}`}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                  {isIn ? (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                      <ArrowDownLeft size={12} />
                                      {language === "km" ? "នាំចូល (In)" : "Stock In"}
                                    </span>
                                  ) : isOut ? (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                                      <ArrowUpRight size={12} />
                                      {language === "km" ? "ដកចេញ (Out)" : "Stock Out"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400">
                                      <RotateCw size={12} />
                                      {language === "km" ? "កែតម្រូវ" : "Adjust"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold">
                                  <span className={isIn ? "text-emerald-600 font-extrabold" : isOut ? "text-rose-600 font-extrabold" : "text-sky-600"}>
                                    {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : `${m.quantity}`}
                                  </span>
                                </td>
                                <td className={`px-4 py-3.5 whitespace-nowrap ${textSecondary}`}>
                                  {m.reason || (m.orderId ? `Order #${m.orderId}` : "Manual Update")}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <section className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
            <MetricCard
              icon={<TrendingUp size={22} />}
              tone="green"
              label={t.totalRevenue}
              value={loading ? "..." : money(totalRevenue)}
              dark={dark}
            />

            <MetricCard
              icon={<ShoppingCart size={22} />}
              tone="blue"
              label={t.totalOrders}
              value={loading ? "..." : totalOrders.toLocaleString()}
              dark={dark}
            />

            <MetricCard
              icon={<Users size={22} />}
              tone="orange"
              label={t.averageTicket}
              value={money(averageTicket)}
              dark={dark}
            />
          </section>

          <section className="mb-4 grid gap-4 xl:grid-cols-[1fr_340px]">
            <div className={`${cardClass} p-4`}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={`text-lg font-bold ${textPrimary}`}>{t.revenueTrend}</h2>
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

              <div className="relative h-[220px] w-full bg-transparent">
                <div
                  className={`absolute inset-x-0 top-1/3 border-t ${dark ? "border-slate-800/40" : "border-slate-100"}`}
                />
                <div
                  className={`absolute inset-x-0 top-2/3 border-t ${dark ? "border-slate-800/40" : "border-slate-100"}`}
                />

                <div className="absolute inset-x-2 bottom-7 top-4 flex items-end justify-between gap-1 sm:gap-2">
                  {trendRows.map((bar, index) => (
                    <div key={index} className="flex h-full flex-1 flex-col justify-end group relative">
                      <div
                        className={`rounded-t-md mx-auto w-full max-w-[28px] transition-all duration-300 group-hover:opacity-90 ${
                          bar.peak
                            ? "bg-[#696cff] shadow-xs shadow-[#696cff]/30"
                            : dark
                              ? "bg-[#696cff]/50 hover:bg-[#696cff]/70"
                              : "bg-[#696cff]/35 hover:bg-[#696cff]/60"
                        }`}
                        style={{ height: `${Math.max(bar.height, 4)}%` }}
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



          <section className={`overflow-hidden rounded-2xl border shadow-none ${surface} ${borderCol}`}>
            <div className="flex h-14 items-center justify-between border-b border-slate-200/80 dark:border-[#4e4f6e] px-4">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>{t.itemPerformance}</h2>
              </div>

              <button
                type="button"
                onClick={() => void downloadCsv(exportCsvUrl, exportCsvName).catch((err) => setError(err.message))}
                className="inline-flex items-center gap-2 rounded-lg bg-[#696cff]/10 px-4 py-2 text-xs font-bold text-[#696cff] hover:bg-[#696cff]/20 active:scale-95 transition-all print:hidden"
              >
                <Download size={14} />
                {t.exportCsv}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    dark ? "bg-[#232333]/80 text-slate-400 border-b border-[#4e4f6e]/50" : "bg-[#f5f5f9] text-[#566a7f] border-b border-slate-100"
                  }`}
                >
                  <tr>
                    <th className="px-4 py-3.5 font-bold">{t.itemName}</th>
                    <th className="px-4 py-3.5 font-bold">{t.category}</th>
                    <th className="px-4 py-3.5 text-center font-bold">{t.orders}</th>
                    <th className="px-4 py-3.5 text-center font-bold">{t.revenue}</th>
                    <th className="px-4 py-3.5 text-center font-bold">{t.avgRating}</th>
                    <th className="px-4 py-3.5 text-center font-bold">{t.status}</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleItemRows.map((item) => (
                    <tr
                      key={item.name}
                      className={`border-b last:border-b-0 ${
                        dark
                          ? "border-[#4e4f6e]/50 hover:bg-[#232333]/40"
                          : "border-slate-100 hover:bg-[#f5f5f9]/50"
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
          </>
          )}

          {/* Print-Only Official Signature Section */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-300 page-break-inside-avoid">
            <div className="flex items-center justify-between px-8 text-xs font-semibold text-slate-700">
              <div className="text-center">
                <div className="mb-2 font-bold text-slate-800">{language === "km" ? "អ្នករៀបចំរបាយការណ៍ (Prepared By)" : "Prepared By"}</div>
                <div className="mb-8 text-sm font-bold text-slate-900">{preparedByName || "Admin"}</div>
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}

function AnimatedCounter({ value }: { value?: string | number | null }) {
  const [displayValue, setDisplayValue] = useState(value ?? "");

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue("");
      return;
    }

    const strValue = String(value);
    const match = strValue.match(/[\d.]+/);
    if (!match) {
      setDisplayValue(strValue);
      return;
    }

    const targetNum = parseFloat(match[0]);
    if (Number.isNaN(targetNum)) {
      setDisplayValue(strValue);
      return;
    }

    const prefix = strValue.slice(0, match.index);
    const suffix = strValue.slice(match.index! + match[0].length);

    const decimalParts = match[0].split(".");
    const decimals = decimalParts.length > 1 ? decimalParts[1].length : 0;

    const start = 0;
    const duration = 800; // Animation duration in milliseconds
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentNum = start + targetNum * easedProgress;

      setDisplayValue(`${prefix}${currentNum.toFixed(decimals)}${suffix}`);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(strValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <>{displayValue}</>;
}

function MetricCard({
  icon,
  tone,
  label,
  value,
  dark,
}: {
  icon: ReactNode;
  tone: "green" | "blue" | "orange" | "purple";
  label: string;
  value: string;
  dark: boolean;
}) {
  const tones = {
    green: dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600",
    blue: dark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600",
    orange: dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600",
    purple: dark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600",
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-none transition-all flex items-center justify-between ${
        dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
      }`}
    >
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

      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.blue}`}>
        {icon}
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
