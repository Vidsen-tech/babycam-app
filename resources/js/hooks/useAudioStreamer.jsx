// resources/js/hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from "react";

export function useAudioStreamer(wsUrl) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError]             = useState(null);

    const ws           = useRef(null);
    const ctx          = useRef(null);
    const queue        = useRef([]);
    const nextTime     = useRef(0);
    const serverRate   = useRef(48000);
    const infoOK       = useRef(false);

    /* ---------- helpers ---------- */

    const ensureCtx = async () => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctx.current ??= new AudioCtx({ latencyHint: "interactive" });

        /* Tell iOS that this is media playback (iOS 16.4+) */
        if ("audioSession" in navigator) {
            try { navigator.audioSession.type = "playback"; } catch { /* ignore */ }
        }

        if (ctx.current.state === "suspended") {
            try { await ctx.current.resume(); } catch { /* ignore */ }
        }
    };

    const fill = (buf, data) =>
        buf.copyToChannel ? buf.copyToChannel(data, 0)
            : buf.getChannelData(0).set(data); // old Safari

    const resample = (int16) => {
        const ratio  = serverRate.current / ctx.current.sampleRate;
        const outLen = Math.round(int16.length / ratio);
        const out    = new Float32Array(outLen);
        for (let i = 0; i < outLen; i++) out[i] = int16[Math.floor(i * ratio)] / 32768;
        return out;
    };

    const pump = useCallback(async () => {
        if (!queue.current.length) return;
        await ensureCtx();                       // make sure ctx is running

        const data   = queue.current.shift();
        const buffer = ctx.current.createBuffer(1, data.length, ctx.current.sampleRate);
        fill(buffer, data);

        if (nextTime.current < ctx.current.currentTime)
            nextTime.current = ctx.current.currentTime;

        const src = ctx.current.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.current.destination);
        src.start(nextTime.current);

        nextTime.current += buffer.duration;

        if (queue.current.length) {
            const ahead = Math.max(buffer.duration * 500, 10);
            setTimeout(pump, buffer.duration * 1000 - ahead);
        }
    }, []);

    /* ---------- public API ---------- */

    const stopStreaming = useCallback(() => {
        ws.current?.close();   ws.current = null;
        ctx.current?.close();  ctx.current = null;

        queue.current.length = 0;
        nextTime.current     = 0;
        infoOK.current       = false;
        setIsStreaming(false);
    }, []);

    const startStreaming = useCallback(() => {
        if (!wsUrl || isStreaming) return;

        ws.current = new WebSocket(wsUrl);
        ws.current.binaryType = "arraybuffer";

        ws.current.onopen = async () => {
            await ensureCtx();
            nextTime.current = 0;
            setIsStreaming(true);
        };

        ws.current.onmessage = async (evt) => {
            /* handshake */
            if (!infoOK.current && typeof evt.data === "string") {
                try {
                    const info = JSON.parse(evt.data);
                    if (info?.type === "audio_info") {
                        serverRate.current = info.sampleRate;
                        infoOK.current     = true;
                    }
                } catch {/* ignore */}
                return;
            }

            if (!(evt.data instanceof ArrayBuffer) || !infoOK.current) return;

            const int16   = new Int16Array(evt.data);
            const samples = (serverRate.current === ctx.current?.sampleRate)
                ? Float32Array.from(int16, s => s / 32768)
                : resample(int16);

            queue.current.push(samples);
            if (queue.current.length === 1) pump();
        };

        ws.current.onerror = (e) => {
            console.error("WS error:", e);
            setError("WebSocket greška — pogledaj konzolu.");
            stopStreaming();
        };

        ws.current.onclose = stopStreaming;
    }, [wsUrl, isStreaming, pump, stopStreaming]);

    useEffect(() => stopStreaming, [stopStreaming]);

    return { isAudioStreaming: isStreaming, error, startStreaming, stopStreaming };
}
