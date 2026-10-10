import "./config/env.js";
import http from "http";
import { Server, Socket } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const HOST = process.env.HOST || "0.0.0.0";

const httpServer = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.includes("vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  },
});

app.set("io", io);
(global as any).io = io;

// Broadcast cache to prevent duplicate storms across sockets
const recentBroadcasts = new Map<string, number>();
function isDuplicateBroadcast(key: string, ttlMs = 2000): boolean {
  const now = Date.now();
  const last = recentBroadcasts.get(key);
  if (last && now - last < ttlMs) return true;
  recentBroadcasts.set(key, now);
  if (recentBroadcasts.size > 200) {
    for (const [k, t] of recentBroadcasts.entries()) {
      if (now - t > 10000) recentBroadcasts.delete(k);
    }
  }
  return false;
}

io.on("connection", (socket: Socket) => {
  const handleOrderCreated = (order: any) => {
    if (!order) return;
    const orderId = order.id || order.orderNumber;
    if (orderId && isDuplicateBroadcast(`create-${orderId}`)) return;

    socket.broadcast.emit("order:created", order);
    socket.broadcast.emit("order:new", order);
    socket.broadcast.emit("orders:updated", order);
    socket.broadcast.emit("dashboard:update", order);
    socket.broadcast.emit("reports:updated", order);
  };

  socket.on("order:new", handleOrderCreated);
  socket.on("order:create", handleOrderCreated);
  socket.on("order:created", handleOrderCreated);

  const handleOrderUpdated = (order: any) => {
    if (!order) return;
    const orderId = order.id || order.orderNumber;
    const status = order.status || "";
    if (orderId && isDuplicateBroadcast(`update-${orderId}-${status}`)) return;

    socket.broadcast.emit("order:updated", order);
    socket.broadcast.emit("orders:updated", order);
    socket.broadcast.emit("dashboard:update", order);
    socket.broadcast.emit("reports:updated", order);
  };

  socket.on("order:update", handleOrderUpdated);
  socket.on("order:updated", handleOrderUpdated);

  const handleOrderDeleted = (data: any) => {
    if (!data) return;
    const targetId = typeof data === "object" ? data.id || data.orderId : data;
    if (targetId && isDuplicateBroadcast(`delete-${targetId}`)) return;

    socket.broadcast.emit("order:deleted", data);
    socket.broadcast.emit("orders:updated", data);
    socket.broadcast.emit("dashboard:update", data);
    socket.broadcast.emit("reports:updated", data);
  };

  socket.on("order:delete", handleOrderDeleted);
  socket.on("order:deleted", handleOrderDeleted);
  socket.on("order:removed", handleOrderDeleted);

  socket.on("user:created", (user: unknown) => {
    io.emit("user:created", user);
  });

  socket.on("user:updated", (user: unknown) => {
    io.emit("user:updated", user);
  });

  socket.on("user:deleted", (data: unknown) => {
    io.emit("user:deleted", data);
  });

  socket.on("table:created", (table: unknown) => {
    io.emit("table:created", table);
  });

  socket.on("table:updated", (table: unknown) => {
    io.emit("table:updated", table);
  });

  socket.on("group:created", (data: unknown) => {
    io.emit("group:created", data);
    io.emit("group:updated", data);
  });

  socket.on("group:updated", (data: unknown) => {
    io.emit("group:updated", data);
  });

  socket.on("group:deleted", (data: unknown) => {
    io.emit("group:deleted", data);
    io.emit("group:updated", data);
  });

  socket.on("settings:updated", (data: unknown) => {
    io.emit("settings:updated", data);
  });
});

import bcrypt from "bcrypt";
import { prisma } from "./config/prisma.js";

async function autoSeedIfEmpty() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log("🌱 Auto-seeding database...");
      const standardPermissions = [
        { code: "pos.order.create", name: "Create Order", description: "Allows creating new orders in POS" },
        { code: "pos.payment.process", name: "Process Payment", description: "Allows processing payments for orders" },
        { code: "pos.invoice.void", name: "Void Invoice", description: "Allows voiding invoices or completed orders" },
        { code: "pos.discount.apply", name: "Apply Discount", description: "Allows applying discounts to orders" },
        { code: "pos.reports.view", name: "View Reports", description: "Allows viewing sales and analytics reports" },
        { code: "pos.menu.manage", name: "Manage Menu Catalog", description: "Allows managing products and categories" },
        { code: "pos.settings.manage", name: "Manage System Settings", description: "Allows updating system settings" },
        { code: "pos.users.manage", name: "Manage Staff & Groups", description: "Allows managing staff accounts and access groups" },
      ];
      for (const perm of standardPermissions) {
        await prisma.permission.upsert({
          where: { code: perm.code },
          update: { name: perm.name, description: perm.description },
          create: perm,
        });
      }

      const adminGroup = await prisma.group.upsert({
        where: { name: "Admin" },
        update: {},
        create: { id: 1, name: "Admin", description: "Full system administration & configuration access (Super Admin)" },
      });

      const cashierGroup = await prisma.group.upsert({
        where: { name: "Cashier" },
        update: {},
        create: { id: 4, name: "Cashier", description: "Front-of-house cashier operations team" },
      });

      const hashedPassword = await bcrypt.hash("password123", 10);
      const superAdmin = await prisma.user.upsert({
        where: { email: "cheychon258@gmail.com" },
        update: { name: "Super Admin", password: hashedPassword, isActive: true, pin: "1234" },
        create: { name: "Super Admin", email: "cheychon258@gmail.com", password: hashedPassword, isActive: true, pin: "1234" },
      });

      const cashierUser = await prisma.user.upsert({
        where: { email: "cashier@pos.local" },
        update: { name: "Cashier User", password: hashedPassword, isActive: true, pin: "1234" },
        create: { name: "Cashier User", email: "cashier@pos.local", password: hashedPassword, isActive: true, pin: "1234" },
      });

      await prisma.userGroup.upsert({
        where: { userId_groupId: { userId: superAdmin.id, groupId: adminGroup.id } },
        update: {},
        create: { userId: superAdmin.id, groupId: adminGroup.id },
      });

      await prisma.userGroup.upsert({
        where: { userId_groupId: { userId: cashierUser.id, groupId: cashierGroup.id } },
        update: {},
        create: { userId: cashierUser.id, groupId: cashierGroup.id },
      });

      console.log("🌱 Auto-seeding completed successfully!");
    }
  } catch (err) {
    console.error("Auto-seed error:", err);
  }
}

httpServer.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 API + WebSockets running on http://${HOST}:${PORT}`);
  autoSeedIfEmpty();
});

export default httpServer;
