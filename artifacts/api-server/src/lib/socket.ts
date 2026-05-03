import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import { logger } from "./logger";

let io: SocketIOServer | null = null;

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket.io client connected");

    socket.on("seller:subscribe", (sellerId: string) => {
      socket.join(`seller:${sellerId}`);
      logger.info({ sellerId, socketId: socket.id }, "Seller subscribed to dashboard");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket.io client disconnected");
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function emitSellerDashboardUpdate(sellerId: string, stats: unknown): void {
  if (!io) return;
  io.to(`seller:${sellerId}`).emit("dashboard:stats:update", stats);
}
