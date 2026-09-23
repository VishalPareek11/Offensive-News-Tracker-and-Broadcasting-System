import { io } from "socket.io-client";

const socket = io("", {
  transports: ["polling", "websocket"], // ← polling FIRST, then upgrade to websocket
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 3000,
  timeout: 20000,
  upgrade: true, // ← try to upgrade to websocket after polling connects
});

socket.on("connect", () => {
  console.log("✅ Connected via:", socket.io.engine.transport.name);
});

socket.on("connect_error", (err) => {
  console.warn("⚠️ Retrying...", err.message);
});

socket.on("disconnect", (reason) => {
  console.warn("Disconnected:", reason);
  if (reason === "io server disconnect") socket.connect();
});

export default socket;