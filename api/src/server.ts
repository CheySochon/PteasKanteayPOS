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
].filter(Boolean) as string[];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);
(global as any).io = io;

io.on("connection", (socket: Socket) => {
  socket.on("order:new", (order: unknown) => {
    io.emit("order:created", order);
  });

  socket.on("order:update", (order: unknown) => {
    io.emit("order:updated", order);
  });

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
