"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import {
  Utensils,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Minus,
  ChefHat,
  Loader2,
  UtensilsCrossed,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { apiBaseUrl, apiOrigin, getApiBaseUrl, getApiOrigin, getCategories, getProducts, getSettings } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

const RIEL_RATE = 4100;

const DEMO_FOOD_PHOTOS = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
];

const DEMO_FALLBACK_PRODUCTS: QrMenuData["products"] = [
  {
    id: 901,
    name: "ជើងជ្រូកបំពង (Fried Pork Leg)",
    basePrice: 5.0,
    description: "Crispy skin tender fried pork leg with garlic sauce",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    categoryId: 1,
    isAvailable: true,
    prepTime: 15,
  },
  {
    id: 902,
    name: "ឆាក្តៅអន្ទង់ (Spicy Stir-fried Eel)",
    basePrice: 3.0,
    description: "Traditional Khmer spicy stir-fried eel with lemongrass",
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    categoryId: 1,
    isAvailable: true,
    prepTime: 10,
  },
  {
    id: 903,
    name: "ឆាគ្រឿងក្នុងមាន់ (Stir-fried Chicken Giblets)",
    basePrice: 4.0,
    description: "Savory stir-fried chicken giblets with holy basil",
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80",
    categoryId: 1,
    isAvailable: true,
    prepTime: 10,
  },
  {
    id: 904,
    name: "គោដុតសាច់ក្រហម (Grilled Red Beef)",
    basePrice: 2.75,
    description: "Marinated grilled tender beef with pepper dip",
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
    categoryId: 1,
    isAvailable: true,
    prepTime: 12,
  },
  {
    id: 905,
    name: "គោអាំង (Grilled Beef)",
    basePrice: 3.0,
    description: "Smokey grilled beef slices",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    categoryId: 1,
    isAvailable: true,
    prepTime: 12,
  },
];

type QrMenuData = {
  table: {
    id: number;
    name: string;
    capacity: number;
    zone: string;
    qrToken: string;
  };
  restaurant: {
    name: string;
    logoUrl?: string;
  };
  categories: {
    id: number;
    name: string;
    description?: string;
  }[];
  products: {
    id: number;
    name: string;
    basePrice: number;
    description?: string;
    imageUrl?: string;
    categoryId: number;
    isAvailable: boolean;
    prepTime?: number;
  }[];
};

type CartItem = {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  prepTime?: number;
};

type PageTab = "menu" | "order" | "confirmation" | "tracking";

const parsePriceNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "object" && val !== null) {
    if (val.amount !== undefined) return parsePriceNumber(val.amount);
    if (val.value !== undefined) return parsePriceNumber(val.value);
    if (val.price !== undefined) return parsePriceNumber(val.price);
  }
  return 0;
};

const formatPrice = (usd: any, locale: "EN" | "KH") => {
  const num = parsePriceNumber(usd);
  if (locale === "KH") {
    return `${Math.round(num * RIEL_RATE).toLocaleString()}៛`;
  }
  return `$${num.toFixed(2)}`;
};

const formatDualTotal = (usd: any) => {
  const num = parsePriceNumber(usd);
  const khr = Math.round(num * RIEL_RATE);
  return `$${num.toFixed(2)} / ${khr.toLocaleString()}៛`;
};

function resolveImageUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }
  return `${apiOrigin}${value}`;
}

function getItemPrepTime(item: any): number {
  if (item?.product?.prepTime && Number(item.product.prepTime) > 0) return Number(item.product.prepTime);
  if (item?.prepTime && Number(item.prepTime) > 0) return Number(item.prepTime);

  const name = String(item?.product?.name || item?.name || "").toLowerCase();
  if (name.includes("ជើងជ្រូក") || name.includes("គោដុត") || name.includes("អាំង") || name.includes("grilled") || name.includes("roast")) {
    return 15;
  }
  if (name.includes("ឆា") || name.includes("ស៊ុប") || name.includes("soup") || name.includes("fried") || name.includes("បំពង")) {
    return 10;
  }
  if (name.includes("កាហ្វេ") || name.includes("តែ") || name.includes("ទឹក") || name.includes("drink") || name.includes("tea")) {
    return 5;
  }
  return 12;
}

export default function TableQrPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const resolvedParams = use(params);
  const qrToken = resolvedParams.qrToken;

  const [menuData, setMenuData] = useState<QrMenuData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [logoUrlState, setLogoUrlState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pos_app_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.restaurantImageUrl) return parsed.restaurantImageUrl;
        }
      } catch {}
      return localStorage.getItem("pos_restaurant_image_url") || "";
    }
    return "";
  });
  const [restaurantNameState, setRestaurantNameState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pos_app_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.restaurantName) return parsed.restaurantName;
        }
      } catch {}
      return localStorage.getItem("pos_restaurant_name") || "ផ្ទះកន្ត្រាយ POS";
    }
    return "ផ្ទះកន្ត្រាយ POS";
  });
  const [storeAddressState, setStoreAddressState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pos_app_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.address) return parsed.address;
        }
      } catch {}
    }
    return "Bangkok, Thailand";
  });
  const [storePhoneState, setStorePhoneState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pos_app_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.restaurantPhone) return parsed.restaurantPhone;
        }
      } catch {}
    }
    return "+66 00 000 0000";
  });
  const [storeEmailState, setStoreEmailState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pos_app_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.restaurantEmail) return parsed.restaurantEmail;
        }
      } catch {}
    }
    return "hello@thetofu.local";
  });

  // Navigation & Language States matching my-app
  const [locale, setLocale] = useState<"EN" | "KH">("KH");
  const [activePage, setActivePage] = useState<PageTab>("menu");
  const [highestAllowedPage, setHighestAllowedPage] = useState<PageTab>("menu");
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  const [kdsItemStatuses, setKdsItemStatuses] = useState<Record<number, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("pos_kds_item_statuses");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    function handleItemStatusChange() {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("pos_kds_item_statuses");
          if (stored) {
            setKdsItemStatuses(JSON.parse(stored));
          }
        } catch (e) {}
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("pos-item-status-change", handleItemStatusChange);
      window.addEventListener("storage", handleItemStatusChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pos-item-status-change", handleItemStatusChange);
        window.removeEventListener("storage", handleItemStatusChange);
      }
    };
  }, []);

  // Fetch Admin Settings & Sync dynamically on load and change
  useEffect(() => {
    let mounted = true;

    async function syncStoreSettings() {
      try {
        const settings = await getSettings();
        if (mounted && settings) {
          if (settings.restaurantName) {
            setRestaurantNameState(settings.restaurantName);
            if (typeof window !== "undefined") localStorage.setItem("pos_restaurant_name", settings.restaurantName);
          }
          if (settings.restaurantImageUrl) {
            setLogoUrlState(settings.restaurantImageUrl);
            if (typeof window !== "undefined") localStorage.setItem("pos_restaurant_image_url", settings.restaurantImageUrl);
          }
          if (settings.address) setStoreAddressState(settings.address);
          if (settings.restaurantPhone) setStorePhoneState(settings.restaurantPhone);
          if (settings.restaurantEmail) setStoreEmailState(settings.restaurantEmail);
        }
      } catch {}

      if (mounted && typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("pos_app_settings");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.restaurantName) setRestaurantNameState(parsed.restaurantName);
            if (parsed.restaurantImageUrl) setLogoUrlState(parsed.restaurantImageUrl);
            if (parsed.address) setStoreAddressState(parsed.address);
            if (parsed.restaurantPhone) setStorePhoneState(parsed.restaurantPhone);
            if (parsed.restaurantEmail) setStoreEmailState(parsed.restaurantEmail);
          }
        } catch {}
        const savedName = localStorage.getItem("pos_restaurant_name");
        const savedImage = localStorage.getItem("pos_restaurant_image_url");
        if (savedName) setRestaurantNameState(savedName);
        if (savedImage) setLogoUrlState(savedImage);
      }
    }

    syncStoreSettings();
    window.addEventListener("storage", syncStoreSettings);
    window.addEventListener("pos-settings-change", syncStoreSettings);
    return () => {
      mounted = false;
      window.removeEventListener("storage", syncStoreSettings);
      window.removeEventListener("pos-settings-change", syncStoreSettings);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchMenu() {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/tables/${encodeURIComponent(qrToken)}/menu`);
        const json = await res.json();
        
        let fetchedProducts = (res.ok && json?.success && json?.data?.products) ? json.data.products : [];
        let fetchedCategories = (res.ok && json?.success && json?.data?.categories) ? json.data.categories : [];

        if (fetchedProducts.length === 0) {
          try {
            const [posProds, posCats] = await Promise.all([getProducts(), getCategories()]);
            if (posProds && posProds.length > 0) fetchedProducts = posProds as any;
            if (posCats && posCats.length > 0 && fetchedCategories.length === 0) fetchedCategories = posCats as any;
          } catch {}
        }

        if (mounted) {
          setMenuData({
            table: json?.data?.table || { id: 1, name: "T3", capacity: 4, zone: "indoor", qrToken },
            restaurant: json?.data?.restaurant || { name: restaurantNameState || "ផ្ទះកន្ត្រក ផ្លូវ១០", logoUrl: logoUrlState },
            categories: fetchedCategories,
            products: fetchedProducts,
          });
          setError("");
        }
      } catch (err) {
        try {
          const [posProds, posCats] = await Promise.all([getProducts(), getCategories()]);
          if (mounted && posProds && posProds.length > 0) {
            setMenuData({
              table: { id: 1, name: "T3", capacity: 4, zone: "indoor", qrToken },
              restaurant: { name: restaurantNameState || "ផ្ទះកន្ត្រក ផ្លូវ១០", logoUrl: logoUrlState },
              categories: (posCats as any) || [],
              products: posProds as any,
            });
            setError("");
            return;
          }
        } catch {}

        if (mounted) setError(err instanceof Error ? err.message : "Unable to load menu for this table.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchActiveOrders() {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/orders/qr/${encodeURIComponent(qrToken)}`);
        const json = await res.json();
        if (res.ok && json.success && mounted) {
          const fetchedOrders = json.data || [];
          setActiveOrders(fetchedOrders);
          if (fetchedOrders.length > 0) {
            setHighestAllowedPage("tracking");
          }
        }
      } catch (err) {
        console.error("Failed to fetch active orders", err);
      }
    }

    fetchMenu();
    fetchActiveOrders();

    // 15-second live auto-sync polling net
    const autoSyncInterval = setInterval(() => {
      if (mounted) {
        fetchMenu();
        fetchActiveOrders();
      }
    }, 15000);

    const socket = getSocket();
    if (socket) {
      if (!socket.connected) socket.connect();
      socket.on("order:created", fetchActiveOrders);
      socket.on("order:updated", fetchActiveOrders);
      socket.on("product:created", fetchMenu);
      socket.on("product:updated", fetchMenu);
      socket.on("product:deleted", fetchMenu);
      socket.on("category:created", fetchMenu);
      socket.on("category:updated", fetchMenu);
      socket.on("category:deleted", fetchMenu);
      socket.on("menu:updated", fetchMenu);
    }

    return () => {
      mounted = false;
      clearInterval(autoSyncInterval);
      if (socket) {
        socket.off("order:created", fetchActiveOrders);
        socket.off("order:updated", fetchActiveOrders);
        socket.off("product:created", fetchMenu);
        socket.off("product:updated", fetchMenu);
        socket.off("product:deleted", fetchMenu);
        socket.off("category:created", fetchMenu);
        socket.off("category:updated", fetchMenu);
        socket.off("category:deleted", fetchMenu);
        socket.off("menu:updated", fetchMenu);
      }
    };
  }, [qrToken]);

  function addToCart(product: QrMenuData["products"][0]) {
    if (orderConfirmed) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updated = [
          ...current,
          {
            productId: product.id,
            name: product.name,
            price: parsePriceNumber(product.basePrice),
            quantity: 1,
            imageUrl: product.imageUrl,
          },
        ];
      }

      const totalCount = updated.reduce((sum, i) => sum + i.quantity, 0);
      if (totalCount > 0 && !orderConfirmed) {
        setHighestAllowedPage("order");
      }
      return updated;
    });
  }

  function removeFromCart(productId: number) {
    if (orderConfirmed) return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) return current;
      let updated: CartItem[];
      if (existing.quantity <= 1) {
        updated = current.filter((item) => item.productId !== productId);
      } else {
        updated = current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }

      const totalCount = updated.reduce((sum, i) => sum + i.quantity, 0);
      if (totalCount > 0 && !orderConfirmed) {
        setHighestAllowedPage("order");
      } else if (!orderConfirmed) {
        setHighestAllowedPage("menu");
      }
      return updated;
    });
  }

  function getQuantity(productId: number) {
    return cart.find((item) => item.productId === productId)?.quantity || 0;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + parsePriceNumber(item.price) * item.quantity, 0);

  const rawProducts = menuData?.products || [];

  const filteredProducts = rawProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" ||
      String(product.categoryId) === String(selectedCategory) ||
      (menuData?.categories.find((c) => String(c.id) === String(selectedCategory))?.name.toLowerCase() === (product as any).category?.name?.toLowerCase());

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  const isPageAccessible = (targetPage: PageTab): boolean => {
    const sequence: PageTab[] = ["menu", "order", "confirmation", "tracking"];
    return sequence.indexOf(targetPage) <= sequence.indexOf(highestAllowedPage);
  };

  const navigateToPage = (page: PageTab) => {
    if (isPageAccessible(page)) {
      setActivePage(page);
    }
  };

  const proceedToConfirmation = () => {
    setHighestAllowedPage("confirmation");
    setActivePage("confirmation");
  };

  async function handleConfirmOrder() {
    if (cart.length === 0 || !menuData) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: menuData.table?.id,
          tableNo: menuData.table?.name,
          orderType: "dine-in",
          notes: orderNote,
          items: cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: totalPrice,
          tax: 0,
          discount: 0,
          totalAmount: totalPrice,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit order");
      }

      const socket = getSocket();
      if (socket) {
        if (socket.connected) {
          socket.emit("order:new", json.data);
        } else {
          socket.once("connect", () => {
            socket.emit("order:new", json.data);
          });
          socket.connect();
        }
      }

      setOrderConfirmed(true);
      setCart([]);
      setHighestAllowedPage("tracking");
      setActivePage("tracking");

      // Refetch active orders for table
      try {
        const resOrders = await fetch(`${apiBaseUrl}/orders/qr/${encodeURIComponent(qrToken)}`);
        const jsonOrders = await resOrders.json();
        if (resOrders.ok && jsonOrders.success) {
          setActiveOrders(jsonOrders.data || []);
        }
      } catch (e) {
        console.error("Failed to refresh orders", e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to place order.");
    } finally {
      setSubmitting(false);
    }
  }

  const t = (en: string, kh: string) => (locale === "EN" ? en : kh);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-[#4EA668]" />
          <p className="text-sm font-bold text-slate-600">Loading Table Menu...</p>
        </div>
      </div>
    );
  }

  if (error && !menuData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center font-sans">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 mb-4 shadow-sm">
          <UtensilsCrossed size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Menu Unavailable</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-xs">{error}</p>
      </div>
    );
  }

  const restaurantName = restaurantNameState || menuData?.restaurant?.name || "ផ្ទះកន្ត្រាយ POS";
  const tableName = menuData?.table?.name || "Table";
  const isReadOnly = orderConfirmed;
  const finalLogoUrl = logoUrlState || menuData?.restaurant?.logoUrl || "";

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans text-slate-800 selection:bg-emerald-100 pb-20 md:pb-8">
      {/* ── TOP RESPONSIVE HEADER ── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Top Search Field (Visible on Mobile < md) */}
          <div className="flex md:hidden items-center flex-1 mr-3 min-w-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search...", "ស្វែងរក...")}
                className="font-khmer w-full rounded-2xl border border-slate-200/90 bg-slate-50 py-2 pl-9 pr-7 text-xs font-normal outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#4EA668] transition-all text-slate-900 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200/60 rounded-full h-4.5 w-4.5 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs (Visible on Desktop >= md) */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {[
              { icon: Utensils, label: t("Menu", "ម៉ឺនុយ"), page: "menu" as PageTab },
              { icon: ShoppingBag, label: t("My Order", "ការកម្មង់"), page: "order" as PageTab },
              { icon: CheckCircle2, label: t("Confirmation", "ការបញ្ជាក់"), page: "confirmation" as PageTab },
              { icon: Clock, label: t("Tracking", "តាមដាន"), page: "tracking" as PageTab },
            ].map((nav) => {
              const isActive = nav.page === activePage;
              const allowed = isPageAccessible(nav.page);
              const Icon = nav.icon;

              return (
                <button
                  key={nav.page}
                  disabled={!allowed}
                  type="button"
                  onClick={() => navigateToPage(nav.page)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium font-khmer transition-all ${
                    isActive
                      ? "bg-[#4EA668] text-white shadow-xs"
                      : allowed
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/50 cursor-pointer"
                      : "text-slate-300 cursor-not-allowed"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                  <span>{nav.label}</span>
                  {nav.page === "order" && totalItems > 0 && (
                    <span className="bg-white text-[#4EA668] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {totalItems}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Language Selector & Desktop Cart Shortcut */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            {/* Language Switcher Pill */}
            <div className="relative flex h-8 w-20 shrink-0 rounded-full bg-[#F2F2F7] p-0.5 shadow-inner">
              <div
                className={`absolute top-0.5 bottom-0.5 w-9 rounded-full bg-[#4EA668] transition-all duration-300 ease-out z-0 shadow-xs ${
                  locale === "EN" ? "left-0.5" : "left-[39px]"
                }`}
              />
              <button
                type="button"
                onClick={() => setLocale("EN")}
                className={`relative z-10 flex-1 text-[11px] font-semibold transition-colors ${
                  locale === "EN" ? "text-white" : "text-slate-400"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("KH")}
                className={`relative z-10 flex-1 text-[11px] font-semibold transition-colors ${
                  locale === "KH" ? "text-white" : "text-slate-400"
                }`}
              >
                KH
              </button>
            </div>

            {/* Desktop Direct View Order Button */}
            {totalItems > 0 && activePage === "menu" && (
              <button
                type="button"
                onClick={() => navigateToPage("order")}
                className="hidden lg:flex items-center gap-2 rounded-xl bg-[#4EA668] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#3D8F55] transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag size={15} />
                <span>{totalItems} {t("Items", "មុខ")} • {formatPrice(totalPrice, locale)}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ERROR ALERT TOAST */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600">
            {error}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* MENU TAB */}
        {activePage === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Search, Categories & Products Grid */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-5">
              {/* STORE INFO BANNER CARD (Matching User Design & Backend Settings) */}
              <div className="rounded-2xl bg-white border-0 sm:border sm:border-slate-200/90 p-5 sm:p-6 shadow-none sm:shadow-xs flex flex-col items-center text-center space-y-2.5">
                {/* Store Image / Logo from Backend */}
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs flex items-center justify-center">
                  {finalLogoUrl ? (
                    <img
                      src={resolveImageUrl(finalLogoUrl)}
                      alt={restaurantName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Utensils size={32} className="text-[#4EA668]" />
                  )}
                </div>

                {/* Store Name */}
                <h2 className="font-khmer text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {restaurantName}
                </h2>

                {/* Store Details: Location, Phone, Email from Backend Settings */}
                <div className="flex flex-col items-center gap-1.5 text-xs text-slate-600 font-medium pt-0.5">
                  {storeAddressState && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="font-khmer">{storeAddressState}</span>
                    </div>
                  )}
                  {storePhoneState && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{storePhoneState}</span>
                    </div>
                  )}
                  {storeEmailState && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span>{storeEmailState}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Category Pills & Search Filter Row (Matching POS Screen) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Category Horizontal Scroll Pills */}
                <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar items-center flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`shrink-0 rounded-full px-5 py-2 text-xs sm:text-sm font-medium font-khmer transition-all cursor-pointer shadow-xs ${
                      selectedCategory === "all"
                        ? "bg-[#4EA668] text-white shadow-sm"
                        : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t("All", "ទាំងអស់")}
                  </button>
                  {(menuData?.categories || []).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`shrink-0 rounded-full px-5 py-2 text-xs sm:text-sm font-medium font-khmer transition-all cursor-pointer shadow-xs ${
                        selectedCategory === cat.id
                          ? "bg-[#4EA668] text-white shadow-sm"
                          : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Search Field */}
                <div className="relative w-full sm:w-60 lg:w-64 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("Search...", "ស្វែងរក...")}
                    className="font-khmer w-full rounded-2xl border border-slate-200/90 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm font-normal outline-none placeholder:text-slate-400 focus:border-[#4EA668] focus:ring-4 focus:ring-[#4EA668]/10 transition-all text-slate-900 shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 rounded-full h-5 w-5 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>



              {/* Responsive 2-Col Mobile / 3-Col Tablet / 4-Col Desktop Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4.5">
                {filteredProducts.map((product) => {
                  const qty = getQuantity(product.id);
                  const hasQty = qty > 0;
                  const categoryName = menuData?.categories.find((c) => c.id === product.categoryId)?.name || t("Food", "ប្រភេទម្ហូប");

                  return (
                    <div
                      key={product.id}
                      className="group relative flex flex-col rounded-2xl bg-white p-3 shadow-xs border border-slate-200/80 hover:border-[#C5E9D0] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {/* Product Thumbnail with POS Category Badge Tag & Click-to-Order Photo */}
                      <div
                        onClick={() => !isReadOnly && addToCart(product)}
                        className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer group-hover:opacity-95 transition-opacity"
                        title={t("Click image to add to cart", "ចុចលើរូបភាពដើម្បីបន្ថែមចូលកន្ត្រក")}
                      >
                        {/* POS Category Badge Tag (Top-Left) */}
                        <div className="absolute top-0 left-0 bg-[#4EA668] text-white text-[10px] font-medium px-2.5 py-0.5 rounded-br-xl rounded-tl-xl z-10 shadow-xs">
                          {categoryName}
                        </div>

                        {product.imageUrl ? (
                          <img
                            src={resolveImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full w-full text-[#4EA668]/40">
                            <Utensils size={32} className="stroke-[1.6]" />
                          </div>
                        )}

                        {/* Floating Action Button (Bottom-Right of Image matching POS Screen) */}
                        {!hasQty ? (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#4EA668] hover:bg-[#3D8F55] text-white shadow-sm hover:scale-105 active:scale-90 transition-all cursor-pointer z-10"
                            title="Add to cart"
                          >
                            <Plus size={16} className="stroke-[2.5]" />
                          </button>
                        ) : (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 flex items-center justify-between rounded-full bg-white/95 backdrop-blur-xs border border-[#C5E9D0] overflow-hidden h-7 w-[80px] shadow-sm z-10"
                          >
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(product.id);
                              }}
                              className="flex h-full w-7 items-center justify-center text-xs font-semibold text-[#4EA668] hover:bg-[#EAF5ED] cursor-pointer"
                            >
                              −
                            </button>
                            <span className="text-xs font-semibold text-[#4EA668]">
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="flex h-full w-7 items-center justify-center text-xs font-semibold text-[#4EA668] hover:bg-[#EAF5ED] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Title - Clickable to Add to Cart */}
                      <h4
                        onClick={() => !isReadOnly && addToCart(product)}
                        className="font-khmer text-xs sm:text-sm font-medium text-slate-800 mb-1.5 leading-snug line-clamp-2 min-h-[36px] cursor-pointer hover:text-[#4EA668] transition-colors"
                      >
                        {product.name}
                      </h4>

                      {/* Price Tag matching POS System Style - Lighter font weight */}
                      <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm sm:text-base font-semibold text-[#4EA668]">
                          {formatPrice(Number(product.basePrice), locale)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Desktop Sidebar Cart Panel (Visible on Desktop >= lg) */}
            <div className="hidden lg:block lg:col-span-4 xl:col-span-4">
              <div className="sticky top-20 rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm flex flex-col h-[calc(100vh-6.5rem)] max-h-[680px] min-h-[560px]">
                {/* Fixed Top Header */}
                <div className="shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="text-[#4EA668]" size={20} />
                    <h3 className="font-khmer text-base font-semibold text-slate-800">{t("Your Order", "ការបញ្ជាទិញ")}</h3>
                  </div>
                  <span className="rounded-full bg-[#EAF5ED] border border-[#C5E9D0] px-3 py-1 text-xs font-semibold text-[#4EA668]">
                    Table {tableName}
                  </span>
                </div>

                {cart.length === 0 ? (
                  /* Empty State Centered in Static Card */
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 py-8">
                    <div className="text-4xl">🛒</div>
                    <p className="text-xs font-semibold text-slate-600">
                      {t("Your cart is empty", "មិនទាន់មានទំនិញក្នុងកន្ត្រក")}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-[200px]">
                      {t("Select dishes from the menu to build your order.", "សូមជ្រើសរើសមុខម្ហូបពីម៉ឺនុយដើម្បីដាក់កម្មង់")}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items Scroll List (Flex-1 Scrollable Area) */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-2 no-scrollbar min-h-0">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#EAF5ED]">
                            {item.imageUrl ? (
                              <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#4EA668]">
                                <Utensils size={18} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="truncate text-xs font-medium text-slate-800">{item.name}</h5>
                            <div className="text-[11px] font-medium text-[#4EA668]">
                              {formatPrice(item.price, locale)} × {item.quantity}
                            </div>
                          </div>
                          <div className="flex items-center rounded-full bg-white border border-slate-200 overflow-hidden h-7">
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => removeFromCart(item.productId)}
                              className="h-full px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              −
                            </button>
                            <span className="px-1.5 text-xs font-semibold text-[#4EA668]">{item.quantity}</span>
                            <button
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => addToCart({ id: item.productId, name: item.name, basePrice: item.price, categoryId: 0, isAvailable: true })}
                              className="h-full px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fixed Bottom Footer (Notes, Total & Button) */}
                    <div className="shrink-0 pt-3 border-t border-slate-100 space-y-3 mt-auto">
                      {/* Special Notes Field */}
                      <div>
                        <label htmlFor="desktop-order-note" className="block text-xs font-semibold text-slate-700 mb-1">
                          {t("Order Notes", "កំណត់សម្គាល់")}
                        </label>
                        <textarea
                          id="desktop-order-note"
                          disabled={isReadOnly}
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder={t("Special requests (e.g., no spicy...)", "បន្ថែមការស្នើសុំពិសេស...")}
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-normal outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#4EA668] transition-all resize-none"
                        />
                      </div>

                      {/* Summary & Checkout Action */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">{t("Total Amount", "តម្លៃសរុប")}</span>
                        <span className="text-sm font-semibold text-[#4EA668]">{formatDualTotal(totalPrice)}</span>
                      </div>

                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={proceedToConfirmation}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4EA668] py-3 text-white font-semibold text-xs shadow-md shadow-[#4EA668]/20 hover:bg-[#3D8F55] active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span>{t("Proceed to Confirmation", "បន្តទៅការបញ្ជាក់")}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MY ORDER TAB */}
        {activePage === "order" && (
          <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t("Your Order", "ការបញ្ជាទិញ")}</h2>
                <p className="text-xs font-semibold text-slate-400">Table {tableName}</p>
              </div>
              <button
                type="button"
                onClick={() => navigateToPage("menu")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>{t("Back to Menu", "ត្រឡប់ទៅម៉ឺនុយ")}</span>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center text-slate-400 border border-slate-200/80 shadow-xs space-y-3">
                <div className="text-5xl">🛒</div>
                <div className="text-base font-bold text-slate-700">
                  {t("Your order is empty", "មិនមានការបញ្ជាទិញ")}
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {t("Explore our delicious menu and add items to your cart.", "សូមជ្រើសរើសម្ហូបពីម៉ឺនុយដើម្បីបន្ថែមចូលការបញ្ជាទិញ")}
                </p>
                <button
                  type="button"
                  onClick={() => navigateToPage("menu")}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#4EA668] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#4EA668]/20 hover:bg-[#3D8F55] transition-all cursor-pointer"
                >
                  <Utensils size={14} />
                  <span>{t("Browse Menu", "មើលម៉ឺនុយ")}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Items List */}
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-xs border border-slate-200/80"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EAF5ED]">
                        {item.imageUrl ? (
                          <img
                            src={resolveImageUrl(item.imageUrl)}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#4EA668]">
                            <Utensils size={22} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="truncate text-sm font-bold text-slate-900">{item.name}</h4>
                        <div className="mt-0.5 text-xs font-extrabold text-[#4EA668]">
                          {formatPrice(item.price, locale)}
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center rounded-full bg-[#EAF5ED] border border-[#C5E9D0] overflow-hidden">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => removeFromCart(item.productId)}
                          className="flex h-8 w-8 items-center justify-center text-sm font-bold text-[#4EA668] hover:bg-[#4EA668]/10 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center text-xs font-bold text-[#4EA668]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => addToCart({ id: item.productId, name: item.name, basePrice: item.price, categoryId: 0, isAvailable: true })}
                          className="flex h-8 w-8 items-center justify-center text-sm font-bold text-[#4EA668] hover:bg-[#4EA668]/10 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Special Order Notes */}
                <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
                  <label htmlFor="order-note-field" className="block text-xs font-bold text-slate-900 mb-2">
                    {t("Order Notes", "កំណត់សម្គាល់")}
                  </label>
                  <textarea
                    id="order-note-field"
                    disabled={isReadOnly}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t("Add special requests (e.g., no spicy, less sweet...)", "បន្ថែមការស្នើសុំពិសេស (ឧ. មិនហិរ, ផ្អែមតិច...)...")}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs sm:text-sm font-medium outline-none placeholder:text-slate-400 focus:bg-white focus:border-[#4EA668] transition-all resize-none text-slate-800 disabled:bg-slate-100"
                  />
                </div>

                {/* Total & Place Order Action */}
                <div className="rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80">
                  <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200">
                    <span className="text-sm font-black text-slate-900">{t("Total", "សរុប")}</span>
                    <span className="text-base font-black text-[#4EA668]">
                      {formatDualTotal(totalPrice)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={proceedToConfirmation}
                    className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#4EA668] px-5 py-3.5 text-white font-bold text-sm shadow-md shadow-[#4EA668]/20 hover:bg-[#3D8F55] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isReadOnly ? t("Order Locked", "ការកម្មង់ត្រូវបានចាក់សោ") : t("Place Order", "ដាក់ការបញ្ជាទិញ")}</span>
                    <span className="rounded-lg bg-white/20 px-3 py-1 text-xs font-black">
                      {formatDualTotal(totalPrice)}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONFIRMATION TAB */}
        {activePage === "confirmation" && (
          <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-4">
            <div className="overflow-hidden rounded-2xl bg-[#4EA668] px-6 py-6 text-center text-white shadow-sm">
              <div className="text-[11px] uppercase tracking-widest font-extrabold text-white/70 mb-1">
                {t("Review your order", "ពិនិត្យការបញ្ជាទិញ")}
              </div>
              <h2 className="text-2xl font-black">Table {tableName}</h2>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-xs">
                <Clock size={15} />
                <span>{t("Est. ready in 10-15 mins", "រៀបចំរួចរាល់ក្នុងរយៈពេល 10-15 នាទី")}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Items Summary */}
              <div className="overflow-hidden rounded-2xl bg-white shadow-xs border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="text-xs font-bold text-slate-900">{t("Order Items", "មុខម្ហូប")}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-500">
                    {cart.length} {t("items", "មុខ")}
                  </span>
                </div>
                {cart.map((item, i) => (
                  <div
                    key={item.productId}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < cart.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#EAF5ED]">
                      {item.imageUrl ? (
                        <img
                          src={resolveImageUrl(item.imageUrl)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#4EA668]">
                          <Utensils size={18} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {formatPrice(item.price, locale)} × {item.quantity}
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-800">
                      {formatPrice(item.price * item.quantity, locale)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Notes if any */}
              {orderNote && (
                <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    {t("Special Notes", "កំណត់ពិសេស")}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">{orderNote}</p>
                </div>
              )}

              {/* Bill Total */}
              <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">{t("Total", "សរុប")}</span>
                  <span className="text-base font-black text-[#4EA668]">
                    {formatDualTotal(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Confirmation Action Buttons */}
              {!orderConfirmed ? (
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmOrder}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4EA668] py-3.5 text-sm font-bold text-white shadow-md shadow-[#4EA668]/20 hover:bg-[#3D8F55] active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span>{t("Confirm Order", "បញ្ជាក់ការបញ្ជាទិញ")}</span>
                        <Check size={18} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToPage("order")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>{t("Edit Order", "កែប្រែការបញ្ជាទិញ")}</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-[#EAF5ED] p-4 text-center text-sm font-extrabold text-[#4EA668] border border-[#C5E9D0] shadow-xs">
                  ✓ {t("Sent to Kitchen Successfully!", "បានផ្ញើទៅផ្ទះបាយរួចហើយ!")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRACKING TAB */}
        {activePage === "tracking" && (
          <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  TABLE {tableName}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t("Track Order", "តាមដានការបញ្ជាទិញ")}</h2>
              </div>
              <button
                type="button"
                onClick={() => navigateToPage("menu")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
              >
                <Utensils size={14} />
                <span>{t("Back to Menu", "ត្រឡប់ទៅម៉ឺនុយ")}</span>
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center shadow-xs border border-slate-200/80 space-y-2">
                <Clock className="mx-auto h-12 w-12 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">
                  {t("No active orders found right now.", "មិនទាន់មានការបញ្ជាទិញកំពុងដំណើរការឡើយ")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const isReady = order.status === "ready" || order.status === "served";
                  const isCooking = order.status === "preparing";
                  const currentStepIndex = isReady ? 2 : isCooking ? 1 : 0;
                  const itemPrepTimes = (order.items || []).map((item: any) => getItemPrepTime(item));
                  const maxPrepTime = itemPrepTimes.length > 0 ? Math.max(...itemPrepTimes) : 12;

                  return (
                    <div key={order.id} className="rounded-2xl bg-white p-5 shadow-xs border border-slate-200/80 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="text-sm font-black text-slate-900">Order #{order.orderNumber || order.id}</div>
                          <div className="text-[11px] font-semibold text-slate-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-700">
                            <Clock size={13} className="text-amber-500" />
                            <span>{maxPrepTime} {t("mins est.", "នាទី")}</span>
                          </span>
                          <span className={`rounded-lg px-3 py-1 text-xs font-extrabold ${
                            isReady ? "bg-emerald-100 text-emerald-700" :
                            isCooking ? "bg-[#EAF5ED] text-[#4EA668]" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Items List with Per-Item Preparation Minutes */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                          {t("Ordered Dishes & Prep Time", "មុខម្ហូប និង ពេលវេលារៀបចំ")}
                        </div>
                        {order.items?.map((item: any) => {
                          const prepMins = getItemPrepTime(item);
                          const isDone = kdsItemStatuses[item.id] === "completed" || item.isCompleted || item.status === "completed" || isReady;

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                isDone
                                  ? "bg-slate-50/70 border-slate-200/60 opacity-85"
                                  : "bg-slate-50 border-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  isDone ? "bg-emerald-100 text-emerald-800" : "bg-[#EAF5ED] text-[#4EA668]"
                                }`}>
                                  {item.quantity}x
                                </span>
                                <span className={`truncate font-semibold ${isDone ? "line-through text-slate-400 font-normal" : "text-slate-800"}`}>
                                  {item.product?.name || item.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-2">
                                {/* Cooking / Prep Time or Completed Badge per dish */}
                                {isDone ? (
                                  <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-2xs">
                                    ✓ {t("Ready", "រួចរាល់")}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 bg-white border border-amber-200/90 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-2xs">
                                    <Clock size={11} className="text-amber-500" />
                                    <span>{prepMins} {t("mins", "នាទី")}</span>
                                  </span>
                                )}
                                <span className={`font-bold min-w-[50px] text-right ${isDone ? "text-slate-400 line-through font-normal" : "text-[#4EA668]"}`}>
                                  {formatPrice(Number(item.price), locale)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tracking Step Timeline */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        {[
                          { key: "received", en: "Order Received", kh: "ទទួលការបញ្ជាទិញ" },
                          { key: "preparing", en: `Preparing / Cooking (Est. ~${maxPrepTime} mins)`, kh: `កំពុងចម្អិន/រៀបចំ (ប្រហែល ${maxPrepTime} នាទី)` },
                          { key: "ready", en: "Ready / Served", kh: "រួចរាល់/លើកជូន" },
                        ].map((step, idx) => {
                          const done = idx <= currentStepIndex;
                          const active = idx === currentStepIndex;
                          return (
                            <div key={step.key} className="flex items-center gap-3">
                              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                done ? "bg-[#4EA668] text-white" : "bg-slate-100 text-slate-400"
                              }`}>
                                {done ? "✓" : idx + 1}
                              </div>
                              <span className={`text-xs font-bold ${active ? "text-slate-900 font-extrabold" : done ? "text-slate-700" : "text-slate-400"}`}>
                                {t(step.en, step.kh)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MOBILE FLOATING ORDER BAR (Mobile < md only) ── */}
      {totalItems > 0 && activePage === "menu" && !isReadOnly && (
        <div className="md:hidden fixed bottom-18 left-4 right-4 bg-[#4EA668] rounded-2xl p-3 px-4 flex items-center justify-between text-white shadow-[0_12px_30px_-5px_rgba(78,166,104,0.4)] z-30 animate-[slideFromBottom_300ms_cubic-bezier(0.16,1,0.3,1)]">
          <div>
            <div className="font-bold text-xs flex items-center gap-1.5">
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{totalItems}</span>
              <span>{t("Items Selected", "មុខទំនិញជ្រើសរើស")}</span>
            </div>
            <div className="text-[11px] opacity-90 mt-0.5">
              {t("Total", "សរុប")}: {formatDualTotal(totalPrice)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateToPage("order")}
            className="bg-white text-[#4EA668] rounded-xl px-3.5 py-2 text-xs font-extrabold hover:bg-emerald-50 active:scale-95 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <span>{t("View Order", "មើលការបញ្ជាទិញ")}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAVIGATION BAR (Mobile < md only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around py-2.5 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { icon: Utensils, label: t("Menu", "ម៉ឺនុយ"), page: "menu" as PageTab },
          { icon: ShoppingBag, label: t("My Order", "ការកម្មង់"), page: "order" as PageTab },
          { icon: CheckCircle2, label: t("Confirmation", "ការបញ្ជាក់"), page: "confirmation" as PageTab },
          { icon: Clock, label: t("Tracking", "តាមដាន"), page: "tracking" as PageTab },
        ].map((nav) => {
          const isActive = nav.page === activePage;
          const allowed = isPageAccessible(nav.page);
          const Icon = nav.icon;

          return (
            <button
              key={nav.page}
              disabled={!allowed}
              type="button"
              onClick={() => navigateToPage(nav.page)}
              className={`relative flex flex-col items-center gap-1 transition-all active:scale-95 duration-200 px-3 py-0.5 ${
                allowed ? "opacity-100 cursor-pointer" : "opacity-30 cursor-not-allowed"
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-all duration-200 ${isActive ? "text-[#4EA668] scale-110" : "text-slate-400"}`}
                />
                {nav.page === "order" && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#4EA668] text-white text-[9.5px] font-black h-4 px-1.5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {totalItems}
                  </span>
                )}
              </div>
              <span
                className={`font-khmer text-[10.5px] ${
                  isActive ? "font-bold text-[#4EA668]" : "font-semibold text-slate-400"
                }`}
              >
                {nav.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
