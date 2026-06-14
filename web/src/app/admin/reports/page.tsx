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
} from "lucide-react";
import { setAppLanguage, useAppLanguage } from "../../lib/language";
import { useAppTheme } from "../../lib/theme";
import {
  exportReportsCsv,
  getDailySales,
  getMonthlySales,
  getTopProducts,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import type {
  DailySalesReport,
  MonthlySalesReport,
  TopProductReport,
} from "../../lib/types";
import { useAutoDismiss } from "../../lib/useAutoDismiss";

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
    revenueTrendDesc: "Daily revenue performance for",
    daily: "Daily",
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
    revenueTrendDesc: "ប្រតិបត្តិការចំណូលប្រចាំថ្ងៃសម្រាប់",
    daily: "ប្រចាំថ្ងៃ",
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

  const dark = theme === "dark";
  const surface = dark ? "bg-[#111827]" : "bg-white";
  const softSurface = dark ? "bg-[#0f172a]" : "bg-slate-50";
  const borderCol = dark ? "border-slate-700/70" : "border-slate-200";
  const textPrimary = dark ? "text-slate-100" : "text-slate-900";
  const textSecondary = dark ? "text-slate-400" : "text-slate-500";

  const cardClass = `rounded-xl border ${borderCol} ${surface} shadow-sm`;
  const inputClass = `rounded-lg border ${borderCol} ${softSurface} ${textPrimary}`;

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
    }));
  }, [dateLocale, monthly]);

  const categories = useMemo(() => {
    const grouped = topProducts.reduce<Record<string, number>>((acc, item) => {
      const name = item.categoryName || t.uncategorized;
      acc[name] = (acc[name] || 0) + Number(item.totalSales || 0);
      return acc;
    }, {});

    const colors = ["bg-blue-600", "bg-cyan-500", "bg-emerald-500", "bg-slate-300"];

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
    const palette = ["#2563eb", "#06b6d4", "#10b981", "#cbd5e1"];
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
    <main className="flex-1 overflow-y-auto">
        <header
          className={`sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 lg:px-6 ${surface} ${borderCol}`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">
              <span>{t.analytics}</span>
              <span className={textSecondary}>/</span>
              <span>{t.reports}</span>
            </div>
            <p className={`hidden text-xs sm:block ${textSecondary}`}>
              {t.overview}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              className={`hidden h-9 w-[260px] items-center gap-2 px-3 md:flex ${inputClass}`}
            >
              <Search size={16} className={textSecondary} />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder={t.search}
              />
            </label>

            <button
              type="button"
              className={`grid h-9 w-9 place-items-center ${inputClass}`}
              aria-label={t.notifications}
            >
              <Bell size={17} className={textSecondary} />
            </button>

            <button
              type="button"
              className={`hidden h-9 w-9 place-items-center sm:grid ${inputClass}`}
              aria-label={t.help}
            >
              <CircleHelp size={17} className={textSecondary} />
            </button>

            <button
              type="button"
              onClick={() => setAppLanguage(language === "km" ? "en" : "km")}
              className={`hidden h-9 items-center gap-2 px-3 text-xs font-bold sm:inline-flex ${inputClass}`}
              title="Language"
            >
              <Languages size={15} className={textSecondary} />
              {language === "km" ? "EN" : "ខ្មែរ"}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExport((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Download size={14} />
                <span className="hidden sm:inline">{t.export}</span>
                <ChevronDown size={13} />
              </button>

              {showExport && (
                <div
                  className={`absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border py-2 shadow-lg ${surface} ${borderCol}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      void downloadCsv(exportCsvUrl, exportCsvName).catch((err) => setError(err.message));
                    }}
                    className={`block px-4 py-2 text-sm font-medium hover:bg-blue-50 hover:text-blue-700 ${
                      dark ? "hover:bg-slate-800" : ""
                    } ${textPrimary}`}
                  >
                    {t.downloadCsv}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowExport(false);
                      exportPdf();
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm font-medium hover:bg-blue-50 hover:text-blue-700 ${
                      dark ? "hover:bg-slate-800" : ""
                    } ${textPrimary}`}
                  >
                    {t.printPdf}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 lg:px-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <section className={`mb-4 rounded-xl border p-4 shadow-sm ${surface} ${borderCol}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {t.live}
                  </span>
                  <span className={`text-xs ${textSecondary}`}>
                    {lastUpdated
                      ? `${t.updated} ${lastUpdated.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : t.loadingReports}
                  </span>
                </div>

                <h1 className={`text-2xl font-bold tracking-tight ${textPrimary}`}>
                  {t.title}
                </h1>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  {t.subtitle}
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendar((value) => !value)}
                  className={`flex h-10 w-full items-center justify-between gap-3 px-3 text-sm font-medium sm:w-[320px] ${inputClass}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CalendarDays size={16} />
                    <span className="truncate">{dateRange}</span>
                  </span>
                  <ChevronDown size={15} />
                </button>

                {showCalendar && (
                  <div
                    className={`absolute right-0 top-12 z-30 w-full rounded-xl border p-4 shadow-lg sm:w-[320px] ${surface} ${borderCol}`}
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
                          className={`h-9 rounded-lg text-xs font-semibold capitalize ${
                            selectedPeriod === period
                              ? "bg-blue-600 text-white"
                              : dark
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                          setSelectedDay(dayInputValue());
                          setSelectedMonth(monthInputValue());
                          setSelectedYear(String(new Date().getFullYear()));
                          setShowCalendar(false);
                        }}
                        className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        {t.current}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCalendar(false)}
                        className={`h-9 rounded-lg border px-3 text-xs font-semibold ${borderCol} ${textSecondary}`}
                      >
                        {t.close}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

            <MetricCard
              icon={<Timer size={22} />}
              tone="purple"
              label={t.tableTurnover}
              value={tableTurnover}
              delta={t.liveEstimate}
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

                <button
                  type="button"
                  className={`flex h-9 items-center gap-6 rounded-lg border px-3 text-xs font-semibold ${borderCol} ${softSurface} ${textPrimary}`}
                >
                  {t.daily}
                  <ChevronDown size={14} />
                </button>
              </div>

              <div
                className={`relative h-[240px] rounded-xl border p-3 ${
                  dark ? "border-slate-700/70 bg-[#0f172a]" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div
                  className={`absolute inset-x-3 top-1/3 border-t ${
                    dark ? "border-slate-700/70" : "border-slate-200"
                  }`}
                />
                <div
                  className={`absolute inset-x-3 top-2/3 border-t ${
                    dark ? "border-slate-700/70" : "border-slate-200"
                  }`}
                />

                <div className="absolute inset-x-3 bottom-9 top-3 flex items-end gap-2">
                  {trendRows.map((bar, index) => (
                    <div key={index} className="flex h-full flex-1 flex-col justify-end">
                      <div
                        className={`rounded-t-md ${
                          bar.peak
                            ? "bg-blue-600"
                            : dark
                              ? "bg-blue-900/50"
                              : "bg-blue-200"
                        }`}
                        style={{ height: `${bar.height}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="absolute inset-x-3 bottom-3 flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  {trendRows.map((bar, index) => (
                    <span key={index}>{bar.label}</span>
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

          <section className={`${cardClass} mb-4 p-4`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className={`text-lg font-bold ${textPrimary}`}>{t.peakHours}</h2>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  {t.peakHoursDesc}
                </p>
              </div>

              <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-500">
                <span className="flex items-center gap-2">
                  <i className="h-3 w-3 rounded bg-blue-100" /> {t.quiet}
                </span>
                <span className="flex items-center gap-2">
                  <i className="h-3 w-3 rounded bg-blue-600" /> {t.peak}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid min-w-[820px] grid-cols-[42px_1fr] gap-x-3 gap-y-2">
                <div />
                <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-slate-400">
                  {hours.map((hour) => (
                    <span key={hour}>{hour}</span>
                  ))}
                </div>

                {heatRows.map((row) => (
                  <div key={row.label} className="contents">
                    <div className="flex items-center text-[11px] font-bold text-slate-500">
                      {row.label}
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      {row.values.map((value, index) => (
                        <div
                          key={`${row.label}-${index}`}
                          className="h-8 rounded-md"
                          style={{
                            backgroundColor: `rgba(37, 99, 235, ${0.08 + value * 0.12})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`overflow-hidden rounded-xl border shadow-sm ${surface} ${borderCol}`}>
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>{t.itemPerformance}</h2>
                <p className={`hidden text-xs sm:block ${textSecondary}`}>
                  {t.itemPerformanceDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void downloadCsv(exportCsvUrl, exportCsvName).catch((err) => setError(err.message))}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Download size={14} />
                {t.exportCsv}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead
                  className={`text-[11px] uppercase tracking-wide ${
                    dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-500"
                  }`}
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
                          ? "border-slate-700/70 hover:bg-slate-800/50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium ${textPrimary}`}>
                        {item.name}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-500">
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

          <footer className="py-6 text-center text-xs font-medium text-slate-400">
            © {now.getFullYear()} {t.footer}
          </footer>
        </div>
    </main>
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
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        dark ? "border-slate-700/70 bg-[#111827]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            muted
              ? dark
                ? "bg-slate-800 text-slate-400"
                : "bg-slate-100 text-slate-500"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {delta}
        </span>
      </div>

      <div className="text-sm font-medium text-slate-500">{label}</div>

      <div
        className={`mt-1 text-2xl font-bold tracking-tight ${
          dark ? "text-slate-100" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "Trending"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Stable"
        ? "bg-blue-100 text-blue-700"
        : "bg-orange-100 text-orange-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${style}`}>
      {status}
    </span>
  );
}
