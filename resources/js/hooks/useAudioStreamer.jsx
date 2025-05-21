// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { OpusDecoder } from 'opus-decoder'; // Provjeri jesi li ovo instalirao: npm install opus-decoder

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [isMutedHook, setIsMutedHook] = useState(false);
    const [volumeHook, setVolumeHook] = useState(50);

    const ws = useRef(null);
    const audioContext = useRef(null);
    const gainNodeRef = useRef(null);
    const opusDecoder = useRef(null);
    const audioQueue = useRef([]);
    const audioInfo = useRef(null); // Sprema {codec, sampleRate, channels}
    const audioInfoReceived = useRef(false); // <<< OVAJ REF JE VJEROJATNO FALIO ILI BIO KRIVO KORIŠTEN

    const ensureAudioNodes = useCallback(() => {
        if (!audioInfo.current) {
            console.error("AudioStreamer: Audio info nije primljen, ne mogu inicijalizirati AudioContext.");
            setError("Audio info nije primljen sa servera.");
            return false;
        }
        if (!audioContext.current || audioContext.current.state === 'closed') {
            try {
                const targetSampleRate = audioInfo.current.sampleRate || 48000;
                audioContext.current = new AudioContext({ sampleRate: targetSampleRate });
                gainNodeRef.current = audioContext.current.createGain();
                gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
                gainNodeRef.current.connect(audioContext.current.destination);
                console.log(`AudioStreamer: AudioContext kreiran (Rate: ${audioContext.current.sampleRate}). State: ${audioContext.current.state}.`);
                if (audioContext.current.state === 'suspended') {
                    audioContext.current.resume().catch(e => console.error("AudioStreamer ERROR resuming new AudioContext:", e));
                }
                return true;
            } catch (e) { console.error("AudioStreamer ERROR creating AudioContext/GainNode:", e); setError(`Nije moguće kreirati AudioContext: ${e.message}`); return false; }
        } else if (audioContext.current.state === 'suspended') {
            audioContext.current.resume().catch(e => console.error("AudioStreamer ERROR resuming existing AudioContext:", e));
        }
        if (audioContext.current && !gainNodeRef.current) {
            gainNodeRef.current = audioContext.current.createGain();
            gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
            gainNodeRef.current.connect(audioContext.current.destination);
        }
        return true;
    }, [isMutedHook, volumeHook]); // Ovdje audioInfo.current ne treba biti dependency jer se koristi samo kod prve inicijalizacije contexta

    const processAudioQueue = useCallback(() => {
        if (audioQueue.current.length === 0 || !audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current || !audioInfo.current) {
            return;
        }
        const pcmFloat32Data = audioQueue.current.shift();
        try {
            const currentChannels = audioInfo.current.channels || 1;
            const audioBuffer = audioContext.current.createBuffer(
                currentChannels,
                pcmFloat32Data.length / currentChannels,
                audioContext.current.sampleRate
            );

            if (currentChannels === 1) {
                audioBuffer.copyToChannel(pcmFloat32Data, 0);
            } else {
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
    }, []); // Prazan dependency array

    const stopStreaming = useCallback(() => {
        console.log("AudioStreamer: Pozvan stopStreaming");
        if (ws.current) { ws.current.onclose = null; ws.current.onerror = null; ws.current.onmessage = null; ws.current.onopen = null; ws.current.close(); ws.current = null; console.log("AudioStreamer: WebSocket zatvoren."); }
        if (opusDecoder.current) { try { opusDecoder.current.free(); } catch (e) {console.error("Error freeing opus decoder", e); } opusDecoder.current = null; console.log("AudioStreamer: OpusDecoder oslobođen.");}
        setTimeout(() => {
            if (audioContext.current && audioContext.current.state !== 'closed') {
                audioContext.current.close().then(() => {
                    console.log("AudioStreamer: AudioContext zatvoren.");
                    audioContext.current = null; gainNodeRef.current = null;
                }).catch(e => console.error("AudioStreamer ERROR closing AudioContext:", e));
            } else {
                audioContext.current = null; gainNodeRef.current = null;
            }
        }, 100);
        setIsAudioStreaming(false); setError(null); audioQueue.current = []; audioInfoReceived.current = false; // Vrati audioInfoReceived na false
    }, []);

    const startStreaming = useCallback(() => {
        if (!webSocketUrl) { setError('WebSocket URL nije zadan.'); return; }
        if (isAudioStreaming || ws.current) { console.log('AudioStreamer: Streaming već aktivan.'); return; }
        setError(null); audioQueue.current = []; audioInfoReceived.current = false; // Resetiraj na početku

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => {
            console.log('AudioStreamer: WebSocket konekcija otvorena.');
            setIsAudioStreaming(true);
        };

        ws.current.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                try {
                    const info = JSON.parse(event.data);
                    if (info.type === 'audio_info' && info.codec === 'opus') {
                        console.log("AudioStreamer: Primljene Opus audio informacije:", info);
                        audioInfo.current = info; // Spremi CIJELI info objekt
                        // Inicijaliziraj AudioContext i OpusDecoder NAKON što dobiješ info
                        if (!ensureAudioNodes()) { // ensureAudioNodes sada koristi audioInfo.current.sampleRate
                            stopStreaming(); // Ako ne uspije inicijalizacija nodeova, prekini
                            return;
                        }
                        if (opusDecoder.current) opusDecoder.current.free();
                        opusDecoder.current = new OpusDecoder({
                            channels: audioInfo.current.channels || 1,
                            sampleRate: audioInfo.current.sampleRate || 48000,
                        });
                        console.log(`AudioStreamer: OpusDecoder inicijaliziran za ulaz ${audioInfo.current.sampleRate || 48000}Hz, ${audioInfo.current.channels || 1}ch.`);
                        audioInfoReceived.current = true; // Postavi da je info primljen
                    }
                } catch (e) { console.error("AudioStreamer: JSON parse error (info):", e); }
            } else if (event.data instanceof ArrayBuffer && audioInfoReceived.current && opusDecoder.current) { // Provjeravaj audioInfoReceived.current
                if (!audioContext.current || audioContext.current.state !== 'running') {
                    if (audioContext.current && audioContext.current.state === 'suspended') {
                        await audioContext.current.resume().catch(e => console.error("Error resuming context", e));
                        if (audioContext.current.state !== 'running') return;
                    } else if (!audioContext.current) return;
                }
                try {
                    const { channelData, samplesDecoded } = opusDecoder.current.decodeFrame(new Uint8Array(event.data));
                    if (samplesDecoded > 0) {
                        audioQueue.current.push(channelData[0]);
                        if (audioQueue.current.length === 1 && audioContext.current.state === 'running') { processAudioQueue(); }
                    }
                } catch (e) { console.error("AudioStreamer: Opus decode error:", e); }
            }
        };
        ws.current.onerror = (event) => { console.error('AudioStreamer: WebSocket greška:', event); setError('WebSocket greška.'); stopStreaming(); };
        ws.current.onclose = (event) => { console.log(`AudioStreamer: WebSocket konekcija zatvorena. Code: ${event.code}, Reason: "${event.reason}"`); if(ws.current) { setError(`WS zatvoren (code: ${event.code})`); stopStreaming(); }};
    }, [webSocketUrl, isAudioStreaming, stopStreaming, processAudioQueue, ensureAudioNodes]);

    useEffect(() => { return () => { stopStreaming(); }; }, [stopStreaming]);

    const toggleMuteHook = useCallback(() => {
        setIsMutedHook(prevMuted => {
            const newMuteState = !prevMuted;
            if (gainNodeRef.current && audioContext.current && audioContext.current.state === 'running') {
                const targetGain = newMuteState ? 0 : (volumeHook / 100);
                gainNodeRef.current.gain.linearRampToValueAtTime(targetGain, audioContext.current.currentTime + 0.05);
            }
            console.log(`AudioStreamer: Mute toggled by hook. New state: ${newMuteState}`);
            return newMuteState;
        });
    }, [volumeHook]);

    const setVolumeLevelHook = useCallback((newVolume) => {
        const newVolClamped = Math.max(0, Math.min(100, newVolume));
        setVolumeHook(newVolClamped);
        if (gainNodeRef.current && !isMutedHook && audioContext.current && audioContext.current.state === 'running') {
            const gainValue = newVolClamped / 100;
            gainNodeRef.current.gain.linearRampToValueAtTime(gainValue, audioContext.current.currentTime + 0.05);
        }
        console.log(`AudioStreamer: Volume set by hook to ${newVolClamped}`);
    }, [isMutedHook]);

    return {
        isAudioStreaming, error, startStreaming, stopStreaming,
        isMuted: isMutedHook, volume: volumeHook,
        toggleMute: toggleMuteHook, setVolumeLevel: setVolumeLevelHook
    };
}
