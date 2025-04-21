<?php

use App\Http\Controllers\ProfileController;
// Maknuo sam 'use Illuminate\Foundation\Application;' jer više ne koristimo Application::VERSION u '/' ruti
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Promijenjena ruta: '/' sada renderira Login stranicu umjesto Welcome
Route::get('/', function () {
    // Renderiraj Auth/Login komponentu
    // Proslijedi 'canResetPassword' ovisno postoji li ruta za reset lozinke
    // Proslijedi 'status' iz sesije (korisno nakon npr. zahtjeva za reset lozinke)
    return Inertia::render('Auth/Login', [
        'canResetPassword' => Route::has('password.request'),
        'status' => session('status'), // Dohvati status poruku ako postoji u sesiji
    ]);
})->middleware('guest')->name('login'); // Dodajemo middleware guest i ime rute 'login' da se poklapa s auth.php

// Ruta za dashboard ostaje ista
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Rute za profil ostaju iste
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Učitavanje autentifikacijskih ruta (login, register, logout, password reset...)
require __DIR__.'/auth.php';

// Ako postoji defaultna Breeze 'login' GET ruta u auth.php, možda ćeš je trebati ukloniti ili zakomentirati
// kako bi se izbjegao konflikt s našom '/' rutom koja sada ima name('login').
// Provjeri routes/auth.php i ako vidiš nešto poput:
// Route::get('login', [AuthenticatedSessionController::class, 'create'])->middleware('guest')->name('login');
// tu liniju možeš obrisati ili zakomentirati.
