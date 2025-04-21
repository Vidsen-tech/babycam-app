import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioStreamer } from '@/hooks/useAudioStreamer';

// Shadcn/ui komponente
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Slider } from "@/Components/ui/slider";
import { Label } from "@/Components/ui/label";

// Ikone
import { Play, StopCircle, Volume2, VolumeX, VideoOff, Thermometer, Wind, ScanLine, AlertCircle, Maximize, Minimize } from 'lucide-react';

// Animacije
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard({ auth }) {
    const [isMonitoringActive, setIsMonitoringActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState([50]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const videoContainerRef = useRef(null); // Ref za kontejner koji ide u fullscreen

    // --- Audio Streamer Hook ---
    const PI_IP_ADDRESS = '192.168.100.61'; // <--- *** PROMIJENI AKO TREBA ***
    const WEBSOCKET_PORT = 8765;
    const wsUrl = `ws://${PI_IP_ADDRESS}:${WEBSOCKET_PORT}`;
    const { isAudioStreaming, error: audioError, startStreaming, stopStreaming } = useAudioStreamer(wsUrl);

    // --- Glavna Funkcija za Pokretanje/Zaustavljanje Nadzora ---
    const handleToggleMonitoring = () => {
        const turningOn = !isMonitoringActive;
        setIsMonitoringActive(turningOn);
        if (turningOn) {
            console.log('Starting Monitoring...');
            startStreaming();
        } else {
            console.log('Stopping Monitoring...');
            stopStreaming();
        }
    };

    // --- Audio Kontrole ---
    const handleToggleMute = () => {
        if (!isAudioStreaming) return;
        setIsMuted(prevState => !prevState);
        // TODO: Povezati s Web Audio API (gain node)
    };

    const handleVolumeChange = (value) => {
        if (!isAudioStreaming || isMuted) return;
        setVolume(value);
        // TODO: Povezati s Web Audio API (gain node)
    };

    // --- Fullscreen Funkcija (poboljšana s logiranjem) ---
    const handleToggleFullscreen = useCallback(() => {
        const elem = videoContainerRef.current;
        if (!elem) {
            console.error("Fullscreen target element not found.");
            return;
        }

        // Provjeravamo je li preglednik trenutno u fullscreen modu
        const isInFullScreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        console.log("Is currently in fullscreen:", isInFullScreen);

        if (!isInFullScreen) {
            // Ulazak u fullscreen
            console.log("Requesting fullscreen...");
            const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen; // Dodajemo i druge prefixe ako zatreba (mozRequestFullScreen, msRequestFullscreen)
            if (requestMethod) {
                requestMethod.call(elem).then(() => {
                    console.log("Fullscreen requested successfully.");
                    // Stanje će se ažurirati putem event listenera
                }).catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    // Resetiraj stanje ako API poziv ne uspije
                    setIsFullscreen(false);
                });
            } else {
                console.error("Fullscreen API is not supported by this browser.");
            }
        } else {
            // Izlazak iz fullscreena
            console.log("Exiting fullscreen...");
            const exitMethod = document.exitFullscreen || document.webkitExitFullscreen;
            if (exitMethod) {
                exitMethod.call(document).then(() => {
                    console.log("Fullscreen exited successfully.");
                    // Stanje će se ažurirati putem event listenera
                }).catch(err => {
                    console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                console.error("Exit Fullscreen API is not supported by this browser.");
            }
        }
        // Stanje 'isFullscreen' će se ažurirati putem event listenera ispod
    }, []); // useCallback da se funkcija ne rekreira nepotrebno

    // Effect za praćenje promjena fullscreen stanja (uklj. Esc tipku i promjene putem API-ja)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const currentlyFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
            console.log("Fullscreen change event detected. Is fullscreen:", currentlyFullscreen);
            setIsFullscreen(currentlyFullscreen);
        };

        // Dodajemo listener za standardni API i za webkit (Safari)
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        // Cleanup funkcija za uklanjanje listenera
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []); // Prazan dependency array znači da se ovo pokreće samo jednom (mount/unmount)

    // --- Detektor Kakice State & Effect ---
    const [poopStatus, setPoopStatus] = useState('Detektor neaktivan');
    // Maknuli smo scanProgress, animacija će biti vizualna

    useEffect(() => {
        let timeoutId = null;
        if (isMonitoringActive) {
            // Funkcija koja simulira promjenu statusa
            const simulateDetection = () => {
                setPoopStatus("Skeniranje u tijeku...");
                // Postavi timeout za "rezultat" skeniranja
                timeoutId = setTimeout(() => {
                    // Ovdje bi inače došla prava logika detekcije
                    // Nasumično ćemo reći je li ok ili nije :)
                    const detected = Math.random() > 0.8; // 20% šanse za "detekciju"
                    if (detected) {
                        setPoopStatus("🚨 Alarm! Moguća kakica! 🚨");
                    } else {
                        setPoopStatus("Nema opasnosti! (Za sada...)");
                        // Ponovno pokreni skeniranje nakon pauze
                        timeoutId = setTimeout(simulateDetection, 2000); // Pauza prije novog skeniranja
                    }
                }, 3000 + Math.random() * 2000); // Trajanje skeniranja (3-5 sek)
            };
            simulateDetection(); // Pokreni prvi put

        } else {
            setPoopStatus("Detektor neaktivan");
        }
        // Očisti timeout kad se stanje promijeni ili komponenta unmounta
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isMonitoringActive]); // Ovisi samo o glavnom stanju nadzora

    const temperature = 22.5;
    const airQuality = 45;

    return (
        <AuthenticatedLayout user={auth.user}>
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
                                <CardDescription>Video i audio nadzor Bartula.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Video Player Area s ref-om */}
                                {/* Dodajemo background boju i na sam ref element za bolji fullscreen doživljaj */}
                                <div ref={videoContainerRef} className="relative aspect-video bg-slate-900 dark:bg-black text-white flex items-center justify-center rounded mb-4 overflow-hidden">
                                    {isMonitoringActive ? (
                                        <img
                                            src="/images/bartul.png" // Provjeri putanju
                                            alt="Bartul - Nadzor Aktivan"
                                            // *** PROMJENA: object-contain umjesto object-cover ***
                                            // This makes the entire image visible, potentially adding letterboxing/pillarboxing
                                            className="object-contain h-full w-full"
                                        />
                                    ) : (
                                        <div className="text-center p-4">
                                            <VideoOff className="h-16 w-16 mx-auto text-gray-500 mb-2" />
                                            <p className="text-gray-400">Nadzor je isključen</p>
                                        </div>
                                    )}

                                    {/* Fullscreen gumb (prikazuje se samo ako je nadzor aktivan) */}
                                    {isMonitoringActive && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleToggleFullscreen}
                                            className="absolute top-2 right-2 text-white bg-black/30 hover:bg-black/60 focus-visible:ring-offset-0 focus-visible:ring-white z-10"
                                            title={isFullscreen ? "Izađi iz Fullscreena" : "Fullscreen"}
                                        >
                                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                                        </Button>
                                    )}
                                </div>

                                {/* Kontrole */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <Button
                                        variant={isMonitoringActive ? "destructive" : "default"}
                                        onClick={handleToggleMonitoring}
                                        size="sm"
                                        disabled={!PI_IP_ADDRESS || PI_IP_ADDRESS === 'YOUR_PI_IP_ADDRESS'}
                                        className={`${isMonitoringActive ? '' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {isMonitoringActive ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isMonitoringActive ? 'Zaustavi Nadzor' : 'Pokreni Nadzor'}
                                    </Button>

                                    <AnimatePresence>
                                        {isAudioStreaming && (
                                            <motion.div
                                                key="audioControls"
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
                                                        disabled={isMuted}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
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
                            <Card className="shadow-lg overflow-hidden"> {/* Dodan overflow-hidden ovdje */}
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Detektor Kakice™ 💩</CardTitle>
                                    {/* Ikona sada pulsira samo kad je status "Skeniranje..." */}
                                    <ScanLine className={`h-4 w-4 ${poopStatus.includes("Skeniranje") ? 'text-sky-500 animate-pulse' : 'text-muted-foreground'}`} />
                                </CardHeader>
                                <CardContent>
                                    {/* *** NOVA ANIMACIJA: Gradient Sweep *** */}
                                    <AnimatePresence>
                                        {isMonitoringActive && ( // Prikazujemo bar samo kad je monitoring aktivan
                                            <motion.div
                                                key="scanBar"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                // Osnovna siva pozadina bara
                                                className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 overflow-hidden relative"
                                            >
                                                {/* Animirani gradient overlay */}
                                                <motion.div
                                                    className="absolute inset-0 h-full w-full"
                                                    style={{
                                                        // Prozirno -> Plavo (malo jače) -> Prozirno
                                                        background: `linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.7) 50%, transparent 100%)`, // sky-400 sa 70% opacity
                                                        backgroundSize: '300% 100%', // Širi gradient da sweep bude ljepši
                                                    }}
                                                    initial={{ backgroundPosition: '150% 0' }} // Počni s desne strane
                                                    animate={{ backgroundPosition: '-150% 0' }} // Završi na lijevoj strani
                                                    transition={{
                                                        duration: 1.8, // Malo sporiji sweep
                                                        repeat: Infinity,
                                                        ease: 'linear', // Konstantna brzina
                                                        // Prikazuj samo dok skenira
                                                        display: poopStatus.includes("Skeniranje") ? 'block' : 'none',
                                                    }}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className={`text-lg font-semibold ${poopStatus.includes("Alarm") ? 'text-red-600 dark:text-red-400 animate-pulse' : poopStatus.includes("Skeniranje") ? 'text-sky-600 dark:text-sky-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {poopStatus}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {poopStatus.includes("Alarm") ? "Provjeri pelenu!" : poopStatus.includes("Skeniranje") ? "Analiziram..." : "Stanje pelene u realnom vremenu.*"}
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
