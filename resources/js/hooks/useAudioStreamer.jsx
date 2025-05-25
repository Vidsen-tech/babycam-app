// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
// MAKNULI SMO import { OpusDecoder } ...

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [isMutedHook, setIsMutedHook] = useState(false);
    const [volumeHook, setVolumeHook] = useState(50);

    const ws = useRef(null);
    const audioContext = useRef(null);
    const gainNodeRef = useRef(null);
    // MAKNULI SMO opusDecoder ref
    const audioQueue = useRef([]);
    const audioInfo = useRef(null); // Sprema {codec, sampleRate, channels, dtype}
    // MAKNULI SMO audioInfoReceived ref, koristit ćemo audioInfo.current za provjeru

    const ensureAudioNodes = useCallback(() => {
        // ... (ova funkcija ostaje uglavnom ista, samo pazi da sampleRate uzima iz audioInfo.current)
        if (!audioInfo.current) { setError("Audio info nije primljen."); return false; }
        if (!audioContext.current || audioContext.current.state === 'closed') {
            try {
                const targetSampleRate = audioInfo.current.sampleRate || 48000;
                audioContext.current = new AudioContext({ sampleRate: targetSampleRate });
                gainNodeRef.current = audioContext.current.createGain();
                gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
                gainNodeRef.current.connect(audioContext.current.destination);
                console.log(`AudioStreamer: AudioContext kreiran (Rate: ${targetSampleRate}). State: ${audioContext.current.state}.`);
                if (audioContext.current.state === 'suspended') { audioContext.current.resume().catch(e=>console.error("Error resuming AC", e));}
                return true;
            } catch (e) { console.error("AudioStreamer ERROR creating AC/GainNode:", e); setError(`Greška AC: ${e.message}`); return false; }
        } else if (audioContext.current.state === 'suspended') {
            audioContext.current.resume().catch(e=>console.error("Error resuming AC", e));
        }
        if (audioContext.current && !gainNodeRef.current) { /* ... kreiraj gainNode ... */ }
        return true;
    }, [isMutedHook, volumeHook]);

    const processAudioQueue = useCallback(() => {
        // ... (ova funkcija ostaje ista, radi s Float32Array) ...
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current || !audioInfo.current) return;
        const pcmFloat32Data = audioQueue.current.shift();
        try {
            const currentChannels = audioInfo.current.channels || 1;
            const audioBuffer = audioContext.current.createBuffer(currentChannels, pcmFloat32Data.length / currentChannels, audioContext.current.sampleRate);
            if (currentChannels === 1) { audioBuffer.copyToChannel(pcmFloat32Data, 0); }
            else { /* ... logika za stereo ako treba ... */ }
            const sourceNode = audioContext.current.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(gainNodeRef.current);
            sourceNode.start();
            if (audioQueue.current.length > 0) { processAudioQueue(); }
        } catch (e) { console.error("AudioStreamer ERROR in processAudioQueue:", e); setError(`Greška obrade: ${e.message}`); }
    }, []);

    const stopStreaming = useCallback(() => {
        // ... (slično kao prije, samo bez opusDecoder.current.free()) ...
        console.log("AudioStreamer: Pozvan stopStreaming");
        if (ws.current) { ws.current.onclose = null; ws.current.onerror = null; ws.current.onmessage = null; ws.current.onopen = null; ws.current.close(); ws.current = null; console.log("AudioStreamer: WebSocket zatvoren."); }
        // MAKNULI opusDecoder.current.free()
        setTimeout(() => { if (audioContext.current && audioContext.current.state !== 'closed') { audioContext.current.close().then(() => { audioContext.current = null; gainNodeRef.current = null; }).catch(e => console.error("AS ERROR closing AC:", e)); } else { audioContext.current = null; gainNodeRef.current = null; } }, 100);
        setIsAudioStreaming(false); setError(null); audioQueue.current = []; audioInfo.current = null; // Resetiraj i audioInfo
    }, []);

    const startStreaming = useCallback(() => {
        // ... (slično kao prije) ...
        if (!webSocketUrl) { setError('WebSocket URL nije zadan.'); return; }
        if (isAudioStreaming || ws.current) { console.log('AudioStreamer: Streaming već aktivan.'); return; }
        setError(null); audioQueue.current = []; audioInfo.current = null; // Resetiraj i audioInfo

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => { console.log('AudioStreamer: WebSocket konekcija otvorena.'); setIsAudioStreaming(true); };

        ws.current.onmessage = async (event) => {
            if (typeof event.data === 'string') { // Info poruka
                try {
                    const info = JSON.parse(event.data);
                    // *** PROMJENA: Provjeri je li codec "pcm" ***
                    if (info.type === 'audio_info' && info.codec === 'pcm') {
                        console.log("AudioStreamer: Primljene PCM audio informacije:", info);
                        audioInfo.current = info;
                        if (!ensureAudioNodes()) { stopStreaming(); return; }
                        // NEMA VIŠE INICIJALIZACIJE OpusDecodera
                    } else if (info.type === 'audio_info') {
                        console.warn("AudioStreamer: Primljen krivi codec:", info.codec);
                        setError(`Server šalje ${info.codec}, očekujem PCM.`);
                        stopStreaming();
                    }
                } catch (e) { console.error("AudioStreamer: JSON parse error (info):", e); }
            } else if (event.data instanceof ArrayBuffer && audioInfo.current) { // Samo provjeri audioInfo.current
                if (!audioContext.current || audioContext.current.state !== 'running') {
                    // ... (logika za resume contexta) ...
                    if (audioContext.current && audioContext.current.state === 'suspended') {
                        await audioContext.current.resume().catch(e => console.error("Error resuming context", e));
                        if (audioContext.current.state !== 'running') return;
                    } else if (!audioContext.current) return;
                }
                // *** PROMJENA: Direktna konverzija Int16 PCM u Float32 ***
                const int16Array = new Int16Array(event.data);
                const float32Array = new Float32Array(int16Array.length);
                for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0; // Normalizacija
                }
                audioQueue.current.push(float32Array);
                if (audioQueue.current.length === 1 && audioContext.current.state === 'running') {
                    processAudioQueue();
                }
            }
        };
        ws.current.onerror = (event) => { console.error('AudioStreamer: WebSocket greška:', event); setError('WebSocket greška.'); stopStreaming(); };
        ws.current.onclose = (event) => { console.log(`AudioStreamer: WebSocket konekcija zatvorena. Code: ${event.code}`); if(ws.current) { setError(`WS zatvoren (code: ${event.code})`); stopStreaming(); }};
    }, [webSocketUrl, isAudioStreaming, stopStreaming, processAudioQueue, ensureAudioNodes]);

    useEffect(() => { return () => { stopStreaming(); }; }, [stopStreaming]);

    // Funkcije za mute i volume ostaju iste, vraćaju se isto
    const toggleMuteHook = useCallback(() => { setIsMutedHook(prev => { const Muted = !prev; if(gainNodeRef.current && audioContext.current?.state === 'running'){ gainNodeRef.current.gain.linearRampToValueAtTime(Muted ? 0 : (volumeHook/100), audioContext.current.currentTime + 0.05); } return Muted; }); }, [volumeHook]);
    const setVolumeLevelHook = useCallback((newVol) => { const Clamped = Math.max(0,Math.min(100,newVol)); setVolumeHook(Clamped); if(gainNodeRef.current && !isMutedHook && audioContext.current?.state === 'running'){ gainNodeRef.current.gain.linearRampToValueAtTime(Clamped/100, audioContext.current.currentTime + 0.05); } }, [isMutedHook]);

    return { isAudioStreaming, error, startStreaming, stopStreaming, isMuted: isMutedHook, volume: volumeHook, toggleMute: toggleMuteHook, setVolumeLevel: setVolumeLevelHook };
}
