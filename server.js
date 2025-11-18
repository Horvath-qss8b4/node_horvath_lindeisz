const express = require("express");
const mysql = require("mysql2/promise");
const session = require("express-session");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

let db;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const views = {};

views.header = `
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Városok Beadandó</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body { background-color: #f8f9fa; }
        .navbar { background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,.1); }
        .hero {
            background: linear-gradient(to right, #007bff, #00c6ff);
            color: white;
            padding: 6rem 1rem;
            border-radius: 0.5rem;
        }
        .card { border: none; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .crud-form {
            background-color: #fff;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,.1);
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>

<nav class="navbar navbar-expand-lg sticky-top mb-4">
    <div class="container">
        <a class="navbar-brand" href="/">
            <i class="bi bi-building"></i> Városnév Kft.
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                    <a class="nav-link" href="/">Főoldal</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/database">Adatbázis</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="/contact">Kapcsolat</a>
                </li>
                
                <% if (user && user.role) { %>
                    <% if (user.role === 'registered' || user.role === 'admin') { %>
                        <li class="nav-item">
                            <a class="nav-link" href="/messages">Üzenetek</a>
                        </li>
                    <% } %>
                    
                    <li class="nav-item">
                        <a class="nav-link" href="/crud">CRUD</a>
                    </li>
                    
                    <% if (user.role === 'admin') { %>
                        <li class="nav-item">
                            <a class="nav-link" href="/admin">Admin</a>
                        </li>
                    <% } %>

                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-person-circle"></i> <%= user.username %> (<%= user.role %>)
                        </a>
                        <ul class="dropdown-menu" aria-labelledby="navbarDropdown">
                            <li><a class="dropdown-item" href="/logout">Kijelentkezés</a></li>
                        </ul>
                    </li>
                <% } else { %>
                    <li class="nav-item">
                        <a class="nav-link" href="/login">Bejelentkezés</a>
                    </li>
                <% } %>
            </ul>
        </div>
    </div>
</nav>

<main class="container">
    <% if (success_msg) { %>
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <%= success_msg %>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <% } %>
    <% if (error_msg) { %>
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <%= error_msg %>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <% } %>
`;

views.footer = `
</main>

<footer class="container text-center text-muted mt-5 py-4 border-top">
    <p>&copy; 2025 Városnév Kft. - Beadandó Feladat.</p>
</footer>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

views.index = `
<!-- 3. Feladat: Főoldal -->
<div class="hero text-center mb-4">
    <h1 class="display-4">Üdvözöljük a Városnév Kft. oldalán!</h1>
    <p class="lead">Országos városnév adatbázis.</p>
    <a href="/database" class="btn btn-light btn-lg">Adatbázis megtekintése</a>
</div>

<div class="row text-center">
    <div class="col-md-4">
        <div class="card p-4 h-100">
            <i class="bi bi-bar-chart-line-fill fs-1 text-primary"></i>
            <h4 class="mt-3">Adatvezérelt</h4>
            <p>Részletes statisztikák és adatok Magyarország városairól.</p>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-4 h-100">
            <i class="bi bi-shield-lock-fill fs-1 text-success"></i>
            <h4 class="mt-3">Biztonságos</h4>
            <p>Modern autentikációs rendszer védi felhasználóink adatait.</p>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card p-4 h-100">
            <i class="bi bi-pencil-square fs-1 text-info"></i>
            <h4 class="mt-3">Interaktív</h4>
            <p>Kezelje az adatokat egy egyszerű CRUD felületen keresztül.</p>
        </div>
    </div>
</div>
`;

views.login = `
<div class="row justify-content-center">
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-body p-4 p-lg-5">
                <h2 class="card-title text-center mb-4">Bejelentkezés</h2>
                <form action="/login" method="POST">
                    <div class="mb-3">
                        <label for="login-username" class="form-label">Felhasználónév</label>
                        <input type="text" class="form-control" id="login-username" name="username" required>
                    </div>
                    <div class="mb-3">
                        <label for="login-password" class="form-label">Jelszó</label>
                        <input type="password" class="form-control" id="login-password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Bejelentkezés</button>
                </form>
            </div>
        </div>
    </div>
    
    <div class="col-lg-6 mb-4">
        <div class="card">
            <div class="card-body p-4 p-lg-5">
                <h2 class="card-title text-center mb-4">Regisztráció</h2>
                <form action="/register" method="POST">
                    <div class="mb-3">
                        <label for="reg-username" class="form-label">Felhasználónév</label>
                        <input type="text" class="form-control" id="reg-username" name="username" required>
                    </div>
                    <div class="mb-3">
                        <label for="reg-email" class="form-label">E-mail cím</label>
                        <input type="email" class="form-control" id="reg-email" name="email" required>
                    </div>
                    <div class="mb-3">
                        <label for="reg-password" class="form-label">Jelszó</label>
                        <input type="password" class="form-control" id="reg-password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-success w-100">Regisztráció</button>
                </form>
            </div>
        </div>
    </div>
</div>
`;

views.database = `
<h1 class="mb-4">Adatbázis adatok</h1>

<h2 class="h4">Városok és megyék</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Város</th>
                    <th>Megye</th>
                    <th>Megyeszékhely</th>
                </tr>
            </thead>
            <tbody>
                <% if (varosok && varosok.length > 0) { %>
                    <% varosok.forEach(varos => { %>
                        <tr>
                            <td><%= varos.id %></td>
                            <td><%= varos.nev %></td>
                            <td><%= varos.megye_nev %></td>
                            <td><%= varos.megyeszekhely === -1 ? 'Igen' : 'Nem' %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="4" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>

<h2 class="h4">Megyék</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Megye</th>
                </tr>
            </thead>
            <tbody>
                <% if (megyek && megyek.length > 0) { %>
                    <% megyek.forEach(megye => { %>
                        <tr>
                            <td><%= megye.id %></td>
                            <td><%= megye.nev %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="2" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>


<h2 class="h4">Lélekszám adatok</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>Város ID</th>
                    <th>Év</th>
                    <th>Nők száma</th>
                    <th>Összesen</th>
                </tr>
            </thead>
            <tbody>
                <% if (lelekszamok && lelekszamok.length > 0) { %>
                    <% lelekszamok.forEach(lsz => { %>
                        <tr>
                            <td><%= lsz.varosid %></td>
                            <td><%= lsz.ev %></td>
                            <td><%= lsz.no.toLocaleString('hu-HU') %></td>
                            <td><%= lsz.osszesen.toLocaleString('hu-HU') %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="4" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>
`;

views.database = `
<h1 class="mb-4">Adatbázis adatok</h1>

<h2 class="h4">Városok és megyék</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Város</th>
                    <th>Megye</th>
                    <th>Megyeszékhely</th>
                </tr>
            </thead>
            <tbody>
                <% if (varosok && varosok.length > 0) { %>
                    <% varosok.forEach(varos => { %>
                        <tr>
                            <td><%= varos.id %></td>
                            <td><%= varos.nev %></td>
                            <td><%= varos.megye_nev %></td>
                            <td><%= varos.megyeszekhely === -1 ? 'Igen' : 'Nem' %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="4" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>

<h2 class="h4">Megyék</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Megye</th>
                </tr>
            </thead>
            <tbody>
                <% if (megyek && megyek.length > 0) { %>
                    <% megyek.forEach(megye => { %>
                        <tr>
                            <td><%= megye.id %></td>
                            <td><%= megye.nev %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="2" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>


<h2 class="h4">Lélekszám adatok</h2>
<div class="card mb-4">
    <div class="card-body" style="max-height: 400px; overflow-y: auto;">
        <table class="table table-striped table-sm">
            <thead>
                <tr>
                    <th>Város ID</th>
                    <th>Év</th>
                    <th>Nők száma</th>
                    <th>Összesen</th>
                </tr>
            </thead>
            <tbody>
                <% if (lelekszamok && lelekszamok.length > 0) { %>
                    <% lelekszamok.forEach(lsz => { %>
                        <tr>
                            <td><%= lsz.varosid %></td>
                            <td><%= lsz.ev %></td>
                            <td><%= lsz.no.toLocaleString('hu-HU') %></td>
                            <td><%= lsz.osszesen.toLocaleString('hu-HU') %></td>
                        </tr>
                    <% }) %>
                <% } else { %>
                    <tr><td colspan="4" class="text-center">Nincsenek adatok az adatbázis táblában.</td></tr>
                <% } %>
            </tbody>
        </table>
    </div>
</div>
`;

views.contact = `
<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-body p-4 p-lg-5">
                <h2 class="card-title text-center mb-4">Kapcsolat</h2>
                <p class="text-center text-muted mb-4">Küldjön nekünk üzenetet az alábbi űrlap segítségével. Az adatokat adatbázisban tároljuk.</p>
                
                <form action="/contact" method="POST">
                    <div class="mb-3">
                        <label for="name" class="form-label">Név</label>
                        <input type="text" class="form-control" id="name" name="name" required>
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">E-mail cím</label>
                        <input type="email" class="form-control" id="email" name="email" required>
                    </div>
                    <div class="mb-3">
                        <label for="subject" class="form-label">Tárgy</label>
                        <input type="text" class="form-control" id="subject" name="subject">
                    </div>
                    <div class="mb-3">
                        <label for="message" class="form-label">Üzenet</label>
                        <textarea class="form-control" id="message" name="message" rows="5" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary w-100">Üzenet küldése</button>
                </form>
            </div>
        </div>
    </div>
</div>
`;

// <--server kapcsolat-->
async function startServer() {
  try {
    db = await mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "varosok",
      port: "3306",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    await db.query("SELECT 1");
    console.log("Sikeres kapcsolat az adatbázissal!");

    app.listen(PORT, () => {
      console.log(`A szerver fut a http://localhost:${PORT} címen`);
    });
  } catch (err) {
    console.error("Nem sikerült csatlakozni az adatbázishoz vagy elindítani a szervert!");
    console.error(err);
    process.exit(1);
  }
}

startServer();
