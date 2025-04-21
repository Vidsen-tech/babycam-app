import { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

// Shadcn/ui komponente
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import InputError from '@/Components/InputError'; // Ovaj ostaje iz Breezea

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        // Resetiraj polje lozinke kada se komponenta unmounta
        return () => {
            reset('password');
        };
    }, []);

    const submit = (e) => {
        e.preventDefault();
        post(route('login')); // Inertia rješava redirect
    };

    return (
        // Glavni kontejner - centriranje sadržaja
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Head title="Prijava" />

            {/* Kartica za login */}
            <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-md">
                {/* Grid layout - 1 stupac na mobitelu, 2 na većim ekranima */}
                <div className="grid grid-cols-1 md:grid-cols-2">

                    {/* Lijeva strana - Forma */}
                    <div className="p-6 sm:p-8 lg:p-10 order-2 md:order-1"> {/* Forma ide druga na mobitelu */}
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

                        {/* Status poruka (npr. nakon resetiranja lozinke) */}
                        {status && (
                            <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                                {status}
                            </div>
                        )}

                        {/* Forma */}
                        <form onSubmit={submit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <Label htmlFor="email">Email Adresa</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    className="mt-1 block w-full"
                                    autoComplete="username"
                                    autoFocus // Možeš dodati autoFocus ako želiš
                                    required
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            {/* Lozinka */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Lozinka</Label>
                                    {/* Link za zaboravljenu lozinku */}
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline"
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

                            {/* Zapamti me */}
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', !!checked)} // Osiguraj da je boolean
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600 dark:text-gray-400 cursor-pointer"
                                >
                                    Zapamti me
                                </Label>
                            </div>

                            {/* Gumb za prijavu */}
                            <div className="flex items-center justify-end pt-2">
                                <Button type="submit" className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-800 text-white" disabled={processing}>
                                    Prijavi se
                                </Button>
                            </div>
                        </form>

                        {/* Link za registraciju */}
                        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            Nemaš račun?{' '}
                            <Link href={route('register')} className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline">
                                Registriraj se
                            </Link>
                        </p>
                    </div>

                    {/* Desna strana - Slika */}
                    {/* Prikazuje se uvijek, ali layout grid ga smješta */}
                    {/* order-1 md:order-2 čini da je slika prva (iznad) na mobitelu */}
                    <div className="relative flex items-center justify-center bg-sky-100 dark:bg-gray-700 order-1 md:order-2">
                        <img
                            src="/images/login.png" // Provjeri putanju do slike!
                            alt="Bartul se igra"
                            // Visina na mobu, puna visina na desktopu, object-cover za popunjavanje
                            className="h-64 w-full object-cover md:h-full"
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
