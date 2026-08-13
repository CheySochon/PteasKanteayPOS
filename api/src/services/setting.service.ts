import { prisma } from "../config/prisma.js";

type SettingValue = string | number | boolean | Record<string, unknown>;

const DEFAULT_SETTINGS: Record<
  string,
  { value: SettingValue; category: string; description: string }
> = {
  restaurantName: {
    value: "The Tofu",
    category: "profile",
    description: "Restaurant display name",
  },
  restaurantEmail: {
    value: "hello@thetofu.local",
    category: "profile",
    description: "Public contact email",
  },
  restaurantPhone: {
    value: "+66 00 000 0000",
    category: "profile",
    description: "Public contact phone",
  },
  restaurantImageUrl: {
    value: "",
    category: "profile",
    description: "Restaurant profile image",
  },
  address: {
    value: "Bangkok, Thailand",
    category: "profile",
    description: "Receipt and customer-facing address",
  },
  vatTin: {
    value: "",
    category: "profile",
    description: "VAT TIN registration number",
  },
  currency: {
    value: "USD",
    category: "payments",
    description: "Default currency code",
  },
  taxRate: {
    value: 7,
    category: "payments",
    description: "Default tax percentage",
  },
  serviceChargeRate: {
    value: 10,
    category: "payments",
    description: "Default service charge percentage",
  },
  receiptFooter: {
    value: "Thank you for dining with us.",
    category: "receipts",
    description: "Receipt footer message",
  },
  autoAcceptQrOrders: {
    value: false,
    category: "orders",
    description: "Automatically accept guest QR orders",
  },
  lowStockAlerts: {
    value: true,
    category: "notifications",
    description: "Enable low-stock alerts",
  },
  orderNotifications: {
    value: true,
    category: "notifications",
    description: "Enable new order notifications",
  },
  kitchenDisplayMode: {
    value: "compact",
    category: "operations",
    description: "Kitchen display density",
  },
  staffPermissions: {
    value: {
      dashboard: true,
      orders: true,
      menu: true,
      inventory: true,
      tables: true,
      reports: false,
      users: false,
      settings: false,
      pos: false,
      kds: true,
    },
    category: "permissions",
    description: "Page permissions for Staff role",
  },
  telegramBotToken: {
    value: "",
    category: "telegram",
    description: "Telegram Bot API Token",
  },
  telegramChatId: {
    value: "",
    category: "telegram",
    description: "Telegram Chat ID",
  },
  telegramAlertLogin: {
    value: true,
    category: "telegram",
    description: "Send alert on staff login",
  },
  telegramAlertFailedLogin: {
    value: true,
    category: "telegram",
    description: "Send warning alert on failed login",
  },
  telegramAlertNewOrder: {
    value: true,
    category: "telegram",
    description: "Send alert on new order",
  },
};

const ALLOWED_KEYS = Object.keys(DEFAULT_SETTINGS);

async function ensureDefaults() {
  await Promise.all(
    ALLOWED_KEYS.map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          value: DEFAULT_SETTINGS[key].value as any,
          category: DEFAULT_SETTINGS[key].category,
          description: DEFAULT_SETTINGS[key].description,
        },
      }),
    ),
  );
}

function normalizeSettings(rows: { key: string; value: SettingValue }[]) {
  return rows.reduce<Record<string, SettingValue>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

function sanitizeValue(key: string, value: unknown): SettingValue {
  if (["taxRate", "serviceChargeRate"].includes(key)) {
    return Math.max(0, Number(value ?? 0));
  }

  if (["autoAcceptQrOrders", "lowStockAlerts", "orderNotifications", "telegramAlertLogin", "telegramAlertFailedLogin", "telegramAlertNewOrder"].includes(key)) {
    return Boolean(value);
  }

  if (key === "kitchenDisplayMode") {
    const val = typeof DEFAULT_SETTINGS[key].value === "string" ? DEFAULT_SETTINGS[key].value : "compact";
    return ["compact", "comfortable"].includes(String(value))
      ? String(value)
      : val;
  }

  return typeof value === "string" ? value.trim() : (value as SettingValue);
}

export const listSettings = async () => {
  await ensureDefaults();
  const rows = await prisma.appSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  return normalizeSettings(rows as { key: string; value: SettingValue }[]);
};

export const updateSettings = async (
  input: Record<string, unknown>,
  updatedById?: number,
) => {
  const keys = Object.keys(input).filter((key) => ALLOWED_KEYS.includes(key));

  if (keys.length === 0) throw new Error("No valid settings provided");

  await ensureDefaults();

  await prisma.$transaction(
    keys.map((key) =>
      prisma.appSetting.update({
        where: { key },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          value: sanitizeValue(key, input[key]) as any,
          updatedById,
        },
      }),
    ),
  );

  const rows = await prisma.appSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return normalizeSettings(rows as { key: string; value: SettingValue }[]);
};
