import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Sheet, SheetContent, SheetTrigger } from "@/Components/ui/sheet"; // Za mobilni meni (dodaj: npx shadcn@latest add sheet)
import { Button } from "@/Components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Za user dropdown (dodaj: npx shadcn@latest add dropdown-menu)

// Ikone
import { PanelLeft, LayoutDashboard, User, LogOut, Settings, Menu } from 'lucide-react'; // Dodaj ikone koje trebamo

export default function Authenticated({ user, header, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false); // Za mobilni prikaz

    const navItems = [
        { name: 'Kontrolna Ploča', route: 'dashboard', icon: LayoutDashboard },
        { name: 'Profil', route: 'profile.edit', icon: User },
        // Dodaj nove linkove ovdje ako trebaš
        // { name: 'Postavke', route: 'settings', icon: Settings },
    ];

    return (
        <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-950">
            {/* Sidebar (Vidljiv na većim ekranima) */}
            <aside className="hidden border-r bg-background lg:block lg:w-64 dark:bg-gray-900 dark:border-gray-800">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6 dark:border-gray-800">
                        <Link href="/" className="flex items-center gap-2 font-semibold">
                            {/* <Package2 className="h-6 w-6" /> Ovdje može logo */}
                            <span className="">Bartul Monitor</span>
                        </Link>
                        {/* Ovdje može i gumb za collapse ako želimo */}
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-4 text-sm font-medium">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={route(item.route)}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary dark:hover:text-gray-50 ${
                                        route().current(item.route)
                                            ? 'bg-muted text-primary dark:bg-gray-800 dark:text-gray-50'
                                            : 'text-muted-foreground dark:text-gray-400'
                                    }`}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    {/* Možeš dodati i nešto na dno sidebara ako želiš */}
                    {/* <div className="mt-auto p-4"> ... </div> */}
                </div>
            </aside>

            {/* Glavni dio (Header + Content) */}
            <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 dark:bg-gray-900 dark:border-gray-800">
                    {/* Hamburger gumb za mobilni sidebar */}
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="lg:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Otvori meni</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs dark:bg-gray-900 dark:border-gray-800">
                            <nav className="grid gap-6 text-lg font-medium">
                                <Link
                                    href="/"
                                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                                >
                                    {/* <Package2 className="h-5 w-5 transition-all group-hover:scale-110" /> Logo u mobilnom */}
                                    BM
                                    <span className="sr-only">Bartul Monitor</span>
                                </Link>
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={route(item.route)}
                                        onClick={() => setSidebarOpen(false)} // Zatvori meni na klik
                                        className={`flex items-center gap-4 px-2.5 ${
                                            route().current(item.route)
                                                ? 'text-foreground dark:text-gray-50'
                                                : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-50'
                                        }`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>

                    {/* Header Content (ako postoji) */}
                    <div className="flex-1 ml-auto lg:ml-0">
                        {header && (
                            <div className="p-4 sm:p-0">{header}</div>
                        )}
                    </div>

                    {/* User Dropdown (desno) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="overflow-hidden rounded-full"
                            >
                                {/* Placeholder slika ili inicijali */}
                                <span className="sr-only">Otvori korisnički meni</span>
                                <User className="h-5 w-5" /> {/* Ili prikaži user sliku ako je imaš */}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('profile.edit')}>Profil</Link>
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem>Postavke</DropdownMenuItem> */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('logout')} method="post" as="button">
                                    Odjava
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Glavni Sadržaj Stranice */}
                <main className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
