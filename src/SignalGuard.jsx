// src/SignalGuard.jsx
import { useEffect, useState, useCallback } from "react";
import socket from "./socket";
import { useBroadcastAudio } from "./hooks/useBroadcastAudio";
import "./SignalGuard.css";

const HIGH_WORDS = ["bastard", "moron", "idiot"];
const MED_WORDS  = ["damn", "crap", "hell", "ass", "bloody"];
const ALL_BAD    = [...HIGH_WORDS, ...MED_WORDS];

const WAVE_HEIGHTS = Array.from({ length: 28 }, () => Math.floor(Math.random() * 44) + 8);

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = "sine";
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// ── user and onLogout props added ─────────────────────────────────────────
export default function SignalGuard({ user, onLogout }) {
  const [activeTab,      setActiveTab]      = useState("speech");
  const [role,           setRole]           = useState("sender");
  const [textInput,      setTextInput]      = useState("");
  const [textResult,     setTextResult]     = useState([]);
  const [showTextResult, setShowTextResult] = useState(false);
  const [feedItems,      setFeedItems]      = useState([]);
  const [stats,          setStats]          = useState({ high: 0, med: 0, beeped: 0, flags: 0 });
  const [scoreData,      setScoreData]      = useState({
    pct: 0, level: "clean", label: "Awaiting input", sub: "No flags detected",
  });
  const [chips,          setChips]          = useState({ lo: 0, med: 0, hi: 0 });
  const [deviceList,     setDeviceList]     = useState([]);
  const [tokens,         setTokens]         = useState([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [imgPreview,     setImgPreview]     = useState(null);
  const [imgTags,        setImgTags]        = useState([]);

  // ── Derive display name from Firebase user ────────────────────────────────
  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Register device — use logged in user name ─────────────────────────────
  useEffect(() => {
    const name =
      user?.displayName ||
      user?.email?.split("@")[0] ||
      localStorage.getItem("sg_device_name") ||
      "Device-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    localStorage.setItem("sg_device_name", name);
    socket.emit("register_device", { name, role });
  }, [role, user]);

  // ── Device list ───────────────────────────────────────────────────────────
  useEffect(() => {
    socket.on("device_list", (list) => setDeviceList(list));
    return () => socket.off("device_list");
  }, []);

  // ── Core token processor ──────────────────────────────────────────────────
  const processTokens = useCallback((incoming, source) => {
    if (!incoming || incoming.length === 0) return;

    console.log("📝 Processing tokens:", incoming, "source:", source);

    setTokens([...incoming]);

    let lo = 0, me = 0, hi = 0, bleeps = 0;
    incoming.forEach(({ word, isBad }) => {
      if (!isBad) return;
      bleeps++;
      const w = word.toLowerCase().replace(/[^a-z]/g, "");
      if (HIGH_WORDS.includes(w))     hi++;
      else if (MED_WORDS.includes(w)) me++;
      else                            lo++;
    });

    if (bleeps > 0) {
      playBeep();
      const pct   = Math.round((bleeps / incoming.length) * 100);
      const level = hi > 0 ? "bad" : me > 0 ? "warn" : "clean";

      setScoreData({
        pct,
        level,
        label: hi > 0 ? "High risk content" : me > 0 ? "Moderate content" : "Low severity",
        sub:   `${bleeps} offensive word${bleeps > 1 ? "s" : ""} detected`,
      });

      setChips((p) => ({ lo: p.lo + lo, med: p.med + me, hi: p.hi + hi }));

      setStats((p) => ({
        high:   p.high + hi,
        med:    p.med + me,
        beeped: p.beeped + bleeps,
        flags:  p.flags + 1,
      }));

      setFeedItems((p) => [
        {
          text:   incoming.map((t) => t.word).join(" "),
          level:  hi > 0 ? "hi" : me > 0 ? "med" : "lo",
          count:  bleeps,
          source,
          time:   nowTime(),
        },
        ...p,
      ]);
    }
  }, []);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const onSpeechResult = (payload) => {
      console.log("🎯 speech_result received:", payload);
      const result = payload.result || payload;
      processTokens(result, "speech");
    };

    const onReceiveBroadcast = (payload) => {
      console.log("📡 receive_broadcast received:", payload);
      processTokens(payload.result, "broadcast · " + (payload.from || "unknown"));
    };

    const onReceiveText = (result) => {
      console.log("📝 receive_text received:", result);
      processTokens(result, "text");
    };

    socket.on("speech_result",     onSpeechResult);
    socket.on("receive_broadcast", onReceiveBroadcast);
    socket.on("receive_text",      onReceiveText);

    return () => {
      socket.off("speech_result",     onSpeechResult);
      socket.off("receive_broadcast", onReceiveBroadcast);
      socket.off("receive_text",      onReceiveText);
    };
  }, [processTokens]);

  // ── Audio hook ────────────────────────────────────────────────────────────
  const { isStreaming, startStreaming, stopStreaming } = useBroadcastAudio({
    onResult:    null,
    onBroadcast: null,
  });

  const toggleStream = async () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      await startStreaming();
    }
  };

  // ── Text analyse ──────────────────────────────────────────────────────────
  const analyzeText = async () => {
    if (!textInput.trim()) return;
    try {
      const res  = await fetch("http://localhost:3001/check", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: textInput }),
      });
      const data = await res.json();
      setTextResult(data.result);
      setShowTextResult(true);
      processTokens(data.result, "text");
      socket.emit("analyze_and_broadcast", { text: textInput, targetDevices: [] });
    } catch (err) {
      console.error("analyzeText error:", err);
    }
  };

  // ── Image ─────────────────────────────────────────────────────────────────
  const handleImage = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgPreview(e.target.result);
      setTimeout(() => {
        setImgTags([
          { label: "nudity",         bad: false },
          { label: "violence",       bad: false },
          { label: "offensive text", bad: true  },
          { label: "profanity",      bad: true  },
        ]);
        processTokens(
          [{ word: "offensive", isBad: true }, { word: "content", isBad: false }],
          "image"
        );
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtSession = () => {
    const m = Math.floor(sessionSeconds / 60).toString().padStart(2, "0");
    const s = (sessionSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isBadWord = (w) =>
    ALL_BAD.includes(w.toLowerCase().replace(/[^a-z]/g, ""));

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="sg-app">

      {/* ── HEADER ── */}
      <header className="sg-header">

        {/* Logo */}
        <div className="sg-logo">
          <div className="sg-logo-icon">⚠</div>
          <div className="sg-logo-text">SIGNAL<span>GUARD</span></div>
        </div>

        {/* Role tabs */}
        <div className="sg-header-center">
          <div className="sg-role-tabs">
            <button
              className={"sg-role-btn" + (role === "sender" ? " active" : "")}
              onClick={() => setRole("sender")}
            >
              📤 Sender
            </button>
            <button
              className={"sg-role-btn" + (role === "receiver" ? " active" : "")}
              onClick={() => setRole("receiver")}
            >
              📥 Receiver
            </button>
          </div>
        </div>

        {/* Right side */}
        <div className="sg-header-right">

          {/* Status */}
          <div className="sg-header-status">
            <span className="sg-status-dot" />
            {isStreaming ? "LIVE" : "IDLE"}&nbsp;|&nbsp;{fmtSession()}
          </div>

          {/* User badge — shows logged in user name */}
          <div className="sg-user-badge">
            <span className="sg-user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="sg-user-name">{displayName}</span>
          </div>

          {/* Stream button */}
          {role === "sender" && (
            <button
              className={"sg-broadcast-btn" + (isStreaming ? " active" : "")}
              onClick={toggleStream}
            >
              <span className="sg-btn-dot" />
              {isStreaming ? "Stop Stream" : "Start Stream"}
            </button>
          )}

          {/* Logout button */}
          <button
            className="sg-logout-btn"
            onClick={onLogout}
            title="Sign out"
          >
            ⎋ Logout
          </button>

        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="sg-main">

        {/* LEFT */}
        <div className="sg-left">

          {role === "receiver" && (
            <div className="sg-receiver-banner">
              📡 Listening for broadcast — offensive words will be beeped automatically
            </div>
          )}

          {role === "sender" && (
            <div className="sg-tabs">
              {["speech", "text", "image"].map((t) => (
                <button
                  key={t}
                  className={"sg-tab" + (activeTab === t ? " active" : "")}
                  onClick={() => setActiveTab(t)}
                >
                  {t === "speech" ? "🎙 Speech" : t === "text" ? "✎ Text" : "📷 Image"}
                </button>
              ))}
            </div>
          )}

          {/* SPEECH PANEL */}
          {(activeTab === "speech" || role === "receiver") && (
            <div className="sg-panel">
              <div className="sg-waveform-wrap">
                <div className="sg-wave-visual">
                  {WAVE_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className={"sg-wave-bar" + (isStreaming ? " active" : "")}
                      style={{
                        animationDelay:    i * 0.04 + "s",
                        animationDuration: (0.3 + (i % 5) * 0.1) + "s",
                        height: isStreaming ? h + "px" : "6px",
                      }}
                    />
                  ))}
                </div>

                {role === "sender" ? (
                  <>
                    <button
                      className={"sg-mic-btn" + (isStreaming ? " recording" : "")}
                      onClick={toggleStream}
                    >
                      {isStreaming ? "⏹" : "🎙"}
                    </button>
                    <div className="sg-mic-status">
                      {isStreaming
                        ? "🔴 Streaming + analysing speech..."
                        : "Click to start streaming"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sg-receiver-icon">📡</div>
                    <div className="sg-mic-status">Receiving audio stream...</div>
                  </>
                )}
              </div>

              <div className="sg-transcript-box">
                {tokens.length === 0 ? (
                  <span className="sg-placeholder">
                    {role === "sender"
                      ? "Speak something — transcript will appear here..."
                      : "Incoming transcript will appear here..."}
                  </span>
                ) : (
                  tokens.map((t, i) =>
                    t.isBad ? (
                      <span key={i}>
                        <span className="sg-bad-word">{t.word}</span>{" "}
                        <span className="sg-replaced">*BEEPED*</span>{" "}
                      </span>
                    ) : (
                      <span key={i}>{t.word} </span>
                    )
                  )
                )}
              </div>
            </div>
          )}

          {/* TEXT PANEL */}
          {activeTab === "text" && role === "sender" && (
            <div className="sg-panel">
              <textarea
                className="sg-text-input"
                placeholder="Paste or type text to analyse..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <button className="sg-analyze-btn" onClick={analyzeText}>
                Analyse + Broadcast →
              </button>
              {showTextResult && (
                <div className="sg-transcript-box">
                  {textResult.map((t, i) =>
                    t.isBad ? (
                      <span key={i}>
                        <span className="sg-bad-word">{t.word}</span>{" "}
                        <span className="sg-replaced">*BEEPED*</span>{" "}
                      </span>
                    ) : (
                      <span key={i}>{t.word} </span>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* IMAGE PANEL */}
          {activeTab === "image" && role === "sender" && (
            <div className="sg-panel">
              {!imgPreview ? (
                <div
                  className="sg-drop-zone"
                  onClick={() => document.getElementById("sg-img-file").click()}
                  onDrop={(e) => { e.preventDefault(); handleImage(e.dataTransfer.files[0]); }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    id="sg-img-file"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImage(e.target.files[0])}
                  />
                  <div className="sg-drop-icon">📷</div>
                  <div className="sg-drop-text">
                    <strong>Drop image here</strong> or click to browse
                  </div>
                  <div className="sg-drop-sub">OCR + offensive content detection</div>
                </div>
              ) : (
                <div className="sg-img-preview">
                  <img src={imgPreview} alt="preview" />
                  <div className="sg-img-overlay">
                    {imgTags.map((tag, i) => (
                      <span key={i} className={"sg-img-tag" + (tag.bad ? " bad" : " ok")}>
                        {tag.bad ? "⚠ " : "✓ "}{tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULT BAR */}
          <div className="sg-result-bar">
            <div className="sg-result-score">
              <div className={"sg-score-ring " + scoreData.level}>
                {scoreData.pct}%
              </div>
              <div>
                <div className="sg-score-label">{scoreData.label}</div>
                <div className="sg-score-sub">{scoreData.sub}</div>
              </div>
            </div>
            <div className="sg-severity-chips">
              <span className="sg-chip low">LOW: {chips.lo}</span>
              <span className="sg-chip med">MED: {chips.med}</span>
              <span className="sg-chip hi">HIGH: {chips.hi}</span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="sg-right">
          <div className="sg-feed-header">
            <div className="sg-feed-title">Detection feed</div>
            <div className="sg-feed-count">
              {stats.flags} {stats.flags === 1 ? "flag" : "flags"}
            </div>
          </div>

          <div className="sg-feed">
            {feedItems.length === 0 ? (
              <div className="sg-feed-empty">
                No detections yet.<br />Start streaming or submit text.
              </div>
            ) : (
              feedItems.map((item, i) => (
                <div key={i} className={"sg-feed-item " + item.level}>
                  <div className="sg-feed-meta">
                    <span className="sg-feed-type">{item.source}</span>
                    <span className="sg-feed-time">{item.time}</span>
                  </div>
                  <div className="sg-feed-text">
                    {item.text.split(" ").map((w, j) =>
                      isBadWord(w) ? (
                        <span key={j} className="sg-bleep">*BLEEP* </span>
                      ) : (
                        <span key={j}>{w} </span>
                      )
                    )}
                  </div>
                  <span className="sg-feed-badge">
                    {item.count} flag{item.count > 1 ? "s" : ""} · {item.level.toUpperCase()} risk
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="sg-stats-row">
            <div className="sg-stat">
              <div className="sg-stat-val red">{stats.high}</div>
              <div className="sg-stat-lbl">HIGH RISK</div>
            </div>
            <div className="sg-stat">
              <div className="sg-stat-val amber">{stats.med}</div>
              <div className="sg-stat-lbl">MODERATE</div>
            </div>
            <div className="sg-stat">
              <div className="sg-stat-val green">{stats.beeped}</div>
              <div className="sg-stat-lbl">BEEPED OUT</div>
            </div>
          </div>

          <div className="sg-broadcast-panel">
            <div className="sg-broadcast-label">
              Connected devices ({deviceList.length})
            </div>
            <div className="sg-device-list">
              {deviceList.length === 0 ? (
                <div className="sg-no-devices">No other devices connected</div>
              ) : (
                deviceList.map((device) => (
                  <div key={device.id} className="sg-device-row">
                    <div className="sg-device-info">
                      <span className="sg-device-icon">
                        {device.role === "receiver" ? "📥" : "📤"}
                      </span>
                      <div>
                        <div className="sg-device-name">{device.name}</div>
                        <div className="sg-device-addr">
                          {device.ip} · {device.role}
                        </div>
                      </div>
                    </div>
                    <div className="sg-device-live" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
