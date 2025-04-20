import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

// Shadcn/ui komponente
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InputError from '@/Components/InputError'; // Ovaj ostaje iz Breezea za prikaz greške

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password'); // Resetiraj lozinku kod unmounta komponente
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login')); // Ne treba onFinish ovdje, redirect rješava Inertia
    };

    return (
        // Koristimo flex umjesto GuestLayout za custom izgled
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Head title="Prijava" />

            <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Lijeva strana - Forma */}
                    <div className="p-6 sm:p-8 lg:p-10">
                        <div className="mb-6 text-center md:text-left">
                            {/* Opcionalno: Logo */}
                            {/* <ApplicationLogo className="w-20 h-20 fill-current text-gray-500 mx-auto md:mx-0" /> */}
                            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Dobrodošli!
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Prijavite se za pristup Bartul Monitoru.
                            </p>
                        </div>

                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email Adresa</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="mt-1 block w-full"
                                    autoComplete="username"
                                    required
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Lozinka</Label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                                        >
                                            Zaboravili ste lozinku?
                                        </Link>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    required
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', checked)} // Shadcn koristi onCheckedChange
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600 dark:text-gray-400"
                                >
                                    Zapamti me
                                </Label>
                            </div>

                            <div className="flex items-center justify-end pt-2">
                                <Button type="submit" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700" disabled={processing}>
                                    Prijavi se
                                </Button>
                            </div>
                        </form>
                        {/* Link za registraciju ako je omogućena */}
                            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                                Nemaš račun?{' '}
                                <Link href={route('register')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                    Registriraj se
                                </Link>
                            </p>
                    </div>

                    {/* Desna strana - Slika */}
                    <div className="relative hidden items-center justify-center bg-indigo-100 dark:bg-gray-700 md:flex">
                        {/* Možeš dodati i neki overlay ili efekt */}
                        <img
                            src="/images/login.png" // Putanja do tvoje slike
                            alt="Bartul se igra"
                            className="h-full w-full object-cover" // Cover da ispuni prostor
                        />
                        {/* Opcionalno: Tekst preko slike */}
                        {/* <div className="absolute bottom-10 left-10 text-white z-10 bg-black/50 p-4 rounded">
                            <h3 className="text-2xl font-semibold">Bartul Monitor</h3>
                            <p>Tvoj miran san, naš posao.</p>
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
