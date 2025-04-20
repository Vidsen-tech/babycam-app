import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef } from 'react'; // Dodali smo useRef
import { useAudioStreamer } from '@/hooks/useAudioStreamer'; // Naš hook

// Shadcn/ui komponente
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Slider } from "@/Components/ui/slider";
import { Label } from "@/Components/ui/label";

// Ikone (dodali Play, StopCircle, Maximize, Minimize)
import { Play, StopCircle, Volume2, VolumeX, VideoOff, Thermometer, Wind, ScanLine, AlertCircle, Maximize, Minimize } from 'lucide-react';

// Animacije
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard({ auth }) {
    // Glavno stanje za praćenje je li nadzor aktivan
    const [isMonitoringActive, setIsMonitoringActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState([50]);
    const [isFullscreen, setIsFullscreen] = useState(false); // Stanje za fullscreen

    // Ref za video kontejner (za fullscreen)
    const videoContainerRef = useRef(null);

    // --- Audio Streamer Hook ---
    const PI_IP_ADDRESS = '192.168.100.61'; // <--- *** PROMIJENI AKO TREBA ***
    const WEBSOCKET_PORT = 8765;
    const wsUrl = `ws://${PI_IP_ADDRESS}:${WEBSOCKET_PORT}`;
    const { isAudioStreaming, error: audioError, startStreaming, stopStreaming } = useAudioStreamer(wsUrl);

    // --- Glavna Funkcija za Pokretanje/Zaustavljanje Nadzora ---
    const handleToggleMonitoring = () => {
        const turningOn = !isMonitoringActive;
        setIsMonitoringActive(turningOn); // Odmah promijeni UI stanje

        if (turningOn) {
            console.log('Starting Monitoring (Audio + Camera Placeholder)...');
            startStreaming(); // Pokreni audio stream
            // Placeholder kamere će se prikazati zbog promjene isMonitoringActive
        } else {
            console.log('Stopping Monitoring (Audio + Camera Placeholder)...');
            stopStreaming(); // Zaustavi audio stream
            // Placeholder kamere će se sakriti zbog promjene isMonitoringActive
            // Opcionalno resetiraj i mute/volume kad se zaustavi
            // setIsMuted(false);
            // setVolume([50]);
        }
    };

    // --- Audio Kontrole (Mute/Volume) ---
    const handleToggleMute = () => {
        if (!isAudioStreaming) return;
        console.log('Toggle Mute clicked');
        setIsMuted(prevState => !prevState);
        // TODO: Povezati s Web Audio API (gain node)
    };

    const handleVolumeChange = (value) => {
        if (!isAudioStreaming || isMuted) return; // Ne mijenjaj ako je mutirano
        console.log('Volume changed:', value[0]);
        setVolume(value);
        // TODO: Povezati s Web Audio API (gain node)
    };

    // --- Fullscreen Funkcija ---
    const handleToggleFullscreen = () => {
        const elem = videoContainerRef.current;
        if (!elem) return;

        if (!document.fullscreenElement && !document.webkitFullscreenElement) { // Provjeri i za Safari
            // Ulazak u fullscreen
            const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen;
            if (requestMethod) {
                requestMethod.call(elem).catch(err => {
                    console.error(`Error attempting fullscreen: ${err.message} (${err.name})`);
                    // Resetiraj stanje ako ne uspije
                    setIsFullscreen(false);
                });
                // Ne postavljaj odmah na true, osloni se na event listener
            }
        } else {
            // Izlazak iz fullscreena
            const exitMethod = document.exitFullscreen || document.webkitExitFullscreen;
            if (exitMethod) {
                exitMethod.call(document);
                // Ne postavljaj odmah na false, osloni se na event listener
            }
        }
    };

    // Effect za praćenje promjena fullscreen stanja (uklj. Esc tipku)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Za Safari

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // --- Detektor Kakice State & Effect ---
    const [poopStatus, setPoopStatus] = useState('Detektor neaktivan');
    const [scanProgress, setScanProgress] = useState(0);

    useEffect(() => {
        let intervalId = null;
        if (isMonitoringActive) { // Koristi isMonitoringActive sada
            setPoopStatus("Skeniranje u tijeku..."); // Resetiraj status kod paljenja
            intervalId = setInterval(() => {
                setScanProgress(prev => {
                    const next = prev + 10;
                    if (next > 100) {
                        setPoopStatus("Nema opasnosti! (Za sada...)");
                        return 0; // Resetiraj progress
                    } else {
                        setPoopStatus("Skeniranje u tijeku...");
                        return next;
                    }
                });
            }, 400); // Malo sporije skeniranje :)
        } else {
            setPoopStatus("Detektor neaktivan");
            setScanProgress(0);
        }
        // Očisti interval kad se stanje promijeni ili komponenta unmounta
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isMonitoringActive]); // Ovisi samo o glavnom stanju nadzora

    const temperature = 22.5;
    const airQuality = 45;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Bartul Monitor v1.1 ✨
                </h2>
            }
        >
            <Head title="Kontrolna Ploča" />

            <div className="py-6 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* Glavna Kartica: Video & Audio */}
                        <Card className="lg:col-span-2 shadow-lg">
                            <CardHeader>
                                <CardTitle>Nadzor Uživo</CardTitle>
                                <CardDescription>Video i audio stream od Bartula.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Video Player Area s ref-om i relative pozicijom za gumb */}
                                <div ref={videoContainerRef} className="relative aspect-video bg-slate-900 dark:bg-black text-white flex items-center justify-center rounded mb-4 overflow-hidden">
                                    {isMonitoringActive ? (
                                        <img
                                            src="/images/bartul.png"
                                            alt="Bartul - Nadzor Aktivan"
                                            className="object-contain h-full w-full"
                                        />
                                    ) : (
                                        <div className="text-center p-4">
                                            <VideoOff className="h-16 w-16 mx-auto text-gray-500 mb-2" />
                                            <p className="text-gray-400">Nadzor je isključen</p>
                                        </div>
                                    )}
                                    {/* TODO: Pravi <video> element */}

                                    {/* Fullscreen gumb (prikazuje se samo ako je nadzor aktivan) */}
                                    {isMonitoringActive && (
                                        <Button
                                            variant="ghost" // Duh gumb, manje napadan
                                            size="icon"
                                            onClick={handleToggleFullscreen}
                                            className="absolute top-2 right-2 text-white bg-black/30 hover:bg-black/60 focus-visible:ring-offset-0 focus-visible:ring-white"
                                            title={isFullscreen ? "Izađi iz Fullscreena" : "Fullscreen"}
                                        >
                                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                                        </Button>
                                    )}
                                </div>

                                {/* Kontrole */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    {/* Glavni Play/Stop Gumb */}
                                    <Button
                                        variant={isMonitoringActive ? "destructive" : "default"}
                                        onClick={handleToggleMonitoring}
                                        size="sm"
                                        disabled={!PI_IP_ADDRESS || PI_IP_ADDRESS === 'YOUR_PI_IP_ADDRESS'}
                                        className={`${isMonitoringActive ? '' : 'bg-green-600 hover:bg-green-700'}`} // Zeleni kad je OFF
                                    >
                                        {isMonitoringActive ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isMonitoringActive ? 'Zaustavi Nadzor' : 'Pokreni Nadzor'}
                                    </Button>

                                    {/* Audio Kontrole (Mute/Volume) - vidljivo samo kad stream radi */}
                                    <AnimatePresence>
                                        {isAudioStreaming && ( // Prikaz ovisi o isAudioStreaming iz hooka
                                            <motion.div
                                                key="audioControls" // Dodaj key za ispravan rad AnimatePresence
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex items-center gap-2 overflow-hidden"
                                            >
                                                <Button variant="outline" size="icon" onClick={handleToggleMute} title={isMuted ? "Uključi zvuk" : "Utišaj zvuk"}>
                                                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                                </Button>
                                                <div className="flex items-center gap-2 w-[150px]">
                                                    <Label htmlFor="volume-slider" className="sr-only">Glasnoća</Label>
                                                    <Slider
                                                        id="volume-slider"
                                                        defaultValue={[50]}
                                                        value={isMuted ? [0] : volume}
                                                        max={100}
                                                        step={1}
                                                        className={`w-full ${isMuted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onValueChange={handleVolumeChange}
                                                        disabled={isMuted} // Slider je disabled kad je mutirano
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {/* Prikaz eventualne audio greške */}
                                {audioError && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-400 dark:border-red-700 rounded flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> Audio Greška: {audioError}
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Kartice za Senzore */}
                        <div className="space-y-6 lg:col-span-1">
                            {/* Temperatura */}
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Temperatura Sobe</CardTitle>
                                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{temperature.toFixed(1)}°C</div>
                                    <p className="text-xs text-muted-foreground">
                                        {temperature > 24 ? 'Malo toplije' : temperature < 20 ? 'Malo hladnije' : 'Ugodno'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Kvaliteta Zraka */}
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Kvaliteta Zraka</CardTitle>
                                    <Wind className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{airQuality} <span className="text-xs font-normal">AQI</span></div>
                                    <p className="text-xs text-muted-foreground">
                                        {airQuality > 100 ? 'Loša' : airQuality > 50 ? 'Umjerena' : 'Dobra'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Detektor Kakice :) */}
                            <Card className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Detektor Kakice™</CardTitle>
                                    <ScanLine className={`h-4 w-4 ${isMonitoringActive ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
                                </CardHeader>
                                <CardContent>
                                    <AnimatePresence>
                                        {isMonitoringActive && (
                                            <motion.div
                                                key="scanLine"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2 relative" // Dodaj relative za pozicioniranje linije
                                            >
                                                <motion.div
                                                    className="h-full bg-blue-500 absolute top-0 bottom-0 w-1" // Tanki vertikalni marker
                                                    initial={{ x: "0%" }}
                                                    animate={{ x: "100%" }} // Kreće se od 0% do 100% unutar parenta
                                                    transition={{ duration: 0.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} // Ide lijevo-desno
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className={`text-lg font-semibold ${!isMonitoringActive || poopStatus.includes("Nema opasnosti") ? 'text-gray-700 dark:text-gray-300' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                        {poopStatus}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Stanje pelene u realnom vremenu.*
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">*Preciznost može varirati.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
