// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { OpusDecoder } from 'opus-decoder'; // VAŽAN IMPORT

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [isMuted, setIsMutedInternal] = useState(false);
    const [volume, setVolumeInternal] = useState(50);

    const ws = useRef(null);
    const audioContext = useRef(null);
    const gainNodeRef = useRef(null);
    const opusDecoder = useRef(null); // Opus dekoder
    const audioQueue = useRef([]);
    const audioInfo = useRef(null); // Sprema info sa servera {codec, sampleRate, channels}

    const ensureAudioNodes = useCallback(() => {
        if (!audioInfo.current) {
            console.error("AudioStreamer: Audio info nije primljen, ne mogu inicijalizirati AudioContext.");
            setError("Audio info nije primljen sa servera.");
            return false;
        }
        if (!audioContext.current || audioContext.current.state === 'closed') {
            try {
                const targetSampleRate = audioInfo.current.sampleRate || 48000; // Koristi rate iz info ili default
                audioContext.current = new AudioContext({ sampleRate: targetSampleRate });
                gainNodeRef.current = audioContext.current.createGain();
                gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
                gainNodeRef.current.connect(audioContext.current.destination);
                console.log(`AudioStreamer: AudioContext kreiran (Rate: ${audioContext.current.sampleRate}). State: ${audioContext.current.state}.`);
                if (audioContext.current.state === 'suspended') {
                    audioContext.current.resume().catch(e => console.error("AudioStreamer ERROR resuming AudioContext:", e));
                }
                return true;
            } catch (e) { console.error("AudioStreamer ERROR creating AudioContext/GainNode:", e); setError(`Nije moguće kreirati AudioContext: ${e.message}`); return false; }
        } else if (audioContext.current.state === 'suspended') {
            audioContext.current.resume().catch(e => console.error("AudioStreamer ERROR resuming existing AudioContext:", e));
        }
        // Osiguraj da gainNode postoji ako context već postoji
        if (audioContext.current && !gainNodeRef.current) {
            gainNodeRef.current = audioContext.current.createGain();
            gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
            gainNodeRef.current.connect(audioContext.current.destination);
        }
        return true;
    }, [isMuted, volume]); // Ovisi o isMuted i volume za inicijalni gain

    const processAudioQueue = useCallback(() => {
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current) {
            return;
        }
        const pcmFloat32Data = audioQueue.current.shift();
        try {
            const audioBuffer = audioContext.current.createBuffer(
                audioInfo.current?.channels || 1, // Koristi channels iz info
                pcmFloat32Data.length / (audioInfo.current?.channels || 1), // Ispravna duljina po kanalu
                audioContext.current.sampleRate
            );
            // Ako je mono, samo kopiraj. Ako je stereo, treba drugačije (opus-decoder daje interleaved)
            if ((audioInfo.current?.channels || 1) === 1) {
                audioBuffer.copyToChannel(pcmFloat32Data, 0);
            } else {
                // Za stereo, opus-decoder daje interleaved Float32Array [L,R,L,R,...]
                // Trebamo ga razdvojiti ili provjeriti podržava li copyToChannel direktno
                // Za sada, pretpostavimo mono za jednostavnost, ili provjeri specifikacije opus-decodera
                // Ako decoder daje odvojene kanale:
                // audioBuffer.copyToChannel(pcmFloat32Data[0], 0); // Left
                // audioBuffer.copyToChannel(pcmFloat32Data[1], 1); // Right
                // Za interleaved:
                const leftChannel = new Float32Array(pcmFloat32Data.length / 2);
                const rightChannel = new Float32Array(pcmFloat32Data.length / 2);
                for (let i = 0, j = 0; i < pcmFloat32Data.length; i += 2, j++) {
                    leftChannel[j] = pcmFloat32Data[i];
                    rightChannel[j] = pcmFloat32Data[i + 1];
                }
                audioBuffer.copyToChannel(leftChannel, 0);
                if (audioBuffer.numberOfChannels > 1) audioBuffer.copyToChannel(rightChannel, 1);
            }

            const sourceNode = audioContext.current.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(gainNodeRef.current);
            sourceNode.start();
            if (audioQueue.current.length > 0) {
                processAudioQueue();
            }
        } catch (e) { console.error("AudioStreamer ERROR in processAudioQueue:", e); setError(`Greška pri obradi zvuka: ${e.message}`); }
    }, []);

    const stopStreaming = useCallback(() => {
        // ... (ista stopStreaming logika kao prije, ali dodaj opusDecoder.current.free()) ...
        if (ws.current) { ws.current.onclose = null; ws.current.onerror = null; ws.current.onmessage = null; ws.current.onopen = null; ws.current.close(); ws.current = null; console.log("AudioStreamer: WebSocket closed."); }
        if (opusDecoder.current) { try { opusDecoder.current.free(); } catch (e) { console.error("Error freeing opusDecoder", e); } opusDecoder.current = null; console.log("AudioStreamer: OpusDecoder oslobođen.");}
        setTimeout(() => { if (audioContext.current && audioContext.current.state !== 'closed') { audioContext.current.close().then(() => { audioContext.current = null; gainNodeRef.current = null; }).catch(e => console.error("AudioStreamer ERROR closing AudioContext:", e)); } else { audioContext.current = null; gainNodeRef.current = null; } }, 100);
        setIsAudioStreaming(false); setError(null); audioQueue.current = []; audioInfoReceived.current = false;
    }, []);

    const startStreaming = useCallback(() => {
        if (!webSocketUrl) { setError('WebSocket URL nije zadan.'); return; }
        if (ws.current || isAudioStreaming) { console.log('AudioStreamer: Streaming već aktivan.'); return; }

        setError(null); audioQueue.current = []; audioInfoReceived.current = false;

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => {
            console.log('AudioStreamer: WebSocket konekcija otvorena.');
            setIsAudioStreaming(true);
        };

        ws.current.onmessage = async (event) => {
            if (typeof event.data === 'string') { // Info poruka
                try {
                    const info = JSON.parse(event.data);
                    if (info.type === 'audio_info' && info.codec === 'opus') {
                        console.log("AudioStreamer: Primljene Opus audio informacije:", info);
                        audioInfo.current = info;
                        if (!ensureAudioNodes()) return; // Inicijaliziraj context NAKON što dobiješ info

                        if (opusDecoder.current) opusDecoder.current.free(); // Oslobodi stari ako postoji
                        opusDecoder.current = new OpusDecoder({
                            channels: info.channels || 1,
                            sampleRate: info.sampleRate || 48000, // Ovo je ULAZNI sample rate za dekoder
                            // Izlazni sample rate dekodera je obično isti kao ulazni
                        });
                        console.log(`AudioStreamer: OpusDecoder inicijaliziran za ${info.sampleRate}Hz, ${info.channels}ch.`);
                        audioInfoReceived.current = true;
                    }
                } catch (e) { console.error("AudioStreamer: JSON parse error (info):", e); }
            } else if (event.data instanceof ArrayBuffer && audioInfoReceived.current && opusDecoder.current) {
                if (!audioContext.current || audioContext.current.state !== 'running') {
                    if (audioContext.current && audioContext.current.state === 'suspended') {
                        await audioContext.current.resume().catch(e => console.error("Error resuming context", e));
                        if (audioContext.current.state !== 'running') return;
                    } else if (!audioContext.current) return;
                }
                try {
                    const { channelData, samplesDecoded, sampleRate: decoderOutputRate } = opusDecoder.current.decodeFrame(new Uint8Array(event.data));
                    // channelData je array Float32Array-eva, jedan po kanalu
                    // Za mono, to je channelData[0]
                    // sampleRate dekodera bi trebao odgovarati audioContext.current.sampleRate
                    if (samplesDecoded > 0) {
                        if (audioContext.current.sampleRate !== decoderOutputRate) {
                            console.warn(`OPUS DECODER OUTPUT RATE (<span class="math-inline">\{decoderOutputRate\}\) NE ODGOVARA AUDIOCONTEXT RATE \(</span>{audioContext.current.sampleRate})! Ovo treba riješiti!`);
                            // Ovdje bi idealno trebao resample ili rekreirati AudioContext. Za sada preskačemo.
                        }
                        audioQueue.current.push(channelData[0]); // Pretpostavljamo mono
                        if (audioQueue.current.length === 1) { processAudioQueue(); }
                    }
                } catch (e) { console.error("AudioStreamer: Opus decode error:", e); }
            }
        };
        ws.current.onerror = (event) => { console.error('AudioStreamer: WebSocket greška:', event); setError('WebSocket greška.'); stopStreaming(); };
        ws.current.onclose = (event) => { console.log(`AudioStreamer: WebSocket konekcija zatvorena. Code: ${event.code}`); if(ws.current) { setError(`WS zatvoren (code: ${event.code})`); stopStreaming(); }};
    }, [webSocketUrl, isAudioStreaming, stopStreaming, processAudioQueue, ensureAudioNodes]); // Dodali isAudioStreaming

    useEffect(() => { return () => { stopStreaming(); }; }, [stopStreaming]);
    // Vraćamo i mute/volume iz hooka
    return { isAudioStreaming, error, startStreaming, stopStreaming, isMuted, volume, toggleMute, setVolumeLevel };
}
