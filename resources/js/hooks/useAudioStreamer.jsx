// resources/js/Hooks/useAudioStreamer.jsx
import { useState, useRef, useEffect, useCallback } from 'react';

export function useAudioStreamer(webSocketUrl) {
    const [isAudioStreaming, setIsAudioStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [isMutedHook, setIsMutedHook] = useState(false);
    const [volumeHook, setVolumeHook] = useState(50); // Početna glasnoća 50%

    const ws = useRef(null);
    const audioContext = useRef(null);
    const gainNodeRef = useRef(null); // Ref za GainNode
    const audioInfo = useRef(null);   // Sprema {codec, sampleRate, channels, dtype}

    // Funkcija za inicijalizaciju ili nastavak AudioContexta i GainNodea
    const ensureAudioNodes = useCallback(() => {
        if (!audioInfo.current) {
            console.error("AudioStreamer: Audio info nije primljen, ne mogu inicijalizirati AudioContext.");
            setError("Audio info nije primljen sa servera.");
            return false;
        }
        // Kreiraj AudioContext ako ne postoji ili je zatvoren
        if (!audioContext.current || audioContext.current.state === 'closed') {
            try {
                const targetSampleRate = audioInfo.current.sampleRate;
                audioContext.current = new AudioContext({ sampleRate: targetSampleRate, latencyHint: "interactive" });
                gainNodeRef.current = audioContext.current.createGain();
                gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
                gainNodeRef.current.connect(audioContext.current.destination);
                console.log(`AudioStreamer: AudioContext kreiran (Rate: ${targetSampleRate}). State: ${audioContext.current.state}.`);
                // Pokušaj odmah nastaviti ako je suspended (npr. zbog korisničke interakcije)
                if (audioContext.current.state === 'suspended') {
                    audioContext.current.resume().catch(e => console.error("AS ERROR resuming new AC:", e));
                }
                return true; // Uspješno kreirano
            } catch (e) {
                console.error("AS ERROR creating AC/GainNode:", e);
                setError(`Greška pri kreiranju AudioContexta: ${e.message}`);
                return false; // Neuspješno
            }
        } else if (audioContext.current.state === 'suspended') {
            // Ako context postoji ali je suspendiran, pokušaj ga nastaviti
            audioContext.current.resume().catch(e => console.error("AS ERROR resuming existing AC:", e));
        }
        // Ako context postoji i gainNode ne postoji (ne bi se smjelo dogoditi ako je ensureAudioNodes ispravno pozvan)
        if (audioContext.current && !gainNodeRef.current) {
            gainNodeRef.current = audioContext.current.createGain();
            gainNodeRef.current.gain.value = isMutedHook ? 0 : volumeHook / 100;
            gainNodeRef.current.connect(audioContext.current.destination);
            console.log("AudioStreamer: GainNode rekreiran jer je nedostajao.");
        }
        return true; // Context je već bio spreman ili je nastavljen
    }, [isMutedHook, volumeHook]); // Ovisi o mute/volume za inicijalni gain

    // Funkcija koja obrađuje i pušta jedan audio blok (PCM)
    const playPcmChunk = useCallback((pcmFloat32Data) => {
        if (!audioContext.current || audioContext.current.state !== 'running' || !gainNodeRef.current || !audioInfo.current) {
            console.warn("AudioStreamer: Ne mogu reproducirati, AudioContext ili GainNode nisu spremni.");
            return;
        }
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
                // Za stereo (ako ikad budemo imali), opus-decoder daje interleaved, pa treba razdvojiti
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
            sourceNode.connect(gainNodeRef.current); // Spoji na GainNode
            sourceNode.start(); // Pusti ODMAH
            // console.log(`AudioStreamer: Pušten PCM buffer, trajanje: ${audioBuffer.duration.toFixed(3)}s`);
        } catch (e) {
            console.error("AudioStreamer ERROR in playPcmChunk:", e);
            setError(`Greška pri reprodukciji PCM: ${e.message}`);
        }
    }, []); // Nema vanjskih ovisnosti osim globalnih refova


    const stopStreaming = useCallback(() => {
        console.log("AudioStreamer: Pozvan stopStreaming");
        if (ws.current) {
            ws.current.onopen = null; ws.current.onmessage = null; ws.current.onerror = null; ws.current.onclose = null;
            ws.current.close();
            ws.current = null;
            console.log("AudioStreamer: WebSocket zatvoren.");
        }
        // Odgodi zatvaranje AudioContexta da se izbjegnu greške
        setTimeout(() => {
            if (audioContext.current && audioContext.current.state !== 'closed') {
                audioContext.current.close().then(() => {
                    console.log("AudioStreamer: AudioContext zatvoren.");
                    audioContext.current = null;
                    gainNodeRef.current = null;
                }).catch(e => console.error("AS ERROR closing AC:", e));
            } else {
                audioContext.current = null;
                gainNodeRef.current = null;
            }
        }, 100);
        setIsAudioStreaming(false);
        setError(null);
        audioInfo.current = null; // Resetiraj i audioInfo
    }, []);


    const startStreaming = useCallback(() => {
        if (!webSocketUrl) { setError('WebSocket URL nije zadan.'); return; }
        if (isAudioStreaming || ws.current) { console.log('AudioStreamer: Streaming već aktivan ili WS postoji.'); return; }

        setError(null);
        audioInfo.current = null; // Resetiraj audioInfo prije novog spajanja

        console.log(`AudioStreamer: Spajanje na ${webSocketUrl}...`);
        ws.current = new WebSocket(webSocketUrl);
        ws.current.binaryType = 'arraybuffer';

        ws.current.onopen = () => {
            console.log('AudioStreamer: WebSocket konekcija otvorena.');
            // Ne postavljamo isAudioStreaming na true ovdje, nego nakon primanja audio_info
        };

        ws.current.onmessage = async (event) => {
            if (typeof event.data === 'string') { // Info poruka
                try {
                    const info = JSON.parse(event.data);
                    if (info.type === 'audio_info' && info.codec === 'pcm') {
                        console.log("AudioStreamer: Primljene PCM audio informacije:", info);
                        audioInfo.current = info; // Spremi info
                        // Inicijaliziraj AudioContext i GainNode NAKON što dobiješ info
                        if (!ensureAudioNodes()) { // ensureAudioNodes koristi audioInfo.current.sampleRate
                            stopStreaming(); // Ako ne uspije inicijalizacija nodeova, prekini
                            return;
                        }
                        setIsAudioStreaming(true); // Tek SADA postavi da stream radi
                        console.log(`AudioStreamer: Streaming postavljen na true. AudioContext state: ${audioContext.current?.state}`);
                    } else if (info.type === 'audio_info') {
                        console.warn("AudioStreamer: Primljen krivi codec od servera:", info.codec);
                        setError(`Server šalje ${info.codec}, a React očekuje PCM.`);
                        stopStreaming();
                    }
                } catch (e) { console.error("AudioStreamer: JSON parse error (info):", e); stopStreaming(); } // Zatvori stream ako je info neispravan
            } else if (event.data instanceof ArrayBuffer && audioInfo.current && isAudioStreaming) { // Provjeri i isAudioStreaming
                // Provjeri je li AudioContext spreman prije obrade
                if (!audioContext.current || audioContext.current.state !== 'running') {
                    if (audioContext.current && audioContext.current.state === 'suspended') {
                        console.log("AudioStreamer: AudioContext suspended, pokušavam resume u onmessage...");
                        await audioContext.current.resume().catch(e => console.error("Error resuming context in onmessage", e));
                        if (audioContext.current.state !== 'running') {
                            console.warn("AudioStreamer: AudioContext nije 'running' nakon resume. Preskačem audio frame.");
                            return; // Preskoči ovaj frame ako context nije spreman
                        }
                    } else { // Ako context ne postoji ili je zatvoren (ne bi se smjelo dogoditi ako je isAudioStreaming true)
                        console.warn("AudioStreamer: Nema AudioContexta ili nije 'running' u onmessage. Preskačem frame.");
                        return;
                    }
                }
                // Direktna konverzija Int16 PCM u Float32 i reprodukcija
                const int16Array = new Int16Array(event.data);
                const float32Array = new Float32Array(int16Array.length);
                for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768.0; // Normalizacija
                }
                playPcmChunk(float32Array); // Pozovi novu funkciju za reprodukciju
            }
        };

        ws.current.onerror = (event) => { console.error('AudioStreamer: WebSocket greška:', event); setError('WebSocket greška.'); stopStreaming(); };
        ws.current.onclose = (event) => { console.log(`AudioStreamer: WebSocket konekcija zatvorena. Code: ${event.code}, Reason: "${event.reason}"`); if(ws.current) {setError(`WS zatvoren (code: ${event.code})`); stopStreaming();} };
    }, [webSocketUrl, isAudioStreaming, stopStreaming, ensureAudioNodes, playPcmChunk]); // Dodane ovisnosti

    // Cleanup Effect (ostaje isti)
    useEffect(() => {
        return () => {
            stopStreaming();
        };
    }, [stopStreaming]);

    // Funkcije za mute i volume koje hook vraća (ostaju iste)
    const toggleMuteHook = useCallback(() => {
        setIsMutedHook(prevMuted => {
            const newMuteState = !prevMuted;
            if (gainNodeRef.current && audioContext.current && audioContext.current.state === 'running') {
                const targetGain = newMuteState ? 0 : (volumeHook / 100); // Koristi volumeHook
                gainNodeRef.current.gain.linearRampToValueAtTime(targetGain, audioContext.current.currentTime + 0.05);
            }
            console.log(`AudioStreamer: Mute toggled by hook. New state: ${newMuteState}`);
            return newMuteState; // Vrati novo stanje da se može koristiti ako treba
        });
    }, [volumeHook, isMutedHook]); // Dodaj isMutedHook kao ovisnost

    const setVolumeLevelHook = useCallback((newVolume) => {
        const newVolClamped = Math.max(0, Math.min(100, newVolume));
        setVolumeHook(newVolClamped);
        if (gainNodeRef.current && !isMutedHook && audioContext.current && audioContext.current.state === 'running') {
            const gainValue = newVolClamped / 100;
            gainNodeRef.current.gain.linearRampToValueAtTime(gainValue, audioContext.current.currentTime + 0.05);
        }
        console.log(`AudioStreamer: Volume set by hook to ${newVolClamped}`);
    }, [isMutedHook]); // Maknuli volumeHook iz ovisnosti jer se samo čita unutar (isMutedHook je bitan)

    return {
        isAudioStreaming,
        error,
        startStreaming,
        stopStreaming,
        isMuted: isMutedHook,
        volume: volumeHook, // Vraća brojčanu vrijednost (0-100)
        toggleMute: toggleMuteHook,
        setVolumeLevel: setVolumeLevelHook
    };
}
