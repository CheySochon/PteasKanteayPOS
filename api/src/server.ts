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
});

httpServer.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 API + WebSockets running on http://${HOST}:${PORT}`);
});

export default httpServer;
