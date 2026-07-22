import type {
  ApiResponse,
  AppSettings,
  AuthResult,
  Category,
  CreateOrderInput,
  DailySalesReport,
  DiningTable,
  Ingredient,
  MonthlySalesReport,
  Order,
  Payment,
  Product,
  QrMenu,
  Role,
  StockMovement,
  StockMovementType,
  TableZone,
  TopProductReport,
  User,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const API_ORIGIN = API_URL.replace(/\/api$/, "");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export type BackupFile = {
  filename: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupSummary = {
  version: number;
  app: string;
  createdAt: string;
  createdBy?: { id: number; email: string; role: string } | null;
  counts: Record<string, number>;
};

export type RestoreBackupResult = {
  restored: BackupSummary;
  safetyBackup: {
    filename: string;
  };
};

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pos_token");
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = options.token ?? getStoredToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (typeof payload === "object" && payload) {
      if ("errors" in payload && typeof payload.errors === "object" && payload.errors) {
        const rawErrors = (payload.errors as any).properties || payload.errors;
        const details = Object.entries(rawErrors)
          .map(([field, errs]) => {
            if (Array.isArray(errs)) return `${field}: ${errs.join(", ")}`;
            if (typeof errs === "object" && errs !== null) return `${field}: ${JSON.stringify(errs)}`;
            return `${field}: ${String(errs)}`;
          })
          .join(" | ");
        message = `Validation failed — ${details}`;
      } else if ("message" in payload) {
        message = String(payload.message);
      }
    }
    throw new Error(message);
  }

  if (typeof payload === "object" && payload && "success" in payload && "data" in payload) {
    return (payload as ApiResponse<T>).data as T;
  }

  return payload as T;
}

export const apiBaseUrl = API_URL;
export const apiOrigin = API_ORIGIN;
export const login = (email: string, password: string) => request<AuthResult>("/auth/login", { method: "POST", body: { email, password } });
export const register = (body: { name: string; email: string; password: string; roleName?: string }) => request<AuthResult>("/auth/register", { method: "POST", body });
export const logoutApi = () => request<{ success: boolean }>("/auth/logout", { method: "POST" });
export const getMe = () => request<User>("/auth/me");
export const getCategories = () => request<Category[]>("/categories");
export const createCategory = (body: Partial<Category>) => request<Category>("/categories", { method: "POST", body });
export const updateCategory = (id: number, body: Partial<Category>) => request<Category>(`/categories/${id}`, { method: "PUT", body });
export const deleteCategory = (id: number) => request<void>(`/categories/${id}`, { method: "DELETE" });

export const getProducts = () => request<Product[]>("/products");
export const getProduct = (id: number) => request<Product>(`/products/${id}`);
export const createProduct = (body: Partial<Product>) => request<Product>("/products", { method: "POST", body });
export const updateProduct = (id: number, body: Partial<Product>) => request<Product>(`/products/${id}`, { method: "PUT", body });
export const deleteProduct = (id: number) => request<void>(`/products/${id}`, { method: "DELETE" });
export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/products/upload-image`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return (payload as ApiResponse<{ imageUrl: string }>).data as { imageUrl: string };
}

export async function uploadRestaurantImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/settings/upload-image`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return (payload as ApiResponse<{ imageUrl: string }>).data as { imageUrl: string };
}

export const getTables = () => request<DiningTable[]>("/tables");
export const createTable = (body: { name: string; capacity: number; zone: TableZone; qrToken?: string }) => request<DiningTable>("/tables", { method: "POST", body });
export const updateTable = (id: number, body: Partial<DiningTable>) => request<DiningTable>(`/tables/${id}`, { method: "PUT", body });
export const deleteTable = (id: number) => request<void>(`/tables/${id}`, { method: "DELETE" });
export const getQrMenu = (tableToken: string) => request<QrMenu>(`/tables/${tableToken}/menu`);

export const getOrders = (status?: string) => request<Order[]>(status ? `/orders?status=${status}` : "/orders");
export const getOrder = (id: number) => request<Order>(`/orders/${id}`);
export const createOrder = (body: CreateOrderInput) => request<Order>("/orders", { method: "POST", body });
export const updateOrderStatus = (id: number, status: Order["status"]) => request<Order>(`/orders/${id}/status`, { method: "PUT", body: { status } });
export const addOrderItem = (id: number, body: CreateOrderInput["items"] extends Array<infer Item> ? Item : never) => request<Order>(`/orders/${id}/items`, { method: "POST", body });
export const splitBill = (id: number, splits: { label: string; amount: number }[]) => request<{ orderId: number; totalAmount: number; splits: { label: string; amount: number }[] }>(`/orders/${id}/split-bill`, { method: "POST", body: { splits } });

export const getPayments = () => request<Payment[]>("/payments");
export const createPayment = (body: Partial<Payment>) => request<Payment>("/payments", { method: "POST", body });
export const getOrderPayments = (orderId: number) => request<Payment[]>(`/orders/${orderId}/payments`);





export const getDailySales = (date?: string) => request<DailySalesReport>(date ? `/reports/daily-sales?date=${date}` : "/reports/daily-sales");
export const getMonthlySales = (date?: string) => request<MonthlySalesReport>(date ? `/reports/monthly-sales?date=${date}` : "/reports/monthly-sales");
export const getTopProducts = (date?: string, period = "month") => request<TopProductReport[]>(date ? `/reports/top-products?date=${date}&period=${period}` : "/reports/top-products");
export const exportReportsCsv = (date?: string, period = "month") => date ? `${API_URL}/reports/export-csv?date=${date}&period=${period}` : `${API_URL}/reports/export-csv`;

export const getUsers = () => request<User[]>("/users");
export const getRoles = () => request<Role[]>("/users/roles");
export const createUser = (body: { name: string; email: string; password: string; roleName: string; isActive: boolean }) => request<User>("/users", { method: "POST", body });
export const updateUser = (id: number, body: { name?: string; email?: string; password?: string; roleName?: string; isActive?: boolean }) => request<User>(`/users/${id}`, { method: "PUT", body });
export const deleteUser = (id: number) => request<void>(`/users/${id}`, { method: "DELETE" });
export const getSettings = () => request<AppSettings>("/settings");
export const updateSettings = (body: Partial<AppSettings>) => request<AppSettings>("/settings", { method: "PUT", body });
export const getBackupFiles = () => request<BackupFile[]>("/backups");
export const previewBackup = (body: unknown) => request<BackupSummary>("/backups/preview", { method: "POST", body });
export const restoreBackup = (body: unknown) => request<RestoreBackupResult>("/backups/restore", { method: "POST", body });

export async function downloadBackup(latest = false) {
  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/backups/${latest ? "latest" : "download"}`, {
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `posv2-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type AuditLogItem = {
  id: number;
  userId?: number;
  userName: string;
  userRole: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
  createdAt: string;
};

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  alertLogin: boolean;
  alertFailedLogin: boolean;
  alertNewOrder: boolean;
};

export const getAuditLogs = (query?: { search?: string; status?: string; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (query?.search) params.append("search", query.search);
  if (query?.status) params.append("status", query.status);
  if (query?.page) params.append("page", String(query.page));
  if (query?.limit) params.append("limit", String(query.limit));
  const qs = params.toString();
  return request<{ items: AuditLogItem[]; total: number; page: number; totalPages: number }>(`/audit/audit-logs${qs ? `?${qs}` : ""}`);
};

export const getTelegramConfig = () => request<TelegramConfig>("/audit/telegram");
export const updateTelegramConfig = (body: Partial<TelegramConfig>) => request<TelegramConfig>("/audit/telegram", { method: "POST", body });
export const testTelegramBot = (body: { botToken: string; chatId: string }) => request<{ message: string }>("/audit/telegram/test", { method: "POST", body });
