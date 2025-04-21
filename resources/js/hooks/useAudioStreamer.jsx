// resources/js/hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Hook for real‑time 16‑bit‑PCM mono streaming over WebSocket.
 * Works on desktop Chrome/Firefox and iOS/Safari/Chrome‑iOS.
 */
export function useAudioStreamer(wsUrl) {
    /* ---------- state ---------- */
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError]         = useState(null);

    /* ---------- refs (mutable, survive re‑renders) ---------- */
    const ws              = useRef(null);
    const ctx             = useRef(null);            // AudioContext
    const queue           = useRef([]);              // Float32Array[]
    const nextPlayTime    = useRef(0);               // absolute (ctx.currentTime)
    const serverRate      = useRef(48000);           // will be overwritten by handshake
    const infoReceived    = useRef(false);

    /* ---------- helpers ---------- */

    /** iOS Web‑Audio unlock */
    const createCtx = () => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const c = new AudioCtx({ latencyHint: "interactive" });
        // iOS: the synchronous user‑gesture has not finished yet,
        // so resume() MUST be synchronous, no await here!
        if (c.state === "suspended") c.resume();
        return c;
    };

    /** copy samples into an AudioBuffer (with Safari fallback) */
    const fillBuffer = (buffer, data) => {
        if (buffer.copyToChannel) {
            buffer.copyToChannel(data, 0);
        } else {
            // very old iOS
            buffer.getChannelData(0).set(data);
        }
    };

    /** Naïve linear resampler (only when serverRate !== ctx.sampleRate) */
    const resample = (int16) => {
        const ratio     = serverRate.current / ctx.current.sampleRate;
        const newLen    = Math.round(int16.length / ratio);
        const out       = new Float32Array(newLen);
        for (let i = 0; i < newLen; i++) {
            out[i] = int16[Math.floor(i * ratio)] / 32768;
        }
        return out;
    };

    /** Schedules one buffer and queues the next */
    const pump = useCallback(() => {
        if (!queue.current.length || !ctx.current || ctx.current.state !== "running") return;

        const data      = queue.current.shift();
        const buffer    = ctx.current.createBuffer(1, data.length, ctx.current.sampleRate);
        fillBuffer(buffer, data);

        if (nextPlayTime.current < ctx.current.currentTime)
            nextPlayTime.current = ctx.current.currentTime;

        const src = ctx.current.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.current.destination);
        src.start(nextPlayTime.current);

        nextPlayTime.current += buffer.duration;

        // schedule next pump a bit before this buffer ends
        if (queue.current.length) {
            const ahead = Math.max(buffer.duration * 500, 10);      // ms
            setTimeout(pump, buffer.duration * 1000 - ahead);
        }
    }, []);

    /* ---------- public API ---------- */

    const stop = useCallback(() => {
        ws.current?.close();
        ws.current  = null;
        ctx.current?.close();
        ctx.current = null;
        queue.current.length  = 0;
        nextPlayTime.current  = 0;
        infoReceived.current  = false;
        setIsStreaming(false);
    }, []);

    const start = useCallback(() => {
        if (!wsUrl || isStreaming) return;

        /* 1. WebSocket ------------------------------------------------------- */
        ws.current = new WebSocket(wsUrl);
        ws.current.binaryType = "arraybuffer";

        /* 2. AudioContext (created strictly inside the *same* click/tap) ---- */
        ctx.current = createCtx();
        nextPlayTime.current = 0;

        /* 3. WebSocket event handlers -------------------------------------- */
        ws.current.onopen = () => setIsStreaming(true);

        ws.current.onmessage = (evt) => {
            /* first message is JSON with audio info --------------------------- */
            if (!infoReceived.current && typeof evt.data === "string") {
                try {
                    const info = JSON.parse(evt.data);
                    if (info.type === "audio_info") {
                        serverRate.current   = info.sampleRate;
                        infoReceived.current = true;
                    }
                } catch { /* ignore */ }
                return;
            }

            /* afterwards we expect raw PCM ArrayBuffers ----------------------- */
            if (!(evt.data instanceof ArrayBuffer) || !infoReceived.current) return;

            const int16 = new Int16Array(evt.data);
            const float32 =
                serverRate.current === ctx.current.sampleRate
                    ? Float32Array.from(int16, (s) => s / 32768)
                    : resample(int16);

            queue.current.push(float32);
            if (queue.current.length === 1) pump();  // kick off pumping loop
        };

        ws.current.onerror = (e) => {
            console.error("WS error:", e);
            setError("WebSocket greška — pogledaj konzolu.");
            stop();
        };

        ws.current.onclose  = stop;
    }, [wsUrl, isStreaming, pump, stop]);

    /* ---------- cleanup when component unmounts ---------- */
    useEffect(() => stop, [stop]);

    return { isAudioStreaming: isStreaming, error, startStreaming: start, stopStreaming: stop };
}
