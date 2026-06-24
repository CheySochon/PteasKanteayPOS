const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change_this_secret') {
    const err = new Error('JWT secret is not configured');
    err.status = 500;
    throw err;
  }

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function ensureRole(roleName) {
  return prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });
}

async function register({ name, email, password }) {
  if (!name || !email || !password) {
    const err = new Error('Name, email, and password are required');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email is already registered');
    err.status = 409;
    throw err;
  }

  const role = await ensureRole('Member');
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      roleId: role.id,
    },
    include: { role: true },
  });

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.findFirst({
    where: { email, isActive: true, deletedAt: null },
    include: { role: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  return {
    token: signToken(user),
    user: sanitizeUser(user),
  };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return sanitizeUser(user);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = { register, login, getMe };
