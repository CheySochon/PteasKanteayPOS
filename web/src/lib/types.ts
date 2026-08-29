export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};

export type AuthResult = {
  token: string;
  user: User;
};

export type Money = number | string;
export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "served" | "completed" | "cancelled";
export type TableZone = "indoor" | "outdoor" | "vip";
export type StockMovementType = "in" | "out" | "adjustment";

export type AppSettings = {
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone: string;
  restaurantImageUrl?: string;
  address: string;
  vatTin?: string;
  currency: string;
  exchangeRate?: number;
  taxRate: number;
  serviceChargeRate: number;
  receiptFooter: string;
  autoAcceptQrOrders: boolean;
  lowStockAlerts: boolean;
  orderNotifications: boolean;
  kitchenDisplayMode: "compact" | "comfortable";
  brandColor?: string;
  staffPermissions: Record<string, unknown> & {
    defaults?: Record<string, boolean>;
    users?: Record<string, Record<string, boolean>>;
  };
};

export type Role = {
  id: number;
  name: string;
  description?: string;
  permissions?: any;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role?: Role | string;
  roleName?: string;
  isActive: boolean;
  pin?: string;
  hasPin?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};



export type ProductIngredient = {
  id: number;
  productId: number;
  ingredientId: number;
  quantityRequired: Money;
  ingredient?: Ingredient;
};

export type Product = {
  id: number;
  categoryId: number;
  category?: Category;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: Money;
  isAvailable: boolean;
  prepTime?: number;
  unit?: string;
  trackStock?: boolean;
  inventory?: {
    quantity: string | number;
    minStock: string | number;
    updatedAt?: string;
  } | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DiningTable = {
  isOccupied?: boolean;
  reservation?: string | null;
  id: number;
  name: string;
  capacity: number;
  zone: TableZone;
  qrToken: string;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};



export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  name?: string | null;
  product?: Product;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  notes?: string | null;
};

export type Order = {
  id: number;
  orderNumber: string;
  orderId?: string;
  tableId?: number | null;
  table?: DiningTable | null;
  tableNo?: string | null;
  orderType?: string | null;
  status: OrderStatus;
  subtotal: Money;
  discountAmount: Money;
  taxAmount: Money;
  serviceFee?: Money;
  totalAmount: Money;
  notes?: string | null;
  userName?: string | null;
  items?: OrderItem[];
  createdBy?: User | null;
  createdAt: string;
  updatedAt?: string;
};

export type Ingredient = {
  stockQty?: Money;
  id: number;
  name: string;
  unit: string;
  currentStock: Money;
  minStock: Money;
  costPerUnit: Money;
  deletedAt?: string | null;
};

export type StockMovement = {
  id: number;
  ingredientId: number;
  ingredient?: Ingredient;
  type: StockMovementType;
  quantity: Money;
  reason?: string | null;
  orderId?: number | null;
  createdAt: string;
};

export type DailySalesReport = {
  dailyTotals?: { date: string; total: Money }[];
  hourlySales?: { hour: number | string; total: Money }[];
  orderCount: number;
  totalSales: number;
  paidTotal: number;
  unpaidTotal: number;
};

export type MonthlySalesReport = DailySalesReport;

export type TopProductReport = {
  productId: number;
  productName: string;
  categoryName?: string;
  quantity: number;
  totalSales: number;
};

export type QrMenu = {
  table: DiningTable;
  categories: Category[];
  products: Product[];
};

export type CreateOrderItemInput = {
  productId: number;
  quantity: number;
  notes?: string;
};

export type CreateOrderInput = {
  tableId?: number;
  tableNo?: string;
  notes?: string;
  status?: OrderStatus;
  discountAmount?: Money;
  taxAmount?: Money;
  items?: CreateOrderItemInput[];
};
