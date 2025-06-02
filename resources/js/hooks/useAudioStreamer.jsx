// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [isMutedHook, setIsMutedHook] = useState(false);
    const [volumeHook, setVolumeHook] = useState(50);

    const ws = useRef(null);
    const audioContext = useRef(null);
    const gainNodeRef = useRef(null);
    const audioQueue = useRef([]);
    const audioInfo = useRef(null);

    const nextPlayTime = useRef(0); // Za precizno zakazivanje
    const schedulerTimeoutId = useRef(null);
    // Koliko sekundi zvuka želimo imati u bufferu prije početka reprodukcije
    // Počni s malo više da izbjegneš početnu statiku, npr. 0.2s - 0.3s
    const MIN_QUEUE_DURATION_SEC_TO_START = 0.25;
    // Koliko ranije da zakažemo sljedeći blok (da smanjimo šansu za tišinu)
    const LOOKAHEAD_TIME_SEC = 0.05;

    const ensureAudioNodes = useCallback(() => {
        if (!audioInfo.current) { setError("Audio info nije primljen."); return false; }
        if (!audioContext.current || audioContext.current.state === 'closed') {
            try {
                const targetSampleRate = audioInfo.current.sampleRate || 44100; // Koristi info ili default
                audioContext.current = new AudioContext({ sampleRate: targetSampleRate, latencyHint: "interactive" });
                gainNodeRef.current = audioContext.current.createGain();
                gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
                gainNodeRef.current.connect(audioContext.current.destination);
                console.log(`AudioStreamer: AudioContext kreiran (Rate: ${targetSampleRate}). State: ${audioContext.current.state}.`);
                nextPlayTime.current = 0;
                if (audioContext.current.state === 'suspended') {
                    audioContext.current.resume().catch(e => console.error("AS ERROR resuming new AC:", e));
                }
                return true;
            } catch (e) { console.error("AS ERROR creating AC/GainNode:", e); setError(`Greška AC: ${e.message}`); return false; }
        } else if (audioContext.current.state === 'suspended') {
            audioContext.current.resume().catch(e => console.error("AS ERROR resuming existing AC:", e));
        }
        if (audioContext.current && !gainNodeRef.current) {
            gainNodeRef.current = audioContext.current.createGain();
            gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
            gainNodeRef.current.connect(audioContext.current.destination);
        }
        return true;
    }, [isMutedHook, volumeHook]);

    const scheduleNextChunkProcessing = useCallback(() => {
        if (schedulerTimeoutId.current) clearTimeout(schedulerTimeoutId.current);
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current) {
            return;
        }
        // Koliko čekati prije nego što procesiramo sljedeći?
        // Ciljaj da se pokrene malo prije nextPlayTime.current
        let delayMs = (nextPlayTime.current - audioContext.current.currentTime - LOOKAHEAD_TIME_SEC) * 1000;
        if (delayMs < 0) delayMs = 0; // Ako je vrijeme prošlo, kreni odmah

        // console.log(`AudioStreamer DEBUG: Zakazujem processAudioQueue za ${delayMs.toFixed(0)} ms`);
        schedulerTimeoutId.current = setTimeout(processAudioQueue, delayMs);
    }, []); // Prazan array jer koristi refove

    const processAudioQueue = useCallback(() => {
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current || !audioInfo.current) {
            return;
        }

        // Ako je ovo prvi blok koji se pušta ili je bilo duge pauze
        if (nextPlayTime.current === 0 || nextPlayTime.current < audioContext.current.currentTime) {
            nextPlayTime.current = audioContext.current.currentTime + LOOKAHEAD_TIME_SEC; // Počni s malim odmakom
            console.log(`AudioStreamer: Postavljam nextPlayTime na ${nextPlayTime.current.toFixed(3)}`);
        }

        const pcmFloat32Data = audioQueue.current.shift();
        try {
            const currentChannels = audioInfo.current.channels || 1;
            const audioBuffer = audioContext.current.createBuffer(
                currentChannels,
                pcmFloat32Data.length / currentChannels,
                audioContext.current.sampleRate
            );
            if (currentChannels === 1) audioBuffer.copyToChannel(pcmFloat32Data, 0);
            else { /* ... logika za stereo ... */ }

            const sourceNode = audioContext.current.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(gainNodeRef.current);

            // console.log(`AudioStreamer DEBUG: Puštam buffer u ${nextPlayTime.current.toFixed(3)}. Trajanje: ${audioBuffer.duration.toFixed(3)}s`);
            sourceNode.start(nextPlayTime.current);
            nextPlayTime.current += audioBuffer.duration;

            scheduleNextChunkProcessing(); // Zakaži obradu sljedećeg

        } catch (e) { console.error("AudioStreamer ERROR in processAudioQueue:", e); setError(`Greška obrade: ${e.message}`); }
    }, [scheduleNextChunkProcessing]);


    const stopStreaming = useCallback(() => { /* ... (isti stopStreaming kao prije) ... */
        console.log("AudioStreamer: Pozvan stopStreaming");
        if (schedulerTimeoutId.current) clearTimeout(schedulerTimeoutId.current);
        if (ws.current) { ws.current.onclose = null; ws.current.onerror = null; ws.current.onmessage = null; ws.current.onopen = null; ws.current.close(); ws.current = null; console.log("AudioStreamer: WebSocket zatvoren."); }
        setTimeout(() => { if (audioContext.current && audioContext.current.state !== 'closed') { audioContext.current.close().then(() => { audioContext.current = null; gainNodeRef.current = null; }).catch(e => console.error("AS ERROR closing AC:", e)); } else { audioContext.current = null; gainNodeRef.current = null; } }, 100);
        setIsAudioStreaming(false); setError(null); audioQueue.current = []; audioInfo.current = null; nextPlayTime.current = 0;
    }, []);

    const startStreaming = useCallback(() => {
        if (!webSocketUrl) { setError('WebSocket URL nije zadan.'); return; }
        if (isAudioStreaming || ws.current) { console.log('AudioStreamer: Streaming već aktivan.'); return; }
        setError(null); audioQueue.current = []; audioInfo.current = null; nextPlayTime.current = 0;

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => {
            console.log('AudioStreamer: WebSocket konekcija otvorena.');
            // Ne postavljamo isAudioStreaming dok ne dobijemo info
        };

        ws.current.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                try {
                    const info = JSON.parse(event.data);
                    if (info.type === 'audio_info' && info.codec === 'pcm') {
                        console.log("AudioStreamer: Primljene PCM audio informacije:", info);
                        audioInfo.current = info;
                        if (!ensureAudioNodes()) { stopStreaming(); return; }
                        setIsAudioStreaming(true); // Stream je sada spreman
                        nextPlayTime.current = audioContext.current.currentTime + MIN_QUEUE_DURATION_SEC_TO_START; // Inicijalno kašnjenje za punjenje buffera
                        console.log(`AudioStreamer: Streaming postavljen na true. Prva reprodukcija zakazana za ${nextPlayTime.current.toFixed(3)}`);
                    } else if (info.type === 'audio_info') {
                        console.warn("AudioStreamer: Primljen krivi codec:", info.codec); setError(`Server šalje ${info.codec}, očekujem PCM.`); stopStreaming();
                    }
                } catch (e) { console.error("AudioStreamer: JSON parse error (info):", e); }
            } else if (event.data instanceof ArrayBuffer && audioInfo.current && isAudioStreaming) {
                if (!audioContext.current || audioContext.current.state !== 'running') {
                    if (audioContext.current && audioContext.current.state === 'suspended') {
                        await audioContext.current.resume().catch(e => console.error("Error resuming context", e));
                        if (audioContext.current.state !== 'running') return;
                    } else if (!audioContext.current) return;
                }
                const int16Array = new Int16Array(event.data);
                const float32Array = new Float32Array(int16Array.length);
                for (let i = 0; i < int16Array.length; i++) { float32Array[i] = int16Array[i] / 32768.0; }

                audioQueue.current.push(float32Array);

                // Ako je ovo prvi set podataka nakon što je buffer napunjen, ili ako već svira
                if (audioContext.current.state === 'running' && nextPlayTime.current > 0) {
                    // Ako je processAudioQueue već zakazan preko scheduleNextChunk, ne treba ga zvati direktno
                    // scheduleNextChunk će se pobrinuti da krene ako je red bio prazan
                    if (audioQueue.current.length === 1 && (nextPlayTime.current <= audioContext.current.currentTime + LOOKAHEAD_TIME_SEC)) {
                        // Ako je red bio prazan i vrijeme za reprodukciju je blizu, pokreni odmah
                        console.log("AudioStreamer: Brzo pokretanje processAudioQueue jer je red bio prazan.");
                        processAudioQueue();
                    } else {
                        // Inače, samo zakaži
                        scheduleNextChunkProcessing();
                    }
                } else if (audioContext.current.state === 'running' && audioQueue.current.length > 0) {
                    // Provjera ako je ovo prvi put nakon što je buffer dosegao MIN_QUEUE_DURATION_SEC
                    const currentQueueDuration = (audioQueue.current.reduce((sum, arr) => sum + arr.length, 0) / (audioInfo.current.sampleRate || 44100));
                    if (currentQueueDuration >= MIN_QUEUE_DURATION_SEC_TO_START && nextPlayTime.current === 0) {
                        nextPlayTime.current = audioContext.current.currentTime + 0.05; // Mali odmak za prvi start
                        console.log(`AudioStreamer: Inicijalni buffer pun (${currentQueueDuration.toFixed(3)}s). Počinjem reprodukciju na ${nextPlayTime.current.toFixed(3)}`);
                        processAudioQueue();
                    }
                }
            }
        };
        ws.current.onerror = (event) => { console.error('AudioStreamer: WebSocket greška:', event); setError('WebSocket greška.'); stopStreaming(); };
        ws.current.onclose = (event) => { console.log(`AudioStreamer: WebSocket konekcija zatvorena. Code: ${event.code}`); if(ws.current) { setError(`WS zatvoren (code: ${event.code})`); stopStreaming(); }};
    }, [webSocketUrl, isAudioStreaming, stopStreaming, ensureAudioNodes, processAudioQueue, scheduleNextChunkProcessing]); // Dodane ovisnosti

    useEffect(() => { return () => { stopStreaming(); }; }, [stopStreaming]);

    // Funkcije za mute i volume ostaju iste
    const toggleMuteHook = useCallback(() => { /* ...isti kod... */ setIsMutedHook(prev => { const Muted = !prev; if(gainNodeRef.current && audioContext.current?.state === 'running'){ gainNodeRef.current.gain.linearRampToValueAtTime(Muted ? 0 : (volumeHook/100), audioContext.current.currentTime + 0.05); } return Muted; }); }, [volumeHook, isMutedHook]); // Dodao isMutedHook
    const setVolumeLevelHook = useCallback((newVol) => { /* ...isti kod... */ const Clamped = Math.max(0,Math.min(100,newVol)); setVolumeHook(Clamped); if(gainNodeRef.current && !isMutedHook && audioContext.current?.state === 'running'){ gainNodeRef.current.gain.linearRampToValueAtTime(Clamped/100, audioContext.current.currentTime + 0.05); } }, [isMutedHook]); // Maknuo volumeHook

    return { isAudioStreaming, error, startStreaming, stopStreaming, isMuted: isMutedHook, volume: volumeHook, toggleMute: toggleMuteHook, setVolumeLevel: setVolumeLevelHook };
}
