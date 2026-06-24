const { prisma } = require('../lib/prisma');
const bcrypt = require('bcryptjs');

const ALLOWED_ROLES = ['Super Admin', 'Admin', 'Cashier', 'Staff', 'Member'];
const ELEVATED_ROLES = ['Super Admin', 'Admin'];

function sanitize(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function list(req, res) {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, message: 'Users fetched', data: users.map(sanitize) });
}

async function roles(req, res) {
  await ensureRoles();

  const visibleRoles = req.user && req.user.role === 'Super Admin'
    ? ALLOWED_ROLES
    : ALLOWED_ROLES.filter((role) => !ELEVATED_ROLES.includes(role));

  const data = await prisma.role.findMany({
    where: { name: { in: visibleRoles } },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, message: 'Roles fetched', data });
}

async function create(req, res) {
  const { name, email, password, roleName = 'Staff', isActive = true } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Email is already registered',
    });
  }

  if (!canAssignRole(req.user, roleName)) {
    return res.status(403).json({
      success: false,
      message: 'Only Super Admin can assign Admin roles',
    });
  }

  const role = await findRole(roleName);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      roleId: role.id,
      isActive: Boolean(isActive),
    },
    include: { role: true },
  });

  res.status(201).json({ success: true, message: 'User created', data: sanitize(user) });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const { name, email, password, roleName, isActive } = req.body || {};
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (req.user && req.user.id === id) {
    if (isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own user account',
      });
    }

    if (roleName && roleName !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }
  }

  if (req.user && req.user.role !== 'Super Admin' && ELEVATED_ROLES.includes(existing.role.name) && req.user.id !== id) {
    return res.status(403).json({
      success: false,
      message: 'Only Super Admin can edit Admin users',
    });
  }

  if (roleName && roleName !== existing.role.name && !canAssignRole(req.user, roleName)) {
    return res.status(403).json({
      success: false,
      message: 'Only Super Admin can assign Admin roles',
    });
  }

  const data = {};

  if (name !== undefined) data.name = String(name).trim();
  if (email !== undefined) data.email = String(email).trim().toLowerCase();
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (password) data.password = await bcrypt.hash(password, 10);
  if (roleName) {
    const role = await findRole(roleName);
    data.roleId = role.id;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: { role: true },
  });

  res.json({ success: true, message: 'User updated', data: sanitize(user) });
}

async function remove(req, res) {
  const id = Number(req.params.id);
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { role: true },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (req.user && req.user.id === id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own user account',
    });
  }

  if (req.user && req.user.role !== 'Super Admin' && ELEVATED_ROLES.includes(existing.role.name)) {
    return res.status(403).json({
      success: false,
      message: 'Only Super Admin can delete Admin users',
    });
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  res.json({ success: true, message: 'User deleted' });
}

async function ensureRoles() {
  await Promise.all(
    ALLOWED_ROLES.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
}

async function findRole(roleName) {
  if (!ALLOWED_ROLES.includes(roleName)) {
    const err = new Error('Invalid role');
    err.status = 400;
    throw err;
  }

  return prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });
}

function canAssignRole(currentUser, roleName) {
  if (!ALLOWED_ROLES.includes(roleName)) return false;
  if (ELEVATED_ROLES.includes(roleName)) {
    return currentUser && currentUser.role === 'Super Admin';
  }
  return currentUser && ['Super Admin', 'Admin'].includes(currentUser.role);
}

module.exports = { list, roles, create, update, remove };
