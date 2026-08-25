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

  socket.on("table:deleted", (data: unknown) => {
    io.emit("table:deleted", data);
  });
});

httpServer.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 API + WebSockets running on http://${HOST}:${PORT}`);
});

export default httpServer;
