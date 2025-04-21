import { Head, Link, useForm } from '@inertiajs/react';

// Shadcn/ui komponente
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import InputError from '@/Components/InputError'; // Ovaj ostaje iz Breezea

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        // Glavni kontejner - centriranje sadržaja
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Head title="Zaboravljena lozinka" />

            {/* Kartica za zaboravljenu lozinku */}
            <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-md">
                {/* Grid layout - 1 stupac na mobitelu, 2 na većim ekranima */}
                <div className="grid grid-cols-1 md:grid-cols-2">

                    {/* Lijeva strana - Forma */}
                    <div className="p-6 sm:p-8 lg:p-10 order-2 md:order-1"> {/* Forma ide druga na mobitelu */}
                        <div className="mb-6 text-center md:text-left">
                            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Zaboravili ste lozinku?
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Nema problema. Unesite svoju email adresu i poslat ćemo vam link za resetiranje lozinke.
                            </p>
                        </div>

                        {/* Status poruka (npr. link poslan) */}
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
                                    autoFocus
                                    required
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            {/* Gumb za slanje linka */}
                            <div className="flex items-center justify-end pt-2">
                                <Button type="submit" className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-800 text-white" disabled={processing}>
                                    Pošalji link za reset lozinke
                                </Button>
                            </div>
                        </form>

                        {/* Link za prijavu */}
                        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            Sjetili ste se lozinke?{' '}
                            <Link href={route('login')} className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline">
                                Prijavi se
                            </Link>
                        </p>
                    </div>

                    {/* Desna strana - Slika */}
                    {/* Prikazuje se uvijek, ali layout grid ga smješta */}
                    {/* order-1 md:order-2 čini da je slika prva (iznad) na mobitelu */}
                    <div className="relative flex items-center justify-center bg-sky-100 dark:bg-gray-700 order-1 md:order-2">
                        <img
                            src="/images/login.png" // Koristimo istu sliku za konzistentnost
                            alt="Bartul se igra"
                            // Visina na mobu, puna visina na desktopu, object-cover za popunjavanje
                            className="h-64 w-full object-cover md:h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
