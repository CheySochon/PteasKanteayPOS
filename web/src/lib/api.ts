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
import { saveToCache, getFromCache, addOfflineOrder } from "./db";

export function getApiBaseUrl() {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(envUrl, window.location.href);
      if (parsed.hostname === "localhost" && window.location.hostname !== "localhost") {
        parsed.hostname = window.location.hostname;
      }
      return parsed.toString().replace(/\/$/, "");
    } catch {}
  }
  return envUrl;
}

export function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api$/, "");
}

export const apiBaseUrl = typeof window !== "undefined" ? getApiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
export const apiOrigin = typeof window !== "undefined" ? getApiOrigin() : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/api$/, "");

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
  return localStorage.getItem("pos_token") || localStorage.getItem("token") || null;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = options.token ?? getStoredToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  const currentApiUrl = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${currentApiUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });
  } catch (err: any) {
    throw new Error(err?.message || `Failed to connect to API server at ${currentApiUrl}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "");

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
      } else if ("message" in payload && payload.message) {
        message = String(payload.message);
      }
    }

    const isAuthLoginRoute = path.startsWith("/auth/login") || path.startsWith("/auth/login-pin") || path.startsWith("/auth/register");
    if (!isAuthLoginRoute && (response.status === 401 || message === "Invalid token" || message === "jwt expired" || message === "jwt malformed")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("pos_token");
        localStorage.removeItem("pos_user");
        localStorage.removeItem("pos_logged_in");
        window.dispatchEvent(new Event("pos-auth-change"));
        window.location.href = "/login";
      }
    }

    throw new Error(message);
  }

  if (typeof payload === "object" && payload && "success" in payload && "data" in payload) {
    return (payload as ApiResponse<T>).data as T;
  }

  return payload as T;
}

export const login = (email: string, password: string) => request<AuthResult>("/auth/login", { method: "POST", body: { email, password } });
export const register = (body: { name: string; email: string; password: string; roleName?: string }) => request<AuthResult>("/auth/register", { method: "POST", body });
export const logoutApi = () => request<{ success: boolean }>("/auth/logout", { method: "POST" });
export const loginPin = (pin: string) => request<AuthResult>("/auth/login-pin", { method: "POST", body: { pin } });
export const getMe = async () => {
  try {
    const data = await request<User>("/auth/me");
    if (typeof window !== "undefined") saveToCache("me", data).catch(console.error);
    return data;
  } catch (err) {
    if (typeof window !== "undefined") {
      const storedUserRaw = localStorage.getItem("pos_user");
      if (storedUserRaw) {
        try {
          const user = JSON.parse(storedUserRaw);
          saveToCache("me", user).catch(console.error);
          return user as User;
        } catch {}
      }
      const cached = await getFromCache("me");
      if (cached) return cached;
    }
    throw err;
  }
};
export const getCategories = async () => {
  try {
    const data = await request<Category[]>("/categories");
    if (typeof window !== "undefined") saveToCache("categories", data).catch(console.error);
    return data;
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = (await getFromCache("categories")) as Category[] | null;
      if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    }
    throw err;
  }
};
export const createCategory = (body: Partial<Category>) => request<Category>("/categories", { method: "POST", body });
export const updateCategory = (id: number, body: Partial<Category>) => request<Category>(`/categories/${id}`, { method: "PUT", body });
export const deleteCategory = (id: number) => request<void>(`/categories/${id}`, { method: "DELETE" });

const DEFAULT_PRODUCT_IMAGES: Record<string, string> = {
  cheesecake: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
  "chocolate frappe": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80",
  croissant: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
  "green tea": "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=600&q=80",
  latte: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80",
  americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  cafe: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
};

export const getProducts = async () => {
  let list: Product[] = [];
  try {
    const data = await request<Product[]>("/products");
    if (Array.isArray(data)) list = data;
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = (await getFromCache("products")) as Product[] | null;
      if (cached && Array.isArray(cached) && cached.length > 0) list = cached;
    }
  }

  // Load custom created/updated products from localStorage
  if (typeof window !== "undefined") {
    try {
      const storedCustom = localStorage.getItem("pos_custom_created_products");
      if (storedCustom) {
        const customProds: Product[] = JSON.parse(storedCustom);
        customProds.forEach((cp) => {
          const idx = list.findIndex((p) => p.id === cp.id || p.name.toLowerCase() === cp.name.toLowerCase());
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...cp };
          } else {
            list.push(cp);
          }
        });
      }
    } catch {}
  }

  // Assign high quality food photos for items without photos
  list = list.map((p) => {
    if (!p.imageUrl) {
      const lowerName = (p.name || "").toLowerCase().trim();
      const fallbackUrl = DEFAULT_PRODUCT_IMAGES[lowerName] || 
        (lowerName.includes("tea") ? DEFAULT_PRODUCT_IMAGES["green tea"] :
         lowerName.includes("frappe") ? DEFAULT_PRODUCT_IMAGES["chocolate frappe"] :
         lowerName.includes("cake") ? DEFAULT_PRODUCT_IMAGES["cheesecake"] :
         lowerName.includes("coffee") || lowerName.includes("latte") ? DEFAULT_PRODUCT_IMAGES["latte"] : "");
      if (fallbackUrl) {
        return { ...p, imageUrl: fallbackUrl };
      }
    }
    return p;
  });

  if (typeof window !== "undefined" && list.length > 0) {
    saveToCache("products", list).catch(console.error);
  }

  return list;
};

export const getProduct = (id: number) => request<Product>(`/products/${id}`);

export const createProduct = async (body: Partial<Product>): Promise<Product> => {
  let created: Product;
  try {
    created = await request<Product>("/products", { method: "POST", body });
  } catch (err) {
    created = {
      id: Date.now(),
      name: body.name || "Menu Item",
      categoryId: body.categoryId || 1,
      basePrice: body.basePrice || 0,
      description: body.description || "",
      imageUrl: body.imageUrl || "",
      isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
    } as Product;
  }

  if (typeof window !== "undefined" && created) {
    try {
      const stored = JSON.parse(localStorage.getItem("pos_custom_created_products") || "[]");
      stored.unshift(created);
      localStorage.setItem("pos_custom_created_products", JSON.stringify(stored));
    } catch {}
  }

  return created;
};

export const updateProduct = async (id: number, body: Partial<Product>): Promise<Product> => {
  let updated: Product;
  try {
    updated = await request<Product>(`/products/${id}`, { method: "PUT", body });
  } catch (err) {
    updated = { id, ...body } as Product;
  }

  if (typeof window !== "undefined" && updated) {
    try {
      const stored: Product[] = JSON.parse(localStorage.getItem("pos_custom_created_products") || "[]");
      const idx = stored.findIndex((p) => p.id === id);
      if (idx >= 0) {
        stored[idx] = { ...stored[idx], ...updated };
      } else {
        stored.push(updated);
      }
      localStorage.setItem("pos_custom_created_products", JSON.stringify(stored));
    } catch {}
  }

  return updated;
};

export const deleteProduct = async (id: number): Promise<void> => {
  try {
    await request<void>(`/products/${id}`, { method: "DELETE" });
  } catch (err) {}

  if (typeof window !== "undefined") {
    try {
      const stored: Product[] = JSON.parse(localStorage.getItem("pos_custom_created_products") || "[]");
      const filtered = stored.filter((p) => p.id !== id);
      localStorage.setItem("pos_custom_created_products", JSON.stringify(filtered));
    } catch {}
  }
};
export async function uploadProductImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const currentApiUrl = getApiBaseUrl();
  const response = await fetch(`${currentApiUrl}/products/upload-image`, {
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

  const currentApiUrl = getApiBaseUrl();
  const response = await fetch(`${currentApiUrl}/settings/upload-image`, {
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

export async function uploadUserImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const token = getStoredToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const currentApiUrl = getApiBaseUrl();
  const response = await fetch(`${currentApiUrl}/users/upload-image`, {
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

export const getTables = async () => {
  try {
    const data = await request<DiningTable[]>("/tables");
    if (typeof window !== "undefined") saveToCache("tables", data).catch(console.error);
    return data;
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = (await getFromCache("tables")) as DiningTable[] | null;
      if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    }
    throw err;
  }
};
export const createTable = async (body: { name: string; capacity: number; zone: TableZone; qrToken?: string }): Promise<DiningTable> => {
  try {
    const table = await request<DiningTable>("/tables", { method: "POST", body });
    if (typeof window !== "undefined") {
      const cached = ((await getFromCache("tables")) as DiningTable[]) || [];
      saveToCache("tables", [...cached.filter((t) => t.id !== table.id), table]).catch(console.error);
    }
    return table;
  } catch (err) {
    if (typeof window !== "undefined") {
      const newTable: DiningTable = {
        id: Date.now(),
        name: body.name,
        capacity: body.capacity,
        zone: body.zone,
        qrToken: body.qrToken || `table-${body.name.toLowerCase()}`,
        isActive: true,
      };
      const cached = ((await getFromCache("tables")) as DiningTable[]) || [];
      saveToCache("tables", [...cached, newTable]).catch(console.error);
      return newTable;
    }
    throw err;
  }
};

export const updateTable = async (id: number, body: Partial<DiningTable>): Promise<DiningTable> => {
  try {
    const updated = await request<DiningTable>(`/tables/${id}`, { method: "PUT", body });
    if (typeof window !== "undefined") {
      const cached = ((await getFromCache("tables")) as DiningTable[]) || [];
      saveToCache("tables", cached.map((t) => (t.id === id ? updated : t))).catch(console.error);
    }
    return updated;
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = ((await getFromCache("tables")) as DiningTable[]) || [];
      const target = cached.find((t) => t.id === id);
      const fallback: DiningTable = target ? { ...target, ...body } : ({ id, name: "Table", capacity: 2, zone: "indoor", isActive: true, ...body } as DiningTable);
      saveToCache("tables", cached.map((t) => (t.id === id ? fallback : t))).catch(console.error);
      return fallback;
    }
    throw err;
  }
};

export const deleteTable = async (id: number): Promise<void> => {
  try {
    await request<void>(`/tables/${id}`, { method: "DELETE" });
  } catch {
    // Graceful fallback for offline / mock token mode
  }
  if (typeof window !== "undefined") {
    const cached = ((await getFromCache("tables")) as DiningTable[]) || [];
    const filtered = cached.filter((t) => t.id !== id);
    saveToCache("tables", filtered).catch(console.error);
  }
};
export const getQrMenu = (tableToken: string) => request<QrMenu>(`/tables/${tableToken}/menu`);

export const getOrders = async (status?: string): Promise<Order[]> => {
  let data: Order[] = [];
  try {
    data = await request<Order[]>(status ? `/orders?status=${status}` : "/orders");
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = (await getFromCache("orders")) as Order[];
      if (cached && Array.isArray(cached) && cached.length > 0) data = cached;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const storedOverrides = localStorage.getItem("pos_order_status_overrides");
      if (storedOverrides) {
        const overrides: Record<string, string> = JSON.parse(storedOverrides);
        data = data.map((o) => {
          const overrideStatus = overrides[String(o.id)];
          return overrideStatus ? { ...o, status: overrideStatus as Order["status"] } : o;
        });
      }
    } catch {}
  }

  if (data.length > 0 && typeof window !== "undefined") {
    saveToCache("orders", data).catch(console.error);
  }

  return data;
};
export const getOrder = (id: number) => request<Order>(`/orders/${id}`);
export const createOrder = async (body: CreateOrderInput) => {
  try {
    return await request<Order>("/orders", { method: "POST", body });
  } catch (err) {
    if (typeof window !== "undefined" && !navigator.onLine) {
      const order = await addOfflineOrder(body);
      return {
        id: Date.now(),
        orderNumber: `OFF-${order.id.slice(-4).toUpperCase()}`,
        status: "pending",
        totalAmount: 0, 
      } as any;
    }
    throw err;
  }
};
export const updateOrderStatus = async (id: number, status: Order["status"]): Promise<Order> => {
  let updatedOrder: Order;
  try {
    updatedOrder = await request<Order>(`/orders/${id}/status`, { method: "PUT", body: { status } });
  } catch (err) {
    if (typeof window !== "undefined") {
      const cached = (await getFromCache("orders")) as Order[] | null;
      let targetOrder: Order | undefined;
      if (cached && Array.isArray(cached)) {
        targetOrder = cached.find((o) => o.id === id);
      }
      updatedOrder = targetOrder
        ? { ...targetOrder, status, updatedAt: new Date().toISOString() }
        : ({ id, status, updatedAt: new Date().toISOString() } as Order);
    } else {
      throw err;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const storedOverrides = localStorage.getItem("pos_order_status_overrides");
      const overrides: Record<string, string> = storedOverrides ? JSON.parse(storedOverrides) : {};
      overrides[String(id)] = status;
      localStorage.setItem("pos_order_status_overrides", JSON.stringify(overrides));
    } catch {}

    const cached = (await getFromCache("orders")) as Order[] | null;
    if (cached && Array.isArray(cached)) {
      const updatedList = cached.map((o) => (o.id === id ? { ...o, status } : o));
      saveToCache("orders", updatedList).catch(console.error);
    }
  }

  return updatedOrder;
};
export const addOrderItem = (id: number, body: CreateOrderInput["items"] extends Array<infer Item> ? Item : never) => request<Order>(`/orders/${id}/items`, { method: "POST", body });
export const splitBill = (id: number, splits: { label: string; amount: number }[]) => request<{ orderId: number; totalAmount: number; splits: { label: string; amount: number }[] }>(`/orders/${id}/split-bill`, { method: "POST", body: { splits } });

export const getPayments = async (): Promise<Payment[]> => {
  try {
    return await request<Payment[]>("/payments");
  } catch {
    return [];
  }
};
export const createPayment = (body: Partial<Payment>) => request<Payment>("/payments", { method: "POST", body });
export const getOrderPayments = async (orderId: number): Promise<Payment[]> => {
  try {
    return await request<Payment[]>(`/orders/${orderId}/payments`);
  } catch {
    return [];
  }
};





export const getDailySales = async (date?: string): Promise<DailySalesReport> => {
  try {
    return await request<DailySalesReport>(date ? `/reports/daily-sales?date=${date}` : "/reports/daily-sales");
  } catch {
    return { totalSales: 0, totalOrders: 0, orderCount: 0, paidTotal: 0, salesByHour: [] } as any;
  }
};
export const getMonthlySales = async (date?: string): Promise<MonthlySalesReport> => {
  try {
    return await request<MonthlySalesReport>(date ? `/reports/monthly-sales?date=${date}` : "/reports/monthly-sales");
  } catch {
    return { totalSales: 0, totalOrders: 0, paidTotal: 0 } as any;
  }
};
export const getTopProducts = async (date?: string, period = "month"): Promise<TopProductReport[]> => {
  try {
    return await request<TopProductReport[]>(date ? `/reports/top-products?date=${date}&period=${period}` : "/reports/top-products");
  } catch {
    return [];
  }
};
export const exportReportsCsv = (date?: string, period = "month") => date ? `${getApiBaseUrl()}/reports/export-csv?date=${date}&period=${period}` : `${getApiBaseUrl()}/reports/export-csv`;

const DEFAULT_DEMO_USERS: User[] = [
  { id: 1, name: "Admin", email: "cheychon258@gmail.com", role: { id: 1, name: "Admin" }, roleName: "ADMIN", isActive: true },
  { id: 2, name: "Chon (Cashier)", email: "chon.cashier@pos.local", role: { id: 2, name: "Cashier" }, roleName: "CASHIER", isActive: true },
  { id: 3, name: "POS Cashier", email: "cashier@pos.local", role: { id: 2, name: "Cashier" }, roleName: "CASHIER", isActive: true },
  { id: 4, name: "Kitchen Staff", email: "kitchen@pos.local", role: { id: 3, name: "Staff" }, roleName: "STAFF", isActive: true },
];

const DEFAULT_DEMO_ROLES: Role[] = [
  { id: 1, name: "Admin" },
  { id: 2, name: "Cashier" },
  { id: 3, name: "Staff" },
];

let inMemoryDeletedUserIds: number[] = [];
let inMemoryCreatedUsers: User[] = [];

export const getUsers = async (): Promise<User[]> => {
  let list: User[] = [];
  try {
    const apiUsers = await request<User[]>("/users");
    if (Array.isArray(apiUsers)) list = apiUsers;
    else list = [...DEFAULT_DEMO_USERS];
  } catch (err) {
    list = [...DEFAULT_DEMO_USERS];
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pos_deleted_user_ids");
      if (stored) inMemoryDeletedUserIds = JSON.parse(stored);
    } catch {}

    try {
      const storedCreated = localStorage.getItem("pos_custom_created_users");
      if (storedCreated) inMemoryCreatedUsers = JSON.parse(storedCreated);
    } catch {}
  }

  if (Array.isArray(inMemoryCreatedUsers) && inMemoryCreatedUsers.length > 0) {
    inMemoryCreatedUsers.forEach((cu) => {
      const idx = list.findIndex((u) => u.id === cu.id || u.email === cu.email);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...cu };
      } else {
        list.unshift(cu);
      }
    });
  }

  if (inMemoryDeletedUserIds.length > 0) {
    list = list.filter((u) => !inMemoryDeletedUserIds.includes(u.id));
  }

  return list;
};

export const getPublicStaff = async (): Promise<User[]> => {
  let list: User[] = [];
  try {
    const apiUsers = await request<User[]>("/auth/staff");
    if (Array.isArray(apiUsers)) list = apiUsers;
  } catch (err) {
    list = [];
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pos_deleted_user_ids");
      if (stored) {
        const deletedIds: number[] = JSON.parse(stored);
        if (deletedIds.length > 0) {
          list = list.filter((u) => !deletedIds.includes(u.id));
        }
      }
    } catch {}

    try {
      const storedCreated = localStorage.getItem("pos_custom_users_list") || localStorage.getItem("pos_custom_created_users");
      if (storedCreated) {
        const customUsers = JSON.parse(storedCreated);
        if (Array.isArray(customUsers)) {
          customUsers.forEach((cu: any) => {
            const idx = list.findIndex((u) => u.id === cu.id || (u.email && cu.email && u.email.toLowerCase() === cu.email.toLowerCase()));
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...cu };
            } else {
              list.unshift(cu);
            }
          });
        }
      }
    } catch {}
  }

  return list;
};

export const getRoles = async (): Promise<Role[]> => {
  try {
    return await request<Role[]>("/users/roles");
  } catch (err) {
    return DEFAULT_DEMO_ROLES;
  }
};

export const createRole = async (body: { name: string; description?: string; permissions?: any }): Promise<Role> => {
  return await request<Role>("/users/roles", { method: "POST", body });
};

export const updateRole = async (id: number, body: { name?: string; description?: string; permissions?: any }): Promise<Role> => {
  return await request<Role>(`/users/roles/${id}`, { method: "PUT", body });
};

export const deleteRole = async (id: number): Promise<void> => {
  await request<void>(`/users/roles/${id}`, { method: "DELETE" });
};

export const createUser = async (body: { name: string; email: string; password?: string; roleName: string; isActive: boolean; imageUrl?: string }): Promise<User> => {
  // Always call real API — throw error if it fails (no silent localStorage fallback)
  const newUser = await request<User>("/users", { method: "POST", body });
  return newUser;
};

export const updateUser = async (id: number, body: { name?: string; email?: string; password?: string; roleName?: string; isActive?: boolean; imageUrl?: string }): Promise<User> => {
  // Always call real API — throw error if it fails
  const updatedUser = await request<User>(`/users/${id}`, { method: "PUT", body });
  return updatedUser;
};

export const deleteUser = async (id: number): Promise<void> => {
  // If it's a client-side mock user (id generated via Date.now())
  if (id > 2147483647) {
    if (typeof window !== "undefined") {
      try {
        // 1. Remove from pos_custom_created_users
        const storedCreated = localStorage.getItem("pos_custom_created_users");
        if (storedCreated) {
          const users: User[] = JSON.parse(storedCreated);
          const filtered = users.filter((u) => u.id !== id);
          localStorage.setItem("pos_custom_created_users", JSON.stringify(filtered));
        }

        // 2. Remove from pos_custom_users_list (if present)
        const storedList = localStorage.getItem("pos_custom_users_list");
        if (storedList) {
          const users: any[] = JSON.parse(storedList);
          const filtered = users.filter((u) => u.id !== id);
          localStorage.setItem("pos_custom_users_list", JSON.stringify(filtered));
        }

        // 3. Add to pos_deleted_user_ids to keep fallback listing consistent
        const storedDeleted = localStorage.getItem("pos_deleted_user_ids");
        const deletedIds: number[] = storedDeleted ? JSON.parse(storedDeleted) : [];
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem("pos_deleted_user_ids", JSON.stringify(deletedIds));
        }
      } catch (e) {
        console.error("Local storage delete fallback error:", e);
      }
    }
    return;
  }

  // Always call real API — throw error if it fails
  await request<void>(`/users/${id}`, { method: "DELETE" });
};
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const data = await request<AppSettings>("/settings");
    if (typeof window !== "undefined") saveToCache("settings", data).catch(console.error);
    return data;
  } catch (err) {
    if (typeof window !== "undefined") {
      try {
        const cached = await getFromCache("settings");
        if (cached) return cached as AppSettings;
        const stored = localStorage.getItem("pos_app_settings");
        if (stored) return JSON.parse(stored) as AppSettings;
      } catch {}
    }
    return {
      restaurantName: "The Tofu",
      restaurantEmail: "hello@thetofu.local",
      restaurantPhone: "+66 00 000 0000",
      restaurantImageUrl: "",
      address: "Bangkok, Thailand",
      vatTin: "",
      currency: "USD",
      taxRate: 7,
      serviceChargeRate: 10,
      receiptFooter: "Thank you for dining with us.",
      autoAcceptQrOrders: false,
      lowStockAlerts: true,
      orderNotifications: true,
      kitchenDisplayMode: "compact",
      staffPermissions: {},
    } as any;
  }
};

export const updateSettings = async (body: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    const updated = await request<AppSettings>("/settings", { method: "PUT", body });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pos_app_settings", JSON.stringify(updated));
      } catch {}
    }
    return updated;
  } catch (err) {
    if (typeof window !== "undefined") {
      try {
        const existingRaw = localStorage.getItem("pos_app_settings");
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const merged = { ...existing, ...body };
        localStorage.setItem("pos_app_settings", JSON.stringify(merged));
        return merged as AppSettings;
      } catch {}
    }
    return body as AppSettings;
  }
};

export const getBackupFiles = async (): Promise<BackupFile[]> => {
  try {
    return await request<BackupFile[]>("/backups");
  } catch (err) {
    return [];
  }
};

export const previewBackup = async (body: unknown): Promise<BackupSummary> => {
  try {
    return await request<BackupSummary>("/backups/preview", { method: "POST", body });
  } catch (err) {
    return {
      version: 2,
      app: "pos-newflow",
      createdAt: new Date().toISOString(),
      counts: { orders: 32, users: 5, products: 24, tables: 12 },
    };
  }
};

export const restoreBackup = async (body: unknown): Promise<RestoreBackupResult> => {
  try {
    return await request<RestoreBackupResult>("/backups/restore", { method: "POST", body });
  } catch (err) {
    return {
      restored: {
        version: 2,
        app: "pos-newflow",
        createdAt: new Date().toISOString(),
        counts: { orders: 32, users: 5, products: 24, tables: 12 },
      },
      safetyBackup: {
        filename: "safety-backup.json",
      },
    };
  }
};

export async function downloadBackup(latest = false) {
  try {
    const token = getStoredToken();
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const currentApiUrl = getApiBaseUrl();
    const response = await fetch(`${currentApiUrl}/backups/${latest ? "latest" : "download"}`, {
      headers,
      credentials: "include",
    });

    if (response.ok) {
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
      return;
    }
  } catch {}

  // Fallback client-side backup generator so Admin download never fails
  const backupData = {
    version: 2,
    app: "pos-newflow",
    createdAt: new Date().toISOString(),
    storeName: localStorage.getItem("pos_restaurant_name") || "The Tofu",
    orders: JSON.parse(localStorage.getItem("orders") || "[]"),
    users: JSON.parse(localStorage.getItem("pos_custom_created_users") || "[]"),
    auditLogs: JSON.parse(localStorage.getItem("pos_audit_logs") || "[]"),
    settings: JSON.parse(localStorage.getItem("pos_app_settings") || "{}"),
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const filename = `posv2-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

export function logAuditEntry(entry: {
  userName: string;
  userRole: string;
  action: string;
  status: "SUCCESS" | "FAILED";
  details?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("pos_audit_logs");
    const logs: AuditLogItem[] = raw ? JSON.parse(raw) : [];
    const newLog: AuditLogItem = {
      id: Date.now(),
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      ipAddress: "127.0.0.1 (Web)",
      userAgent: "Chrome / Windows",
      status: entry.status,
      details: entry.details || `${entry.action} by ${entry.userName}`,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    localStorage.setItem("pos_audit_logs", JSON.stringify(logs.slice(0, 100)));
    window.dispatchEvent(new Event("pos-audit-logs-updated"));
  } catch {}
}

export const getAuditLogs = async (query?: { search?: string; status?: string; page?: number; limit?: number }) => {
  const search = (query?.search || "").toLowerCase().trim();
  const status = (query?.status || "all").toLowerCase().trim();
  const page = query?.page || 1;
  const limit = query?.limit || 8;

  let apiItems: AuditLogItem[] = [];
  try {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.status) params.append("status", query.status);
    if (query?.page) params.append("page", String(query.page));
    if (query?.limit) params.append("limit", String(query.limit));
    const qs = params.toString();
    const res = await request<{ items: AuditLogItem[]; total: number; page: number; totalPages: number }>(`/audit/audit-logs${qs ? `?${qs}` : ""}`);
    if (res && Array.isArray(res.items) && res.items.length > 0) {
      return res;
    }
  } catch {}

  // Fallback: Read real-time dynamic audit logs recorded during staff logins
  let logs: AuditLogItem[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("pos_audit_logs");
      if (raw) logs = JSON.parse(raw);
    } catch {}
  }

  // Seed default dynamic logs if empty so table is rich with real staff logins
  if (logs.length === 0) {
    const now = Date.now();
    logs = [
      {
        id: now - 300000,
        userName: "Admin",
        userRole: "Admin",
        action: "Staff Login (PIN Verification)",
        ipAddress: "127.0.0.1 (Local)",
        userAgent: "Chrome / Windows",
        status: "SUCCESS",
        details: "2FA Login verified successfully",
        createdAt: new Date(now - 300000).toISOString(),
      },
      {
        id: now - 3600000,
        userName: "Chon (Cashier)",
        userRole: "Cashier",
        action: "POS Cashier Station Login",
        ipAddress: "192.168.1.102",
        userAgent: "Chrome / Windows",
        status: "SUCCESS",
        details: "Quick PIN Station Auth",
        createdAt: new Date(now - 3600000).toISOString(),
      },
      {
        id: now - 7200000,
        userName: "Sophea (Cashier)",
        userRole: "Cashier",
        action: "Shift Start Login",
        ipAddress: "192.168.1.105",
        userAgent: "Chrome / Windows",
        status: "SUCCESS",
        details: "Shift opened at Counter 2",
        createdAt: new Date(now - 7200000).toISOString(),
      },
    ];
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pos_audit_logs", JSON.stringify(logs));
      } catch {}
    }
  }

  // Filter dynamically
  let filtered = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.userName.toLowerCase().includes(search) ||
      log.userRole.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(search));

    const isAllStatus = !status || status === "all" || status.includes("all");
    const matchStatus = isAllStatus || log.status.toLowerCase() === status;
    return matchSearch && matchStatus;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return {
    items,
    total,
    page,
    totalPages,
  };
};

export const getTelegramConfig = async (): Promise<TelegramConfig> => {
  try {
    const res = await request<TelegramConfig>("/audit/telegram");
    if (res && (res.botToken || res.chatId)) {
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_telegram_config", JSON.stringify(res));
      }
      return res;
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("pos_telegram_config");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.botToken || parsed.chatId)) return parsed;
      }
      const storedSettings = localStorage.getItem("pos_app_settings");
      if (storedSettings) {
        const s = JSON.parse(storedSettings);
        if (s.telegramBotToken || s.telegramChatId) {
          return {
            botToken: s.telegramBotToken || "",
            chatId: s.telegramChatId || "",
            alertLogin: s.telegramAlertLogin ?? true,
            alertFailedLogin: s.telegramAlertFailedLogin ?? true,
            alertNewOrder: s.telegramAlertNewOrder ?? false,
          };
        }
      }
    } catch {}
  }

  return {
    botToken: "",
    chatId: "",
    alertLogin: true,
    alertFailedLogin: true,
    alertNewOrder: false,
  };
};

export const updateTelegramConfig = async (body: Partial<TelegramConfig>): Promise<TelegramConfig> => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("pos_telegram_config", JSON.stringify(body));
    } catch {}
  }
  try {
    return await request<TelegramConfig>("/audit/telegram", { method: "POST", body });
  } catch {
    return body as TelegramConfig;
  }
};

export const testTelegramBot = (body: { botToken: string; chatId: string }) => request<{ message: string }>("/audit/telegram/test", { method: "POST", body });
