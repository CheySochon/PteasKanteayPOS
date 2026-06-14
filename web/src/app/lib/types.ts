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
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod = "cash" | "qr";
export type TableZone = "indoor" | "outdoor" | "vip";
export type StockMovementType = "in" | "out" | "adjustment";
export type ShiftStatus = "open" | "closed";

export type AppSettings = {
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone: string;
  restaurantImageUrl?: string;
  address: string;
  currency: string;
  taxRate: number;
  serviceChargeRate: number;
  receiptFooter: string;
  autoAcceptQrOrders: boolean;
  lowStockAlerts: boolean;
  orderNotifications: boolean;
  kitchenDisplayMode: "compact" | "comfortable";
  staffPermissions: Record<string, unknown> & {
    defaults?: Record<string, boolean>;
    users?: Record<string, Record<string, boolean>>;
  };
};

export type Role = {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role?: Role | string;
  isActive: boolean;
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

export type ProductVariant = {
  id: number;
  productId: number;
  name: string;
  price: Money;
  sku?: string | null;
  isAvailable: boolean;
  deletedAt?: string | null;
};

export type ProductModifier = {
  id: number;
  name: string;
  price: Money;
  isAvailable: boolean;
  deletedAt?: string | null;
};

export type ProductModifierMap = {
  id: number;
  productId: number;
  modifierId: number;
  modifier?: ProductModifier;
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
  variants?: ProductVariant[];
  modifierMaps?: ProductModifierMap[];
  ingredients?: ProductIngredient[];
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

export type OrderItemModifier = {
  id: number;
  orderItemId: number;
  modifierId: number;
  price: Money;
  modifier?: ProductModifier;
};

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  product?: Product;
  variantId?: number | null;
  variant?: ProductVariant | null;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  notes?: string | null;
  modifiers?: OrderItemModifier[];
};

export type Payment = {
  id: number;
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  reference?: string | null;
  paidAt?: string | null;
  createdAt?: string;
};

export type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  loyaltyPoints: number;
  createdAt?: string;
};

export type Order = {
  id: number;
  orderNumber: string;
  orderId?: string;
  tableId?: number | null;
  table?: DiningTable | null;
  tableNo?: string | null;
  customerId?: number | null;
  customer?: Customer | null;
  status: OrderStatus;
  subtotal: Money;
  discountAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
  notes?: string | null;
  items?: OrderItem[];
  payments?: Payment[];
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

export type Shift = {
  id: number;
  userId: number;
  user?: User;
  startTime: string;
  endTime?: string | null;
  openingCash: Money;
  closingCash?: Money | null;
  status: ShiftStatus;
  notes?: string | null;
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
  variantId?: number;
  modifierIds?: number[];
  quantity: number;
  notes?: string;
};

export type CreateOrderInput = {
  tableId?: number;
  tableNo?: string;
  customerId?: number;
  notes?: string;
  status?: OrderStatus;
  discountAmount?: Money;
  taxAmount?: Money;
  items?: CreateOrderItemInput[];
};
