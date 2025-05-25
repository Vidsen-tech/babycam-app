import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioStreamer } from '@/hooks/useAudioStreamer'; // Naš hook

// Shadcn/ui komponente
import { Button } from "@/Components/ui/button"; // Provjeri jesu li ove putanje ispravne za tvoj projekt
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Slider } from "@/Components/ui/slider";
import { Label } from "@/Components/ui/label";

// Ikone
import { Play, StopCircle, Volume2, VolumeX, Video, VideoOff, Thermometer, Wind, ScanLine, AlertCircle, Maximize, Minimize } from 'lucide-react';

// Animacije
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard({ auth }) {
    // Stanje za UI (namjera korisnika)
    const [isMonitoringActive, setIsMonitoringActive] = useState(false);
    // Stanje za fullscreen ostaje ovdje jer je UI specifično
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [poopStatus, setPoopStatus] = useState('Detektor neaktivan');
    const videoContainerRef = useRef(null);

    // --- Audio Streamer Hook ---
    const PI_IP_ADDRESS = '192.168.100.59'; // Koristimo tvoju trenutnu IP adresu
    const WEBSOCKET_PORT = 8765;
    const wsUrl = `ws://${PI_IP_ADDRESS}:${WEBSOCKET_PORT}`;

    // Dohvaćamo isMuted, volume, toggleMute, setVolumeLevel iz hooka
    const {
        isAudioStreaming, // Stvarno stanje audio streama
        error: audioError,
        startStreaming,
        stopStreaming,
        isMuted,          // Stvarno mute stanje iz hooka
        volume,           // Stvarna glasnoća (0-100) iz hooka
        toggleMute,       // Funkcija za promjenu mute stanja iz hooka
        setVolumeLevel    // Funkcija za promjenu glasnoće iz hooka
    } = useAudioStreamer(wsUrl);


    // --- EFEKT: Sinkronizacija Namjere i Stvarnog Streama ---
    useEffect(() => {
        if (isMonitoringActive) {
            // Pokreni stream samo ako već ne radi
            if (!isAudioStreaming) { // Koristi isAudioStreaming iz hooka
                console.log("Dashboard Effect: Namjera=ON, Stream=OFF -> Pokrećem audio stream...");
                startStreaming();
            }
        } else {
            // Zaustavi stream samo ako radi
            if (isAudioStreaming) { // Koristi isAudioStreaming iz hooka
                console.log("Dashboard Effect: Namjera=OFF, Stream=ON -> Zaustavljam audio stream...");
                stopStreaming();
            }
        }npm
    }, [isMonitoringActive, isAudioStreaming, startStreaming, stopStreaming]);

    // --- Handleri za Gumbe i Kontrole ---

    // Gumb "Pokreni/Zaustavi Nadzor" - samo mijenja namjeru
    const handleToggleMonitoring = () => {
        console.log("Dashboard: Toggle Monitoring Button Clicked - Mijenjam NAMJERU");
        setIsMonitoringActive(prevState => !prevState);
    };

    // Mute gumb sada zove 'toggleMute' iz hooka
    const handleToggleMute = () => {
        if (!isAudioStreaming) return; // Radi samo ako stream ide
        toggleMute(); // Pozovi funkciju iz hooka
    };

    // Volume Slider sada zove 'setVolumeLevel' iz hooka
    const handleVolumeChange = (value) => { // value je array npr. [65]
        if (!isAudioStreaming) return; // Ne mijenjaj ako stream ne radi
        // Ne treba provjera za isMuted ovdje, hook će to hendlati
        setVolumeLevel(value[0]); // Pozovi funkciju iz hooka s brojem
    };

    // Fullscreen (ostaje isti kao prije)
    const handleToggleFullscreen = useCallback(() => {
        const elem = videoContainerRef.current;
        if (!elem) {
            console.error("Fullscreen target element not found.");
            return;
        }
        const isInFullScreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isInFullScreen) {
            const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen;
            if (requestMethod) {
                requestMethod.call(elem).catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    setIsFullscreen(false); // Resetiraj ako ne uspije
                });
            } else {
                console.error("Fullscreen API is not supported by this browser.");
            }
        } else {
            const exitMethod = document.exitFullscreen || document.webkitExitFullscreen;
            if (exitMethod) {
                exitMethod.call(document).catch(err => {
                    console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                console.error("Exit Fullscreen API is not supported by this browser.");
            }
        }
    }, []);

    // Effect za praćenje fullscreen promjena (ostaje isti)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Effect za Detektor Kakice (ostaje isti)
    useEffect(() => {
        let timeoutId = null;
        if (isMonitoringActive) {
            const simulateDetection = () => {
                setPoopStatus("Skeniranje u tijeku...");
                timeoutId = setTimeout(() => {
                    const detected = Math.random() > 0.8;
                    if (detected) {
                        setPoopStatus("🚨 Alarm! Moguća kakica! 🚨");
                    } else {
                        setPoopStatus("Nema opasnosti! (Za sada...)");
                        timeoutId = setTimeout(simulateDetection, 2000);
                    }
                }, 3000 + Math.random() * 2000);
            };
            simulateDetection();
        } else {
            setPoopStatus("Detektor neaktivan");
        }
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [isMonitoringActive]);

    // Mock podaci (ostaju isti)
    const temperature = 22.5;
    const airQuality = 45;

    // === JSX Struktura ===
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
                                <div ref={videoContainerRef} className="relative aspect-video bg-slate-900 dark:bg-black text-white flex items-center justify-center rounded mb-4 overflow-hidden">
                                    {isMonitoringActive ? (
                                        <img
                                            key={isMonitoringActive ? 'video-on' : 'video-off'}
                                            src={`http://${PI_IP_ADDRESS}:8090/stream.mjpg`}
                                            alt="Live Bartul Stream"
                                            onError={(e) => {
                                                console.error("MJPEG stream greška ili nije dostupan:", e);
                                                e.target.style.display = 'none';
                                            }}
                                            className="object-contain h-full w-full"
                                            style={{ display: isMonitoringActive ? 'block' : 'none' }}
                                        />
                                    ) : (
                                        <div className="text-center p-4">
                                            <VideoOff className="h-16 w-16 mx-auto text-gray-500 mb-2" />
                                            <p className="text-gray-400">Nadzor je isključen</p>
                                        </div>
                                    )}
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
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                    <Button
                                        variant={isMonitoringActive ? "destructive" : "default"}
                                        onClick={handleToggleMonitoring} // Poziva SAMO toggle namjere
                                        size="sm"
                                        disabled={!PI_IP_ADDRESS || PI_IP_ADDRESS === 'YOUR_PI_IP_ADDRESS'} // Ovo možeš maknuti ako je PI_IP_ADDRESS uvijek definiran
                                        className={`${isMonitoringActive ? '' : 'bg-green-600 hover:bg-green-700'}`}
                                    >
                                        {isMonitoringActive ? <StopCircle className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                        {isMonitoringActive ? 'Zaustavi Nadzor' : 'Pokreni Nadzor'}
                                    </Button>

                                    <AnimatePresence>
                                        {isAudioStreaming && ( // Prikaz ovisi o STVARNOM stanju streama iz hooka
                                            <motion.div
                                                key="audioControls"
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex items-center gap-2 overflow-hidden"
                                            >
                                                <Button variant="outline" size="icon" onClick={handleToggleMute} title={isMuted ? "Uključi zvuk" : "Utišaj zvuk"}>
                                                    {/* Koristimo isMuted iz hooka */}
                                                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                                </Button>
                                                <div className="flex items-center gap-2 w-[150px]">
                                                    <Label htmlFor="volume-slider" className="sr-only">Glasnoća</Label>
                                                    <Slider
                                                        id="volume-slider"
                                                        // value sada direktno koristi isMuted i volume iz hooka
                                                        value={isMuted ? [0] : [volume]} // Slider prima array, volume iz hooka je broj
                                                        max={100}
                                                        step={1}
                                                        className={`w-full ${isMuted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onValueChange={handleVolumeChange} // Zove naš novi handler
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

                        {/* Kartice za Senzore (ostaju iste kao u tvom kodu) */}
                        <div className="space-y-6 lg:col-span-1">
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
                            <Card className="shadow-lg overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Detektor Kakice™ 💩</CardTitle>
                                    <ScanLine className={`h-4 w-4 ${isMonitoringActive && poopStatus.includes("Skeniranje") ? 'text-sky-500 animate-pulse' : 'text-muted-foreground'}`} />
                                </CardHeader>
                                <CardContent>
                                    <AnimatePresence>
                                        {isMonitoringActive && (
                                            <motion.div
                                                key="scanBar"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2 overflow-hidden relative"
                                            >
                                                <motion.div
                                                    className="absolute inset-0 h-full w-full"
                                                    style={{
                                                        background: `linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.7) 50%, transparent 100%)`,
                                                        backgroundSize: '300% 100%',
                                                    }}
                                                    initial={{ backgroundPosition: '150% 0' }}
                                                    animate={{ backgroundPosition: '-150% 0' }}
                                                    transition={{
                                                        duration: 1.8,
                                                        repeat: Infinity,
                                                        ease: 'linear',
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
