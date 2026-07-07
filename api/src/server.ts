import "./config/env.js";
import http from "http";
import { Server } from "socket.io";
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

io.on("connection", (socket: any) => {
  socket.on("order:new", (order: any) => {
    io.emit("order:created", order);
  });

  socket.on("order:update", (order: any) => {
    io.emit("order:updated", order);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 API + WebSockets running on http://${HOST}:${PORT}`);
});

export default httpServer;
