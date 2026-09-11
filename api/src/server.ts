import "./config/env.js";
import http from "http";
import { Server, Socket } from "socket.io";
import app from "./app.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const HOST = process.env.HOST || "0.0.0.0";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

app.set("io", io);
(global as any).io = io;

io.on("connection", (socket: Socket) => {
  socket.on("order:new", (order: unknown) => {
    io.emit("order:created", order);
    io.emit("order:new", order);
    io.emit("orders:updated", order);
    io.emit("dashboard:update", order);
    io.emit("reports:updated", order);
  });

  socket.on("order:create", (order: unknown) => {
    io.emit("order:created", order);
    io.emit("order:new", order);
    io.emit("orders:updated", order);
    io.emit("dashboard:update", order);
    io.emit("reports:updated", order);
  });

  socket.on("order:created", (order: unknown) => {
    io.emit("order:created", order);
    io.emit("order:new", order);
    io.emit("orders:updated", order);
    io.emit("dashboard:update", order);
    io.emit("reports:updated", order);
  });

  socket.on("order:update", (order: unknown) => {
    io.emit("order:updated", order);
    io.emit("orders:updated", order);
    io.emit("dashboard:update", order);
    io.emit("reports:updated", order);
  });

  socket.on("order:updated", (order: unknown) => {
    io.emit("order:updated", order);
    io.emit("orders:updated", order);
    io.emit("dashboard:update", order);
    io.emit("reports:updated", order);
  });

  socket.on("order:deleted", (data: unknown) => {
    io.emit("order:deleted", data);
    io.emit("orders:updated", data);
    io.emit("dashboard:update", data);
    io.emit("reports:updated", data);
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

httpServer.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 API + WebSockets running on http://${HOST}:${PORT}`);
});

export default httpServer;
