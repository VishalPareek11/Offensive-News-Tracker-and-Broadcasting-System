import express from "express";
import cors from "cors";
import { AllProfanity } from "allprofanity";
import { createServer } from "http";
import { Server } from "socket.io";

const app        = express();
const profanity  = new AllProfanity();
const httpServer = createServer(app);

// ── FIXED: added polling fallback + ping settings ─────────────────────────
const io = new Server(httpServer, {
  cors:             { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 5e7,          // 50MB — enough for audio chunks
  transports:       ["polling", "websocket"], // polling first, upgrade to ws
  allowUpgrades:    true,
  pingTimeout:      60000,         // wait 60s before declaring connection dead
  pingInterval:     25000,         // ping every 25s to keep connection alive
});

app.use(cors());
app.use(express.json());

// ── REST ──────────────────────────────────────────────────────────────────
app.post("/check", (req, res) => {
  const { text } = req.body;
  const result = text.split(" ").map((word) => ({
    word,
    isBad: profanity.check(word),
  }));
  res.json({ result });
});

// ── Devices ───────────────────────────────────────────────────────────────
const connectedDevices = new Map();

function broadcastDeviceList() {
  io.emit(
    "device_list",
    Array.from(connectedDevices.entries()).map(([id, info]) => ({ id, ...info }))
  );
}

// ── Socket ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const clientIP =
    socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
  console.log(`[+] Connected: ${socket.id} | IP: ${clientIP}`);

  // Register
  socket.on("register_device", ({ name, role }) => {
    connectedDevices.set(socket.id, { name, ip: clientIP, role });
    broadcastDeviceList();
    console.log(`[~] "${name}" as ${role}`);
  });

  // ── CHECK WORD — instant per-word profanity check ─────────────────────
  socket.on("check_word", ({ word }) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!clean || clean.length < 2) return;

    const isBad = profanity.check(clean);
    if (isBad) {
      console.log(`[!] Bad word: "${clean}"`);
      socket.emit("word_is_bad", { word: clean });
    }
  });

  // ── SPEECH TEXT — full sentence for UI + broadcast ────────────────────
  socket.on("speech_text", ({ text }) => {
    console.log(`[speech] "${text}"`);

    const words  = text.trim().split(/\s+/);
    const result = words.map((word) => ({
      word,
      isBad: profanity.check(word.replace(/[^a-zA-Z]/g, "")),
    }));

    const payload = {
      result,
      hasOffensive: result.some((r) => r.isBad),
      timestamp:    Date.now(),
      from:         connectedDevices.get(socket.id)?.name || "Unknown",
    };

    socket.emit("speech_result", payload);
    socket.broadcast.emit("receive_broadcast", payload);
  });

  // ── AUDIO CHUNK — forward to all receivers as-is ─────────────────────
  socket.on("audio_chunk_raw", (data) => {
    const label = data.isBeep ? "BEEP" : "audio";
    console.log(`[${label}] chunk from ${socket.id}, size: ${data.chunk?.length}`);
    socket.broadcast.emit("audio_chunk_raw", data);
  });

  // ── TEXT broadcast ────────────────────────────────────────────────────
  socket.on("analyze_and_broadcast", ({ text, targetDevices }) => {
    const result = text.split(" ").map((word) => ({
      word,
      isBad: profanity.check(word.replace(/[^a-zA-Z]/g, "")),
    }));

    const payload = {
      result,
      hasOffensive: result.some((r) => r.isBad),
      timestamp:    Date.now(),
      from:         connectedDevices.get(socket.id)?.name || "Unknown",
    };

    // FIXED: removed stray "+n" typo that was here
    socket.emit("receive_text", result);

    if (targetDevices && targetDevices.length > 0) {
      targetDevices.forEach((id) => io.to(id).emit("receive_broadcast", payload));
    } else {
      socket.broadcast.emit("receive_broadcast", payload);
    }
  });

  socket.on("disconnect", () => {
    connectedDevices.delete(socket.id);
    broadcastDeviceList();
    console.log(`[-] Disconnected: ${socket.id}`);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () =>
  console.log(`✅ SignalGuard backend on http://localhost:${PORT}`)
);

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} in use. Run: npx kill-port ${PORT} && npm start`);
    process.exit(1);
  }
});