// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);

    const ws = useRef(null);
    const audioContext = useRef(null);
    const audioQueue = useRef([]);
    const nextPlayTime = useRef(0);
    const sampleRate = useRef(16000); // Default, ažurirat će se
    const audioInfoReceived = useRef(false);

    const processAudioQueue = useCallback(() => {
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running') {
            return;
        }
        const currentTime = audioContext.current.currentTime;
        if (nextPlayTime.current < currentTime) {
            // console.log("AudioStreamer: Resetting nextPlayTime");
            nextPlayTime.current = currentTime;
        }

        const audioData = audioQueue.current.shift();
        const audioBuffer = audioContext.current.createBuffer(1, audioData.length, sampleRate.current);
        audioBuffer.copyToChannel(audioData, 0);

        const sourceNode = audioContext.current.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContext.current.destination);

        // console.log(`AudioStreamer: Scheduling play at: ${nextPlayTime.current.toFixed(3)} (duration: ${audioBuffer.duration.toFixed(3)})`);
        sourceNode.start(nextPlayTime.current);
        nextPlayTime.current += audioBuffer.duration;

        if (audioQueue.current.length > 0) {
            // Dinamičko čekanje bazirano na trajanju buffera i latenciji konteksta
            const bufferDurationMillis = audioBuffer.duration * 1000;
            // Zakaži malo prije kraja, ali ne prerano
            const checkAheadMillis = Math.min(bufferDurationMillis / 2, 100);
            setTimeout(processAudioQueue, Math.max(10, bufferDurationMillis - checkAheadMillis));
        }
    }, []); // useCallback s praznim dependency arrayom jer ne ovisi o vanjskim props/state

    const stopStreaming = useCallback(() => {
        if (ws.current) {
            console.log("AudioStreamer: Closing WebSocket connection...");
            ws.current.onclose = null; // Ukloni handler da izbjegnemo rekurziju/duplo zatvaranje
            ws.current.close();
            ws.current = null;
        }
        if (audioContext.current && audioContext.current.state !== 'closed') {
            console.log("AudioStreamer: Closing AudioContext...");
            audioContext.current.close().then(() => console.log("AudioStreamer: AudioContext closed."));
            audioContext.current = null;
        }
        setIsAudioStreaming(false);
        setError(null);
        audioQueue.current = [];
        nextPlayTime.current = 0;
        audioInfoReceived.current = false;
    }, []); // useCallback osigurava da se funkcija ne rekreira nepotrebno

    const startStreaming = useCallback(() => {
        if (!webSocketUrl) {
            console.error('AudioStreamer: WebSocket URL nije zadan.');
            setError('WebSocket URL nije zadan.');
            return;
        }

        if (ws.current || isAudioStreaming) {
            console.log('AudioStreamer: Streaming već aktivan ili u procesu.');
            return;
        }

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        setError(null); // Resetiraj greške
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        if (!audioContext.current || audioContext.current.state === 'closed') {
            audioContext.current = new AudioContext();
            nextPlayTime.current = 0;
            audioQueue.current = [];
            audioInfoReceived.current = false;
            console.log("AudioStreamer: AudioContext kreiran/resetiran.");
        } else if (audioContext.current.state === 'suspended') {
            audioContext.current.resume().then(() => console.log("AudioStreamer: AudioContext nastavljen."));
        }

        ws.current.onopen = () => {
            console.log('AudioStreamer: WebSocket konekcija otvorena.');
            setIsAudioStreaming(true);
        };

        ws.current.onmessage = (event) => {
            if (!audioContext.current || audioContext.current.state === 'closed') return;

            if (!audioInfoReceived.current && typeof event.data === 'string') {
                try {
                    const info = JSON.parse(event.data);
                    if (info.type === 'audio_info') {
                        console.log("AudioStreamer: Primljene audio informacije:", info);
                        sampleRate.current = info.sampleRate;
                        audioInfoReceived.current = true;
                        return;
                    }
                } catch (e) {
                    console.error("AudioStreamer: Nije uspjelo parsiranje JSON info poruke:", e);
                }
            }

            if (event.data instanceof ArrayBuffer && audioInfoReceived.current) {
                const int16Array = new Int16Array(event.data);
                const float32Array = new Float32Array(int16Array.length);
                for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0;
                }
                audioQueue.current.push(float32Array);
                if (audioQueue.current.length === 1 && audioContext.current.state === 'running') {
                    processAudioQueue();
                }
            }
        };

        ws.current.onerror = (event) => {
            console.error('AudioStreamer: WebSocket greška:', event);
            setError('WebSocket greška. Provjerite konzolu.');
            stopStreaming(); // Pozovi cleanup kod greške
        };

        ws.current.onclose = (event) => {
            console.log('AudioStreamer: WebSocket konekcija zatvorena.', event.code, event.reason);
            // Resetiraj stanje samo ako nije već resetirano kroz stopStreaming
            if(isAudioStreaming){
                setIsAudioStreaming(false);
                setError(`WebSocket konekcija zatvorena (code: ${event.code})`);
                // Ne treba zatvarati ws.current ili audioContext ovdje jer je stopStreaming() glavni za cleanup
                ws.current = null; // Osiguraj da je ref čist
                if (audioContext.current && audioContext.current.state !== 'closed') {
                    // Možda ne želimo zatvoriti context odmah? Ovisi o UX.
                    // audioContext.current.close().then(() => console.log("AudioContext zatvoren zbog WS close."));
                }
            }
        };
    }, [webSocketUrl, isAudioStreaming, stopStreaming, processAudioQueue]); // Dependency array za useCallback

    // Cleanup Effect
    useEffect(() => {
        // Vrati funkciju koja će se izvršiti prilikom unmounta komponente koja KORISTI hook
        return () => {
            stopStreaming();
        };
    }, [stopStreaming]); // Ovisi o stabilnoj stopStreaming funkciji

    // Vrati stanje i funkcije koje komponenta može koristiti
    return { isAudioStreaming, error, startStreaming, stopStreaming };
}
