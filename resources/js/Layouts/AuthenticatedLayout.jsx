import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Sheet, SheetContent, SheetTrigger } from "@/Components/ui/sheet";
import { Button } from "@/Components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
// *** Dodaj Tooltip komponente ***
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";

// Ikone
import { PanelLeft, LayoutDashboard, User, LogOut, Settings, Menu } from 'lucide-react'; // PanelLeft za collapse/expand

export default function Authenticated({ user, header, children }) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Za mobilni prikaz (Sheet)
    const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false); // Za collapse na desktopu

    const navItems = [
        { name: 'Kontrolna Ploča', route: 'dashboard', icon: LayoutDashboard },
        { name: 'Profil', route: 'profile.edit', icon: User },
        // { name: 'Postavke', route: 'settings', icon: Settings },
    ];

    // Funkcija za toggle desktop sidebara
    const toggleDesktopSidebar = () => setIsDesktopSidebarCollapsed(prev => !prev);

    return (
        // Dodaj TooltipProvider oko cijelog layouta ili barem oko dijela koji koristi tooltipe
        <TooltipProvider>
            <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-950">
                {/* Sidebar (Vidljiv i collapsable na većim ekranima) */}
                {/* *** Promijenjene klase za širinu i dodana tranzicija *** */}
                <aside className={`hidden border-r bg-background lg:block dark:bg-gray-900 dark:border-gray-800 transition-all duration-300 ease-in-out ${isDesktopSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
                    <div className="flex h-full max-h-screen flex-col gap-2">
                        {/* *** Sidebar Header s collapse gumbom *** */}
                        <div className={`flex h-[60px] items-center border-b px-6 dark:border-gray-800 ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
                            <Link href="/" className={`flex items-center gap-2 font-semibold ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
                                {/* Ovdje može logo ikona koja je uvijek vidljiva */}
                                {/* <Package2 className="h-6 w-6" /> */}
                                <span className={`whitespace-nowrap ${isDesktopSidebarCollapsed ? 'lg:hidden' : ''}`}>BTV CAM👶🏻</span>
                            </Link>
                            {/* *** Gumb za Collapse/Expand *** */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto hidden lg:inline-flex" // Prikazuje se samo na LG+
                                onClick={toggleDesktopSidebar}
                                title={isDesktopSidebarCollapsed ? 'Proširi' : 'Suzi'}
                            >
                                <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${isDesktopSidebarCollapsed ? 'rotate-180' : ''}`} />
                                <span className="sr-only">{isDesktopSidebarCollapsed ? 'Proširi' : 'Suzi'} sidebar</span>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto py-2">
                            <nav className="grid items-start px-4 text-sm font-medium">
                                {navItems.map((item) => (
                                    // *** Zamotano u Tooltip ***
                                    <Tooltip key={item.name} delayDuration={100}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={route(item.route)}
                                                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary dark:hover:text-gray-50 ${
                                                    route().current(item.route)
                                                        ? 'bg-muted text-primary dark:bg-gray-800 dark:text-gray-50'
                                                        : 'text-muted-foreground dark:text-gray-400'
                                                } ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`} // Centriraj ikonu kad je skupljeno
                                            >
                                                <item.icon className="h-4 w-4 shrink-0" /> {/* shrink-0 da se ikona ne smanji */}
                                                {/* *** Ime se sakriva kad je skupljeno *** */}
                                                <span className={`whitespace-nowrap ${isDesktopSidebarCollapsed ? 'lg:hidden' : ''}`}>
                                                    {item.name}
                                                </span>
                                            </Link>
                                        </TooltipTrigger>
                                        {/* *** Tooltip Content se prikazuje samo kad je skupljeno *** */}
                                        {isDesktopSidebarCollapsed && (
                                            <TooltipContent side="right">
                                                {item.name}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                ))}
                            </nav>
                        </div>
                    </div>
                </aside>

                {/* Glavni dio (Header + Content) */}
                <div className="flex flex-1 flex-col">
                    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 dark:bg-gray-900 dark:border-gray-800">
                        {/* Hamburger gumb za mobilni sidebar */}
                        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                            <SheetTrigger asChild>
                                {/* *** Koristi 'lg:hidden' da se sakrije kad je desktop sidebar vidljiv *** */}
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
                                        onClick={() => setMobileSidebarOpen(false)} // Zatvori meni
                                    >
                                        {/* Logo u mobilnom */}
                                        BTM {/* Skraćeno ime ili ikona */}
                                        <span className="sr-only">Bartul Monitor</span>
                                    </Link>
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={route(item.route)}
                                            onClick={() => setMobileSidebarOpen(false)} // Zatvori meni na klik
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
                                    {/* Dodajemo i Logout u mobilni meni radi lakšeg pristupa */}
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        onClick={() => setMobileSidebarOpen(false)}
                                        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-50"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Odjava
                                    </Link>
                                </nav>
                            </SheetContent>
                        </Sheet>

                        {/* Header Content */}
                        <div className="flex-1"> {/* Maknuo sam ml-auto da se ne gura desno nepotrebno */}
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
                                    className="overflow-hidden rounded-full ml-auto" /* Dodao ml-auto da ga gurne desno */
                                >
                                    <span className="sr-only">Otvori korisnički meni</span>
                                    <User className="h-5 w-5" /> {/* Ili user slika */}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {/* *** FIX: Optional chaining i fallback za user.name *** */}
                                <DropdownMenuLabel>{user?.name ?? 'Korisnik'}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('profile.edit')}>Profil</Link>
                                </DropdownMenuItem>
                                {/* <DropdownMenuItem>Postavke</DropdownMenuItem> */}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    {/* Ispravan način za Link kao gumb za POST metodu */}
                                    <Link href={route('logout')} method="post" as="button" className="w-full text-left">
                                        Odjava
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </header>

                    {/* Glavni Sadržaj Stranice */}
                    <main className="flex-1 overflow-y-auto p-4 sm:px-6 sm:py-4"> {/* Malo paddinga uvijek dobro dođe */}
                        {children}
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
