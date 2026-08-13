"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeDollarSign,
  Bell,
  Cake,
  Camera,
  CheckCircle2,
  Coffee,
  Eye,
  FolderOpen,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Tags,
  Trash2,
  UploadCloud,
  Utensils,
  X,
} from "lucide-react";
import { useAppLanguage } from "../../../lib/language";
import TopBar from "../../../components/TopBar";
import { useAppTheme } from "../../../lib/theme";
import {
  apiOrigin,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getOrders,
  getProducts,
  updateCategory,
  updateProduct,
  uploadProductImage,
} from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import type { Category, Order, Product } from "../../../lib/types";
import { useAutoDismiss } from "../../../lib/useAutoDismiss";


type ProductForm = {
  id?: number;
  name: string;
  categoryId: string;
  basePrice: string;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
};

type CategoryForm = {
  id?: number;
  name: string;
  description: string;
};

type MenuNotification = {
  id: string;
  title: string;
  detail: string;
};

const EMPTY_PRODUCT: ProductForm = {
  name: "",
  categoryId: "",
  basePrice: "",
  description: "",
  imageUrl: "",
  isAvailable: true,
};

const EMPTY_CATEGORY: CategoryForm = {
  name: "",
  description: "",
};

const TEXT = {
  en: {
    badge: "Menu Management",
    title: "Menu",
    subtitle: "Manage categories, items, prices, images, and availability.",
    searchPlaceholder: "Search menu items...",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    clearNotifications: "Clear",
    activeOrderAlert: "Active orders",
    activeOrderDetail: "orders need attention",
    newOrderAlert: "New order received",
    newOrderDetail: "needs attention",
    settings: "Settings",
    newItem: "New Item",
    available: "Available",
    hidden: "Hidden",
    categories: "Categories",
    allItems: "All Items",
    station: "Station 04",
    shiftActive: "Shift Active",
    items: "items",
    loading: "Loading menu items...",
    empty: "No menu items found",
    editCategory: "Edit Category",
    createCategory: "Add New Category",
    updateFilter: "Update menu filter details.",
    addFilter: "Add quick filters for the menu.",
    cancelCategory: "Cancel category edit",
    categoryName: "Category name",
    description: "Description",
    updateCategory: "Update Category",
    saveCategory: "Save Category",
    deleteCategory: "Delete Category",
    soldOut: "Sold Out",
    noDescription: "No description",
    outOfOrder: "Out of Order",
    lowStock: "Low Stock",
    inStock: "In Stock",
    editProduct: "Edit product",
    deleteProduct: "Delete product",
    editItem: "Edit Item",
    itemCrud: "Add New Item",
    itemNote: "Create or update menu item details, pricing, and photo.",
    uploadImage: "Upload product image",
    productName: "Product Name",
    category: "Category",
    selectCategory: "Select category",
    basePrice: "Base Price",
    availableToggle: "Available",
    availableNote: "Show item on the menu.",
    clearForm: "Clear form",
    saveItem: "Save Item",
    createItem: "Create Item",
  },
  km: {
    badge: "គ្រប់គ្រងមុខម្ហូប",
    title: "មុខម្ហូប",
    subtitle: "គ្រប់គ្រងប្រភេទ មុខម្ហូប តម្លៃ រូបភាព និងភាពអាចលក់បាន។",
    searchPlaceholder: "ស្វែងរកមុខម្ហូប...",
    notifications: "ការជូនដំណឹង",
    noNotifications: "មិនមានការជូនដំណឹងថ្មី",
    clearNotifications: "សម្អាត",
    activeOrderAlert: "ការបញ្ជាទិញសកម្ម",
    activeOrderDetail: "ការបញ្ជាទិញត្រូវការការត្រួតពិនិត្យ",
    newOrderAlert: "ការបញ្ជាទិញថ្មី",
    newOrderDetail: "ត្រូវការការត្រួតពិនិត្យ",
    settings: "ការកំណត់",
    newItem: "មុខម្ហូបថ្មី",
    available: "អាចលក់បាន",
    hidden: "លាក់",
    categories: "ប្រភេទ",
    allItems: "មុខម្ហូបទាំងអស់",
    station: "ស្ថានីយ 04",
    shiftActive: "វេនកំពុងដំណើរការ",
    items: "មុខម្ហូប",
    loading: "កំពុងផ្ទុកមុខម្ហូប...",
    empty: "រកមិនឃើញមុខម្ហូប",
    editCategory: "កែប្រភេទ",
    createCategory: "បន្ថែមប្រភេទថ្មី",
    updateFilter: "កែព័ត៌មានតម្រងមុខម្ហូប។",
    addFilter: "បន្ថែមតម្រងលឿនសម្រាប់មុខម្ហូប។",
    cancelCategory: "បោះបង់ការកែប្រភេទ",
    categoryName: "ឈ្មោះប្រភេទ",
    description: "ពិពណ៌នា",
    updateCategory: "កែប្រភេទ",
    saveCategory: "រក្សាទុកប្រភេទ",
    deleteCategory: "លុបប្រភេទ",
    soldOut: "អស់ពីស្តុក",
    noDescription: "មិនមានពិពណ៌នា",
    outOfOrder: "មិនអាចលក់បាន",
    lowStock: "ស្តុកទាប",
    inStock: "មានក្នុងស្តុក",
    editProduct: "កែមុខម្ហូប",
    deleteProduct: "លុបមុខម្ហូប",
    editItem: "កែប្រែមុខម្ហូប",
    itemCrud: "បន្ថែមមុខម្ហូបថ្មី",
    itemNote: "បញ្ចូលព័ត៌មានមុខម្ហូបថ្មី តម្លៃ និងរូបភាព។",
    uploadImage: "ផ្ទុករូបមុខម្ហូប",
    productName: "ឈ្មោះមុខម្ហូប",
    category: "ប្រភេទ",
    selectCategory: "ជ្រើសរើសប្រភេទ",
    basePrice: "តម្លៃមូលដ្ឋាន",
    availableToggle: "អាចលក់បាន",
    availableNote: "បង្ហាញមុខម្ហូបក្នុងម៉ឺនុយ។",
    clearForm: "សម្អាតទម្រង់",
    saveItem: "រក្សាទុកមុខម្ហូប",
    createItem: "បង្កើតមុខម្ហូប",
  },
};

function money(value: number | string) {
  return `$${Number(value || 0).toFixed(2)}`;
}

const CLEARED_ACTIVE_ORDER_IDS_KEY = "pos_cleared_active_order_ids";

function getClearedActiveOrderIds() {
  if (typeof window === "undefined") return new Set<number>();

  try {
    const ids = JSON.parse(localStorage.getItem(CLEARED_ACTIVE_ORDER_IDS_KEY) || "[]");
    return new Set(
      Array.isArray(ids)
        ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : []
    );
  } catch {
    return new Set<number>();
  }
}

function saveClearedActiveOrderIds(ids: Set<number>) {
  localStorage.setItem(CLEARED_ACTIVE_ORDER_IDS_KEY, JSON.stringify([...ids]));
}


function getCategoryBadgeStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("drink") || lower.includes("beverage") || lower.includes("boba") || lower.includes("coffee") || lower.includes("tea")) {
    return {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      text: "text-cyan-600 dark:text-cyan-400",
      border: "border-cyan-200 dark:border-cyan-800/50",
      gradient: "from-cyan-500 to-blue-600",
      pill: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    };
  }
  if (lower.includes("burger") || lower.includes("food") || lower.includes("main") || lower.includes("pizza") || lower.includes("meat")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/50",
      gradient: "from-amber-500 to-orange-600",
      pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake") || lower.includes("ice")) {
    return {
      bg: "bg-pink-500/10 dark:bg-pink-500/20",
      text: "text-pink-600 dark:text-pink-400",
      border: "border-pink-200 dark:border-pink-800/50",
      gradient: "from-pink-500 to-rose-600",
      pill: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    };
  }
  if (lower.includes("snack") || lower.includes("side") || lower.includes("starter") || lower.includes("appetizer")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/50",
      gradient: "from-emerald-500 to-teal-600",
      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  }
  return {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800/50",
    gradient: "from-indigo-500 to-blue-600",
    pill: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
}

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("drink") || lower.includes("beverage") || lower.includes("boba") || lower.includes("coffee") || lower.includes("tea") || lower.includes("តែ") || lower.includes("ទឹក")) {
    return Coffee;
  }
  if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake") || lower.includes("ice") || lower.includes("នំ")) {
    return Cake;
  }
  if (
    lower.includes("burger") ||
    lower.includes("food") ||
    lower.includes("main") ||
    lower.includes("pizza") ||
    lower.includes("meat") ||
    lower.includes("rice") ||
    lower.includes("noodle") ||
    lower.includes("soup") ||
    lower.includes("បាយ") ||
    lower.includes("ម្ហូប") ||
    lower.includes("សម្ល") ||
    lower.includes("ឆា")
  ) {
    return Utensils;
  }
  if (lower.includes("snack") || lower.includes("side") || lower.includes("starter") || lower.includes("appetizer")) {
    return FolderOpen;
  }
  return Tags;
}

export default function MenuPage() {
  const language = useAppLanguage();
  const t = TEXT[language];
  const [menuView, setMenuView] = useState("list");
  const [theme] = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderAlerts, setOrderAlerts] = useState<MenuNotification[]>([]);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [clearedActiveOrderIds, setClearedActiveOrderIds] = useState<Set<number>>(
    getClearedActiveOrderIds
  );
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "hidden">("all");
  const [query, setQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useAutoDismiss(message, setMessage);
  useAutoDismiss(error, setError);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const dark = theme === "dark";
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const softSurface = dark ? "bg-[#232333]" : "bg-white";
  const textPrimary = dark ? "text-slate-100" : "text-[#566a7f]";
  const textSecondary = dark ? "text-slate-400" : "text-[#a1acb8]";
  const panelBg = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#e5e7eb]";
  const isCategoriesView = menuView === "categories";

  // User Role & Granular Action Permissions Check
  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("pos_user") || "null");
    } catch {
      return null;
    }
  }, []);

  const userRole = useMemo(() => {
    if (!currentUser) return "Admin";
    return typeof currentUser.role === "string" ? currentUser.role : currentUser.role?.name || "Admin";
  }, [currentUser]);

  const isAdmin = userRole === "Super Admin" || userRole === "Admin" || userRole === "Administrator";

  const staffPermissions = useMemo(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("pos_staff_permissions") || "{}");
    } catch {
      return {};
    }
  }, []);

  const canCreate = isAdmin || Boolean(staffPermissions.menu_create === true);
  const canEdit = isAdmin || Boolean(staffPermissions.menu_edit === true);
  const canDelete = isAdmin || Boolean(staffPermissions.menu_delete === true);

  const inputClass = `w-full rounded border px-3.5 py-2 text-sm outline-none placeholder-[#b4bdc6] focus:border-[#696cff] focus:ring-4 focus:ring-[#696cff]/10 transition-all duration-150 ${
    dark
      ? "border-[#4e4f6e] bg-[#232333] text-slate-100"
      : "border-[#d9dee3] bg-white text-[#566a7f]"
  }`;

  useEffect(() => {
    const syncMenuView = () => {
      const params = new URLSearchParams(window.location.search);
      setMenuView(params.get("view") === "categories" || window.location.hash === "#categories" ? "categories" : "list");
    };
    const syncMenuViewFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setMenuView(detail === "categories" ? "categories" : "list");
    };

    syncMenuView();
    window.addEventListener("hashchange", syncMenuView);
    window.addEventListener("popstate", syncMenuView);
    window.addEventListener("pos-menu-view-change", syncMenuViewFromEvent);

    return () => {
      window.removeEventListener("hashchange", syncMenuView);
      window.removeEventListener("popstate", syncMenuView);
      window.removeEventListener("pos-menu-view-change", syncMenuViewFromEvent);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([getCategories(), getProducts(), getOrders()])
      .then(([categoryRows, productRows, orderRows]) => {
        if (!mounted) return;
        setCategories(categoryRows);
        setProducts(productRows);
        setOrders(orderRows);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load menu");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleOrderCreated(order: Order) {
      setClearedActiveOrderIds((current) => {
        if (!current.has(order.id)) return current;

        const next = new Set(current);
        next.delete(order.id);
        saveClearedActiveOrderIds(next);
        return next;
      });

      setOrders((current) => [
        order,
        ...current.filter((entry) => entry.id !== order.id),
      ]);

      setOrderAlerts((current) => {
        const label = order.orderNumber || order.orderId || `#${order.id}`;
        const table = order.table?.name || order.tableNo;
        const detail = table
          ? `${label} - ${table} ${t.newOrderDetail}`
          : `${label} ${t.newOrderDetail}`;

        return [
          {
            id: `order-${order.id}-${Date.now()}`,
            title: t.newOrderAlert,
            detail,
          },
          ...current,
        ].slice(0, 5);
      });
    }

    function handleOrderUpdated(order: Order) {
      setOrders((current) =>
        current.map((entry) => (entry.id === order.id ? order : entry))
      );
    }

    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);

    return () => {
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [t.newOrderAlert, t.newOrderDetail]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = categoryQuery.trim().toLowerCase();
    return categories.filter(category => 
      !normalizedQuery || category.name.toLowerCase().includes(normalizedQuery) || (category.description || "").toLowerCase().includes(normalizedQuery)
    );
  }, [categories, categoryQuery]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" || product.categoryId === selectedCategory;

      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.description || "").toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" ? product.isAvailable : !product.isAvailable);

      return matchesCategory && matchesQuery && matchesStatus;
    });
  }, [products, query, selectedCategory, statusFilter]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => !["completed", "cancelled"].includes(order.status)
      ),
    [orders]
  );
  const unseenActiveOrders = useMemo(
    () => activeOrders.filter((order) => !clearedActiveOrderIds.has(order.id)),
    [activeOrders, clearedActiveOrderIds]
  );

  const notifications = useMemo(() => {
    const items: MenuNotification[] = [...orderAlerts];

    if (unseenActiveOrders.length > 0) {
      items.push({
        id: `active-orders-${unseenActiveOrders.map((order) => order.id).join("-")}`,
        title: t.activeOrderAlert,
        detail: `${unseenActiveOrders.length} ${t.activeOrderDetail}`,
      });
    }

    return items.filter((item) => !clearedNotificationIds.has(item.id));
  }, [clearedNotificationIds, orderAlerts, t, unseenActiveOrders]);

  function clearNotifications() {
    setClearedNotificationIds((current) => {
      const next = new Set(current);
      notifications.forEach((item) => next.add(item.id));
      return next;
    });
    setClearedActiveOrderIds((current) => {
      const next = new Set(current);
      activeOrders.forEach((order) => next.add(order.id));
      saveClearedActiveOrderIds(next);
      return next;
    });
    setOrderAlerts([]);
  }

  function categoryCount(categoryId: number | "all") {
    if (categoryId === "all") return products.length;
    return products.filter((product) => product.categoryId === categoryId).length;
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (categoryForm.id) {
        const updated = await updateCategory(categoryForm.id, {
          name: categoryForm.name,
          description: categoryForm.description,
        });

        setCategories((current) =>
          current
            .map((category) => (category.id === updated.id ? updated : category))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );

        setProducts((current) =>
          current.map((product) =>
            product.categoryId === updated.id
              ? { ...product, category: updated }
              : product,
          ),
        );

        setMessage("Category updated successfully.");
      } else {
        const created = await createCategory({
          name: categoryForm.name,
          description: categoryForm.description,
        });

        setCategories((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
        );

        setMessage("Category created successfully.");
      }

      resetCategoryForm();
      setCategoryEditorOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin or Super Admin to save categories.`
          : "Unable to save category",
      );
    }
  }

  function editCategory(category: Category) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description || "",
    });
    setMessage("");
    setError("");
    setCategoryEditorOpen(true);
  }

  function resetCategoryForm() {
    setCategoryForm(EMPTY_CATEGORY);
  }

  function createNewCategory() {
    resetCategoryForm();
    setMessage("");
    setError("");
    setCategoryEditorOpen(true);
  }

  async function removeCategory(category: Category) {
    const productCount = products.filter(
      (product) => product.categoryId === category.id,
    ).length;

    const detail = productCount > 0 ? ` It has ${productCount} menu item(s).` : "";
    setConfirmModal({
      isOpen: true,
      title: language === "km" ? "លុបប្រភេទមុខម្ហូប" : "Delete Category",
      message: language === "km" 
        ? `តើអ្នកប្រាកដជាចង់លុបប្រភេទ "${category.name}" ដែរឬទេ?${productCount > 0 ? ` វាមានមុខម្ហូបចំនួន ${productCount} នៅក្នុងនោះ។` : ""}`
        : `Are you sure you want to delete the category "${category.name}"?${detail}`,
      onConfirm: async () => {
        setMessage("");
        setError("");
        try {
          await deleteCategory(category.id);
          setCategories((current) => current.filter((entry) => entry.id !== category.id));

          if (selectedCategory === category.id) setSelectedCategory("all");
          if (categoryForm.id === category.id) resetCategoryForm();
          if (categoryForm.id === category.id) setCategoryEditorOpen(false);

          setMessage("Category deleted successfully.");
        } catch (err) {
          setError(
            err instanceof Error
              ? `${err.message}. Login as Admin or Super Admin to delete categories.`
              : "Unable to delete category",
          );
        }
        setConfirmModal((c) => ({ ...c, isOpen: false }));
      }
    });
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      let imageUrl = productForm.imageUrl;

      if (imageFile) {
        const uploaded = await uploadProductImage(imageFile);
        imageUrl = uploaded.imageUrl;
      }

      const payload = {
        name: productForm.name,
        categoryId: Number(productForm.categoryId),
        basePrice: Number(productForm.basePrice || 0),
        description: productForm.description,
        imageUrl,
        isAvailable: productForm.isAvailable,
      };

      if (productForm.id) {
        const updated = await updateProduct(productForm.id, payload);

        setProducts((current) =>
          current.map((product) => (product.id === updated.id ? updated : product)),
        );

        setMessage("Product updated successfully.");
      } else {
        const created = await createProduct(payload);
        setProducts((current) => [created, ...current]);
        setMessage("Product created successfully.");
      }

      resetProductForm();
      setEditorOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save product",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product: Product) {
    setConfirmModal({
      isOpen: true,
      title: language === "km" ? "លុបមុខម្ហូប" : "Delete Product",
      message: language === "km" 
        ? `តើអ្នកប្រាកដជាចង់លុបមុខម្ហូប "${product.name}" ដែរឬទេ?`
        : `Are you sure you want to delete the product "${product.name}"?`,
      onConfirm: async () => {
        setMessage("");
        setError("");
        try {
          await deleteProduct(product.id);
          setProducts((current) => current.filter((entry) => entry.id !== product.id));

          if (productForm.id === product.id) resetProductForm();

          setMessage("Product deleted successfully.");
        } catch (err) {
          setError(
            err instanceof Error
              ? `${err.message}. Login as Admin or Super Admin to delete products.`
              : "Unable to delete product",
          );
        }
        setConfirmModal((c) => ({ ...c, isOpen: false }));
      }
    });
  }

  async function toggleProductAvailability(product: Product) {
    setMessage("");
    setError("");

    try {
      const updated = await updateProduct(product.id, {
        isAvailable: !product.isAvailable,
      });

      setProducts((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Login as Admin or Super Admin to update products.`
          : "Unable to update product",
      );
    }
  }

  function createNewProduct() {
    resetProductForm();
    setEditorOpen(true);
  }

  function editProduct(product: Product) {
    setProductForm({
      id: product.id,
      name: product.name,
      categoryId: String(product.categoryId),
      basePrice: String(product.basePrice),
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      isAvailable: product.isAvailable,
    });

    setImageFile(null);
    setImagePreview(product.imageUrl ? resolveImageUrl(product.imageUrl) : "");
    setMessage("");
    setError("");
    setEditorOpen(true);
  }

  function resetProductForm() {
    setProductForm(EMPTY_PRODUCT);
    setImageFile(null);
    setImagePreview("");
  }

  function handleImageFile(file: File | null) {
    setImageFile(file);
    setImagePreview(
      file
        ? URL.createObjectURL(file)
        : productForm.imageUrl
          ? resolveImageUrl(productForm.imageUrl)
          : "",
    );
  }

  return (
    <main className={`flex flex-1 flex-col overflow-hidden ${dark ? "bg-[#232333]" : "bg-white"}`}>
      <TopBar
        title={isCategoriesView ? t.categories : t.title}
        subtitle=""
        language={language}
        onLanguageChange={(nextLanguage) => {
          localStorage.setItem("pos_language", nextLanguage);
          window.dispatchEvent(new Event("pos-language-change"));
        }}
        notifications={[]}
        dark={dark}
        searchQuery={isCategoriesView ? categoryQuery : query}
        onSearchChange={isCategoriesView ? setCategoryQuery : setQuery}
        searchPlaceholder={isCategoriesView ? "Search categories..." : t.searchPlaceholder}
      />
      
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto w-full max-w-[1600px]">

        {(error || message) && (
          <div
            className={`mb-5 rounded border px-4 py-2.5 text-xs font-semibold ${
              error
                ? "border-red-150 bg-red-50 text-red-600"
                : "border-emerald-150 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {isCategoriesView ? (
          <section id="categories" className="space-y-5">
            {/* Top Stat Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between ${
                  dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#a1acb8]">Total Categories</div>
                  <div
                    className={`mt-1 text-2xl font-bold tracking-tight ${
                      dark ? "text-slate-100" : "text-[#566a7f]"
                    }`}
                  >
                    {categories.length}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  dark ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                }`}>
                  <Tags size={20} />
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between ${
                  dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#a1acb8]">Total Products</div>
                  <div
                    className={`mt-1 text-2xl font-bold tracking-tight ${
                      dark ? "text-slate-100" : "text-[#566a7f]"
                    }`}
                  >
                    {products.length}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  dark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
                }`}>
                  <ShoppingBag size={20} />
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between ${
                  dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#a1acb8]">Active Menu Items</div>
                  <div
                    className={`mt-1 text-2xl font-bold tracking-tight ${
                      dark ? "text-slate-100" : "text-[#566a7f]"
                    }`}
                  >
                    {products.filter((p) => p.isAvailable).length}
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                }`}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

            {/* Categories Data Table Container - Fits Sneat Design System 100% */}
            <section className={`rounded-2xl overflow-hidden border shadow-none ${
              dark ? "border-[#4e4f6e] bg-[#2b2c40]" : "border-slate-200/80 bg-white"
            }`}>
              {/* Controls Header */}
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-[#4e4f6e]">
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-base font-semibold ${textPrimary}`}>
                    {language === "km" ? "បញ្ជីប្រភេទមុខម្ហូប" : "Categories List"}
                  </h3>
                  <span className="inline-flex h-5 items-center justify-center rounded-full bg-[#0F522B]/10 px-2.5 text-[11px] font-bold text-[#0F522B]">
                    {filteredCategories.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={createNewCategory}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  {t.createCategory}
                </button>
              </div>

              {/* Data Table */}
              {filteredCategories.length === 0 ? (
                <EmptyState className={`${panelBg} ${borderCol}`}>
                  {t.categories}
                </EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className={`border-b ${borderCol} text-[11px] uppercase tracking-wider text-[#a1acb8] font-semibold bg-[#f5f5f9]/40 ${dark ? "bg-slate-800/10" : ""}`}>
                        <th className="px-5 py-3">
                          {language === "km" ? "ឈ្មោះប្រភេទ" : "CATEGORY"}
                        </th>
                        <th className="px-5 py-3">
                          {language === "km" ? "ការពណ៌នា" : "DESCRIPTION"}
                        </th>
                        <th className="px-5 py-3">
                          {language === "km" ? "ចំនួនមុខម្ហូប" : "PRODUCTS"}
                        </th>
                        <th className="px-5 py-3">
                          {language === "km" ? "ស្ថានភាព" : "STATUS"}
                        </th>
                        <th className="px-5 py-3 text-center">
                          {language === "km" ? "សកម្មភាព" : "ACTIONS"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className={dark ? "divide-y divide-[#4e4f6e]" : "divide-y divide-[#f0f2f5]"}>
                      {filteredCategories.map((category) => {
                        const itemCount = categoryCount(category.id);
                        const style = getCategoryBadgeStyle(category.name);
                        const CategoryIcon = getCategoryIcon(category.name);

                        return (
                          <tr
                            key={category.id}
                            className={`transition-colors duration-200 ${
                              dark ? "hover:bg-[#34354f]" : "hover:bg-[#fcfcfd]"
                            }`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border transition-transform duration-300 hover:scale-105 ${style.bg} ${style.text} ${style.border}`}>
                                  <CategoryIcon size={16} />
                                </div>
                                <span className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-[#566a7f]"}`}>
                                  {category.name}
                                </span>
                              </div>
                            </td>
                            <td className={`px-5 py-3 text-sm max-w-xs truncate ${
                              category.description
                                ? (dark ? "text-slate-400" : "text-[#8592a3]")
                                : "text-slate-400/60 dark:text-slate-500/60 italic"
                            }`}>
                              {category.description || (language === "km" ? "គ្មានការពណ៌នា" : "No description")}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                itemCount === 0
                                  ? "bg-slate-100 text-slate-500 border border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/40"
                                  : style.pill
                              }`}>
                                {language === "km"
                                  ? `${itemCount} មុខ`
                                  : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#71dd37]/10 px-2.5 py-0.5 text-xs font-semibold text-[#71dd37] border border-[#71dd37]/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#71dd37]" />
                                {language === "km" ? "សកម្ម" : "Active"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => editCategory(category)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8592a3] hover:bg-[#696cff]/10 hover:text-[#696cff] transition-all duration-200 hover:scale-105 active:scale-95"
                                  title={`Edit ${category.name}`}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCategory(category)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8592a3] hover:bg-[#ff3e1d]/10 hover:text-[#ff3e1d] transition-all duration-200 hover:scale-105 active:scale-95"
                                  title={`Delete ${category.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
          ) : (
            <>
              {/* Single Integrated Toolbar: Category Tabs (Left) + Actions (Right) */}
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b pb-4 border-slate-200/80 dark:border-[#4e4f6e]">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterButton
                    active={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                    dark={dark}
                    count={categoryCount("all")}
                  >
                    All
                  </FilterButton>

                  {categories.map((category) => (
                    <FilterButton
                      key={category.id}
                      active={selectedCategory === category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      dark={dark}
                      count={categoryCount(category.id)}
                    >
                      {category.name}
                    </FilterButton>
                  ))}
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | "available" | "hidden")
                    }
                    className={`h-9 rounded-lg border px-3 text-xs font-semibold outline-none focus:border-[#0F522B] transition-all ${
                      dark ? "border-[#4e4f6e] bg-[#232333] text-slate-100" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="available">{t.available}</option>
                    <option value="hidden">{t.hidden}</option>
                  </select>

                  {canCreate && (
                    <button
                      type="button"
                      onClick={createNewProduct}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#696cff] px-4 text-xs font-semibold text-white shadow-sm shadow-[#696cff]/20 hover:bg-[#5f61e6] active:scale-95 transition-all"
                    >
                      <Plus size={14} />
                      Add New Product
                    </button>
                  )}
                </div>
              </div>

              <section>
                {loading ? (
                  <EmptyState className={`${panelBg} ${borderCol}`}>
                    {t.loading}
                  </EmptyState>
                ) : filteredProducts.length === 0 ? (
                  <EmptyState className={`${panelBg} ${borderCol}`}>
                    {t.empty}
                  </EmptyState>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    {filteredProducts.map((product) => (
                      <MenuCard
                        key={product.id}
                        product={product}
                        onEdit={() => editProduct(product)}
                        onDelete={() => removeProduct(product)}
                        onView={() => setViewingProduct(product)}
                        onToggle={() => void toggleProductAvailability(product)}
                        text={t}
                        dark={dark}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {!isCategoriesView && editorOpen && (
            <div onClick={() => { resetCategoryForm(); setCategoryEditorOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] p-4 animate-[userModalBackdrop_180ms_ease-out]">
              <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)]">
                <ProductEditor
                  open={editorOpen}
                  onOpenChange={setEditorOpen}
                  productForm={productForm}
                  setProductForm={setProductForm}
                  categories={categories}
                  imagePreview={imagePreview}
                  handleImageFile={handleImageFile}
                  resetProductForm={resetProductForm}
                  submitProduct={submitProduct}
                  saving={saving}
                  inputClass={inputClass}
                  panelBg={surface}
                  mutedPanel={softSurface}
                  borderCol={borderCol}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  text={t}
                />
              </div>
            </div>
          )}

          {/* Product Details View Modal */}
          {viewingProduct && (
            <div onClick={() => setViewingProduct(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] p-4 animate-[userModalBackdrop_180ms_ease-out]">
              <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm overflow-hidden rounded-xl shadow-2xl border p-5 animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)] ${surface} ${borderCol}`}>
                <div className="flex items-center justify-between border-b pb-3 mb-4 border-[#e5e7eb] dark:border-[#4e4f6e]">
                  <h3 className={`text-base font-bold ${textPrimary}`}>
                    {language === "km" ? "ព័ត៌មានមុខម្ហូប" : "Product Details"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewingProduct(null)}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="aspect-[1.3] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 mb-4 border border-[#e5e7eb] dark:border-[#4e4f6e]">
                  {viewingProduct.imageUrl ? (
                    <img src={resolveImageUrl(viewingProduct.imageUrl)} alt={viewingProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Camera size={36} />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className={`text-base font-bold ${textPrimary}`}>{viewingProduct.name}</h4>
                      <span className="mt-1 inline-flex items-center rounded-full bg-[#0F522B]/10 px-2.5 py-0.5 text-[10.5px] font-bold text-[#0F522B]">
                        {viewingProduct.category?.name || "No Category"}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-[#0F522B]">{money(viewingProduct.basePrice)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-b py-2 border-[#e5e7eb] dark:border-[#4e4f6e]">
                    <span className={textSecondary}>{language === "km" ? "ស្ថានភាព" : "Status"}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${viewingProduct.isAvailable ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-red-50 text-red-600 dark:bg-red-500/10"}`}>
                      {viewingProduct.isAvailable ? (language === "km" ? "មានក្នុងស្តុក" : "Available") : (language === "km" ? "អស់ស្តុក" : "Sold Out")}
                    </span>
                  </div>

                  <div>
                    <span className={`block text-[11px] font-bold uppercase tracking-wider ${textSecondary} mb-1`}>
                      {language === "km" ? "ការពណ៌នា" : "Description"}
                    </span>
                    <p className={`text-xs leading-relaxed ${textPrimary} ${!viewingProduct.description ? "italic text-slate-400" : ""}`}>
                      {viewingProduct.description || (language === "km" ? "គ្មានការពណ៌នា" : "No description provided.")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t pt-3 border-[#e5e7eb] dark:border-[#4e4f6e]">
                  <button
                    type="button"
                    onClick={() => {
                      const p = viewingProduct;
                      setViewingProduct(null);
                      editProduct(p);
                    }}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0F522B] px-4 text-xs font-semibold text-white shadow-sm shadow-[#0F522B]/20 hover:bg-[#0A3E20] active:scale-95 transition-all"
                  >
                    <Pencil size={13} />
                    {language === "km" ? "កែប្រែ" : "Edit Product"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Confirmation Modal */}
          {confirmModal.isOpen && (
            <>
              <div
                onClick={() => setConfirmModal((c) => ({ ...c, isOpen: false }))}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer animate-[confirmFadeIn_180ms_ease-out]"
                style={{ background: "rgba(10,12,24,0.65)", backdropFilter: "blur(2px)" }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm cursor-default overflow-hidden rounded-2xl animate-[confirmScaleIn_180ms_ease_both]"
                  style={{
                    background: "linear-gradient(160deg, #1c1e30 0%, #14161f 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* Header */}
                  <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#dc2626", boxShadow: "0 2px 8px rgba(220,38,38,0.25)" }}>
                      <Trash2 size={20} className="text-white" />
                    </div>
                    <h3 className="text-[15px] font-bold text-white leading-snug">{confirmModal.title}</h3>
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {confirmModal.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 px-6 py-5">
                    <button
                      type="button"
                      onClick={() => setConfirmModal((c) => ({ ...c, isOpen: false }))}
                      className="flex-1 h-10 rounded-xl text-xs font-medium transition-colors duration-150 hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)" }}
                    >
                      {language === "km" ? "បោះបង់" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void confirmModal.onConfirm(); }}
                      className="flex-1 h-10 rounded-xl text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 active:opacity-75"
                      style={{ background: "#dc2626", boxShadow: "0 2px 6px rgba(220,38,38,0.2)" }}
                    >
                      {language === "km" ? "លុប" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
              <style>{`
                @keyframes confirmFadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes confirmScaleIn {
                  from { opacity: 0; transform: translateY(6px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </>
          )}

          {isCategoriesView && categoryEditorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px] p-4 animate-[userModalBackdrop_180ms_ease-out]">
              <div className="w-full max-w-md animate-[userModalIn_220ms_cubic-bezier(0.16,1,0.3,1)]">
                <CategoryEditor
                  categoryForm={categoryForm}
                  setCategoryForm={setCategoryForm}
                  submitCategory={submitCategory}
                  resetCategoryForm={resetCategoryForm}
                  onOpenChange={setCategoryEditorOpen}
                  onDelete={() => {
                    const category = categories.find(
                      (entry) => entry.id === categoryForm.id,
                    );
                    if (category) void removeCategory(category);
                  }}
                  inputClass={inputClass}
                  panelBg={surface}
                  mutedPanel={softSurface}
                  borderCol={borderCol}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  text={t}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MenuCard({
  product,
  onEdit,
  onDelete,
  onView,
  onToggle,
  text,
  dark,
  canEdit = true,
  canDelete = true,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onToggle: () => void;
  text: typeof TEXT.en;
  dark: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const unavailable = !product.isAvailable;
  const surface = dark ? "bg-[#2b2c40]" : "bg-white";
  const borderCol = dark ? "border-[#4e4f6e]" : "border-[#d9dee3]";
  const softSurface = dark ? "bg-[#232333]" : "bg-[#f5f5f9]";
  const imgSrc = getFallbackProductImage(product);

  return (
    <article className={`overflow-hidden rounded-2xl ${surface} border ${borderCol} shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#696cff]/40 group`}>
      <div>
        <div className={`relative aspect-[1.3] ${softSurface} overflow-hidden`}>
          <img
            src={imgSrc}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] ${unavailable ? "grayscale opacity-60" : ""}`}
          />

          {unavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 backdrop-blur-[1px]">
              <span className="rounded bg-[#ff3e1d] px-3 py-1 text-[10px] font-bold uppercase text-white tracking-wide shadow shadow-[#ff3e1d]/30">
                {text.soldOut}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[#566a7f] dark:text-[#c9d4ea] leading-tight group-hover:text-[#0F522B] transition-colors">
                {product.name}
              </h3>
              <p className="mt-1 truncate text-xs font-semibold text-[#a1acb8]">
                {product.category?.name || text.noDescription}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="block text-sm font-bold text-[#0F522B] dark:text-emerald-400">
                {money(product.basePrice)}
              </span>
              <span className="block text-[10px] font-semibold text-[#a1acb8]">
                {Math.round(Number(product.basePrice || 0) * 4100).toLocaleString()} ៛
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-[#d9dee3] dark:border-[#4e4f6e]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#8592a3]">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#696cff]/10 hover:text-[#696cff] transition-all"
                title={text.editProduct}
              >
                <Pencil size={14} />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#ff3e1d]/10 hover:text-[#ff3e1d] transition-all"
                title={text.deleteProduct}
              >
                <Trash2 size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onView}
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#696cff]/10 hover:text-[#696cff] transition-all dark:hover:bg-slate-700 dark:hover:text-[#c9d4ea]"
              title={product.description || text.noDescription}
            >
              <Eye size={14} />
            </button>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={product.isAvailable}
              className={`relative h-5 w-9 rounded-full transition-colors active:scale-95 ${
                product.isAvailable ? "bg-[#71dd37]" : "bg-slate-300"
              }`}
              title={product.isAvailable ? text.available : text.hidden}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                  product.isAvailable ? "left-4.5" : "left-0.5"
                }`}
              />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CategoryEditor({
  categoryForm,
  setCategoryForm,
  submitCategory,
  resetCategoryForm,
  onOpenChange,
  onDelete,
  inputClass,
  panelBg,
  mutedPanel,
  borderCol,
  textPrimary,
  textSecondary,
  text,
}: {
  categoryForm: CategoryForm;
  setCategoryForm: React.Dispatch<React.SetStateAction<CategoryForm>>;
  submitCategory: (event: FormEvent<HTMLFormElement>) => void;
  resetCategoryForm: () => void;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  inputClass: string;
  panelBg: string;
  mutedPanel: string;
  borderCol: string;
  textPrimary: string;
  textSecondary: string;
  text: typeof TEXT.en;
}) {
  return (
    <section className={`rounded-xl border shadow-sm ${panelBg} ${borderCol}`}>
      <div className={`flex items-center justify-between gap-3 p-4 ${textPrimary}`}>
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F522B] text-white">
            {categoryForm.id ? <Pencil size={17} /> : <Tags size={17} />}
          </span>

          <span>
            <span className="block text-sm font-bold">
              {categoryForm.id ? text.editCategory : text.createCategory}
            </span>
            <span className={`block text-xs ${textSecondary}`}>
              {categoryForm.id ? text.updateFilter : text.addFilter}
            </span>
          </span>
        </span>

        <button
          type="button"
          onClick={() => {
            resetCategoryForm();
            onOpenChange(false);
          }}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${textSecondary} hover:bg-slate-100`}
          title={text.cancelCategory}
        >
          <X size={17} />
        </button>
      </div>

      <form onSubmit={submitCategory} className={`space-y-3 border-t p-4 ${borderCol}`}>
        <div className={`rounded-lg p-3 ${mutedPanel}`}>
          <Field label={text.categoryName}>
            <input
              required
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={text.description}>
          <textarea
            value={categoryForm.description}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="flex gap-2">
          {categoryForm.id && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              title={text.deleteCategory}
            >
              <Trash2 size={17} />
            </button>
          )}

          <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white hover:bg-violet-800">
            <Save size={17} />
            {categoryForm.id ? text.updateCategory : text.saveCategory}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductEditor({
  open,
  onOpenChange,
  productForm,
  setProductForm,
  categories,
  imagePreview,
  handleImageFile,
  resetProductForm,
  submitProduct,
  saving,
  inputClass,
  panelBg,
  mutedPanel,
  borderCol,
  textPrimary,
  textSecondary,
  text,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productForm: ProductForm;
  setProductForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  categories: Category[];
  imagePreview: string;
  handleImageFile: (file: File | null) => void;
  resetProductForm: () => void;
  submitProduct: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  inputClass: string;
  panelBg: string;
  mutedPanel: string;
  borderCol: string;
  textPrimary: string;
  textSecondary: string;
  text: typeof TEXT.en;
}) {
  return (
    <section className={`rounded-xl border shadow-sm ${panelBg} ${borderCol}`}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`flex w-full items-center justify-between gap-3 p-4 text-left ${textPrimary}`}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F522B] text-white">
            {productForm.id ? <Pencil size={17} /> : <ShoppingBag size={17} />}
          </span>

          <span className="block text-sm font-bold">
            {productForm.id ? text.editItem : text.itemCrud}
          </span>
        </span>

        {open ? <X size={17} /> : <Plus size={17} />}
      </button>

      {open && (
        <form onSubmit={submitProduct} className={`space-y-3 border-t p-4 ${borderCol}`}>
          <label
            className={`mx-auto flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed ${borderCol} ${mutedPanel}`}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Product preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                <ImagePlus size={30} />
                <span className="text-xs font-bold">{text.uploadImage}</span>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleImageFile(event.target.files?.[0] || null)}
            />
          </label>

          <Field label={text.productName}>
            <input
              required
              value={productForm.name}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className={inputClass}
            />
          </Field>

          <Field label={text.category}>
            <select
              required
              value={productForm.categoryId}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="">{text.selectCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={text.basePrice}>
            <div className="relative">
              <BadgeDollarSign
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={productForm.basePrice}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    basePrice: event.target.value,
                  }))
                }
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field label={text.description}>
            <textarea
              value={productForm.description}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <label className={`flex items-center justify-between rounded-lg p-3 ${mutedPanel}`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600" />

              <span>
                <span className={`block text-sm font-bold ${textPrimary}`}>
                  {text.availableToggle}
                </span>
                <span className={`block text-xs ${textSecondary}`}>
                  {text.availableNote}
                </span>
              </span>
            </span>

            <input
              type="checkbox"
              checked={productForm.isAvailable}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  isAvailable: event.target.checked,
                }))
              }
              className="h-5 w-5 accent-[#0F522B] cursor-pointer"
            />
          </label>

          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0F522B] px-4 text-sm font-bold text-white hover:bg-[#0A3E20] active:scale-95 transition-all shadow-sm shadow-[#0F522B]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {productForm.id ? text.saveItem : text.createItem}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function NotificationBell({
  label,
  emptyLabel,
  clearLabel,
  notifications,
  onClear,
}: {
  label: string;
  emptyLabel: string;
  clearLabel: string;
  notifications: MenuNotification[];
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        title={label}
      >
        <Bell size={17} />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-900">
            <span>{label}</span>
            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100"
              >
                {clearLabel}
              </button>
            ) : (
              <Bell size={15} className="text-slate-400" />
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
              {emptyLabel}
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#696cff]/10 text-[#696cff]">
                    <ShoppingBag size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-slate-900 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  dark,
}: {
  label: string;
  children: ReactNode;
  dark: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
        dark
          ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          : "text-[#8592a3] hover:bg-[#eceef1]/60 hover:text-slate-900"
      }`}
      title={label}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  dark,
  count,
  flat = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dark: boolean;
  count?: number;
  flat?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold select-none transition-all active:scale-95 ${
        active
          ? "bg-[#696cff] text-white shadow-sm shadow-[#696cff]/25"
          : dark
            ? "bg-[#232333] text-slate-300 hover:bg-[#2b2c40]"
            : "bg-[#eceef1]/60 text-[#8592a3] hover:bg-[#eceef1]/90"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-[#8592a3]/15 text-[#8592a3]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed p-10 text-center text-sm font-medium text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
}

function resolveImageUrl(value: string) {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `${apiOrigin}${value}`;
}

function getFallbackProductImage(product: Product): string {
  if (product.imageUrl) return resolveImageUrl(product.imageUrl);
  const name = product.name.toLowerCase();
  if (name.includes("cappuccino")) return "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80";
  if (name.includes("cheesecake")) return "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80";
  if (name.includes("chocolate") || name.includes("frappe")) return "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80";
  if (name.includes("croissant")) return "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80";
  if (name.includes("green tea") || name.includes("tea")) return "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&auto=format&fit=crop&q=80";
  if (name.includes("latte")) return "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80";
  if (name.includes("coffee") || name.includes("americano")) return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
}
