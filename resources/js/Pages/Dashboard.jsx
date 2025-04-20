// resources/js/Pages/Dashboard.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { useAudioStreamer } from '@/hooks/useAudioStreamer'; // Importaj naš novi hook

export default function Dashboard({ auth }) {
    const [isCameraOn, setIsCameraOn] = useState(false);

    // --- Koristi Audio Streamer Hook ---
    // Zamijeni ovo s PRAVOM IP adresom tvog Raspberry Pi-ja!
    const PI_IP_ADDRESS = '192.168.100.61'; // <--- *** OBAVEZNO PROMIJENI OVO ***
    const WEBSOCKET_PORT = 8765;
    const wsUrl = `ws://${PI_IP_ADDRESS}:${WEBSOCKET_PORT}`;

    const { isAudioStreaming, error: audioError, startStreaming, stopStreaming } = useAudioStreamer(wsUrl);

    // Placeholder funkcije za kameru
    const handleToggleCamera = () => {
        console.log('Toggle Camera clicked');
        setIsCameraOn(prevState => !prevState);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Baby Monitor Kontrolna Ploča
                </h2>
            }
        >
            <Head title="Kontrolna Ploča" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {/* Sekcija za Video (nepromijenjena) */}
                    <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                        <section>
                            <header className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Video Nadzor
                                </h3>
                            </header>
                            <div className="aspect-video bg-black text-white flex items-center justify-center rounded mb-4">
                                {isCameraOn ? 'Video stream će biti ovdje...' : 'Kamera je isključena'}
                            </div>
                            <button
                                onClick={handleToggleCamera}
                                className={`px-4 py-2 rounded font-semibold text-white ${
                                    isCameraOn
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-green-600 hover:bg-green-500'
                                }`}
                            >
                                {isCameraOn ? 'Isključi Kameru' : 'Uključi Kameru'}
                            </button>
                        </section>
                    </div>

                    {/* Sekcija za Audio */}
                    <div className="p-4 sm:p-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                        <section>
                            <header className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    Audio Nadzor (Live)
                                </h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Uključite zvuk mikrofona za slušanje Bartula.
                                </p>
                            </header>

                            {/* Prikaz eventualne greške */}
                            {audioError && (
                                <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
                                    Greška: {audioError}
                                </div>
                            )}

                            <div className="mb-4">
                                <p>Status: <span className={isAudioStreaming ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{isAudioStreaming ? 'Slušanje aktivno' : 'Slušanje neaktivno'}</span></p>
                            </div>

                            <button
                                onClick={isAudioStreaming ? stopStreaming : startStreaming} // Koristi funkcije iz hooka
                                className={`px-4 py-2 rounded font-semibold text-white ${
                                    isAudioStreaming
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                                disabled={!PI_IP_ADDRESS || PI_IP_ADDRESS === 'YOUR_PI_IP_ADDRESS'} // Onemogući ako IP nije postavljen
                            >
                                {isAudioStreaming ? 'Prestani Slušati' : 'Počni Slušati'}
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
