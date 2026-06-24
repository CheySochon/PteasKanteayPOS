const { prisma } = require('../lib/prisma');
const { emitPermissionsUpdated } = require('../lib/socket');

const DEFAULT_SETTINGS = {
  restaurantName: {
    value: 'The Tofu',
    category: 'profile',
    description: 'Restaurant display name',
  },
  restaurantEmail: {
    value: 'hello@thetofu.local',
    category: 'profile',
    description: 'Public contact email',
  },
  restaurantPhone: {
    value: '+66 00 000 0000',
    category: 'profile',
    description: 'Public contact phone',
  },
  restaurantImageUrl: {
    value: '',
    category: 'profile',
    description: 'Restaurant profile image used in navigation',
  },
  address: {
    value: 'Bangkok, Thailand',
    category: 'profile',
    description: 'Receipt and customer-facing address',
  },
  currency: {
    value: 'USD',
    category: 'payments',
    description: 'Default currency code',
  },
  taxRate: {
    value: 7,
    category: 'payments',
    description: 'Default tax percentage',
  },
  serviceChargeRate: {
    value: 10,
    category: 'payments',
    description: 'Default service charge percentage',
  },
  receiptFooter: {
    value: 'Thank you for dining with us.',
    category: 'receipts',
    description: 'Receipt footer message',
  },
  autoAcceptQrOrders: {
    value: false,
    category: 'orders',
    description: 'Automatically accept guest QR orders',
  },
  lowStockAlerts: {
    value: true,
    category: 'notifications',
    description: 'Enable low-stock alerts',
  },
  orderNotifications: {
    value: true,
    category: 'notifications',
    description: 'Enable new order notifications',
  },
  kitchenDisplayMode: {
    value: 'compact',
    category: 'operations',
    description: 'Kitchen display density',
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
    category: 'permissions',
    description: 'Page permissions for Staff role',
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
          value: DEFAULT_SETTINGS[key].value,
          category: DEFAULT_SETTINGS[key].category,
          description: DEFAULT_SETTINGS[key].description,
        },
      })
    )
  );
}

function normalizeSettings(rows) {
  return rows.reduce((settings, row) => {
    settings[row.key] = row.value;
    return settings;
  }, {});
}

async function list(req, res) {
  await ensureDefaults();

  const rows = await prisma.appSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  res.json({
    success: true,
    message: 'Settings fetched',
    data: normalizeSettings(rows),
  });
}

async function update(req, res) {
  const input = req.body || {};
  const keys = Object.keys(input).filter((key) => ALLOWED_KEYS.includes(key));

  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid settings provided',
    });
  }

  await ensureDefaults();

  await prisma.$transaction(
    keys.map((key) =>
      prisma.appSetting.update({
        where: { key },
        data: {
          value: sanitizeValue(key, input[key]),
          updatedById: req.user ? req.user.id : undefined,
        },
      })
    )
  );

  const rows = await prisma.appSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const nextSettings = normalizeSettings(rows);

  if (keys.includes('staffPermissions')) {
    emitPermissionsUpdated(nextSettings.staffPermissions);
  }

  res.json({
    success: true,
    message: 'Settings updated',
    data: nextSettings,
  });
}

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Restaurant image is required' });
  }

  const imageUrl = `/uploads/settings/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: 'Restaurant image uploaded',
    data: { imageUrl },
  });
}

function sanitizeValue(key, value) {
  if (['taxRate', 'serviceChargeRate'].includes(key)) {
    return Math.max(0, Number(value || 0));
  }

  if (['autoAcceptQrOrders', 'lowStockAlerts', 'orderNotifications'].includes(key)) {
    return Boolean(value);
  }

  if (key === 'kitchenDisplayMode') {
    return ['compact', 'comfortable'].includes(value) ? value : DEFAULT_SETTINGS[key].value;
  }

  if (key === 'staffPermissions') {
    const defaults = DEFAULT_SETTINGS.staffPermissions.value;
    const input = value && typeof value === 'object' ? value : {};
    const normalizePermissions = (source, fallback = defaults) =>
      Object.keys(defaults).reduce((permissions, permissionKey) => {
        permissions[permissionKey] =
          source && Object.prototype.hasOwnProperty.call(source, permissionKey)
            ? Boolean(source[permissionKey])
            : Boolean(fallback[permissionKey]);
        return permissions;
      }, {});

    const defaultPermissions = normalizePermissions(input.defaults || input, defaults);
    const userPermissions = Object.entries(input.users || {}).reduce((permissions, [userId, userValue]) => {
      if (userValue && typeof userValue === 'object') {
        permissions[userId] = normalizePermissions(userValue, defaultPermissions);
      }

      return permissions;
    }, {});

    return {
      ...defaultPermissions,
      defaults: defaultPermissions,
      users: userPermissions,
    };
  }

  return typeof value === 'string' ? value.trim() : value;
}

module.exports = { list, update, uploadImage };
