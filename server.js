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

views.messages = `
<h1 class="mb-4">Beérkezett üzenetek</h1>
<p>Ezt az oldalt csak bejelentkezett felhasználók láthatják. Az üzenetek fordított időrendben jelennek meg.</p>

<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Küldés ideje</th>
                        <th>Név</th>
                        <th>E-mail</th>
                        <th>Tárgy</th>
                        <th>Üzenet</th>
                    </tr>
                </thead>
                <tbody>
                    <% if (messages && messages.length > 0) { %>
                        <% messages.forEach(msg => { %>
                            <tr>
                                <td class="text-nowrap"><%= new Date(msg.created_at).toLocaleString('hu-HU') %></td>
                                <td><%= msg.name %></td>
                                <td><%= msg.email %></td>
                                <td><%= msg.subject %></td>
                                <td><%= msg.message %></td>
                            </tr>
                        <% }) %>
                    <% } else { %>
                        <tr>
                            <td colspan="5" class="text-center">Még nem érkezett üzenet.</td>
                        </tr>
                    <% } %>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;

views.crud = `
<h1 class="mb-4">Városok Kezelése (CRUD)</h1>

<div class="crud-form">
    <h2 class="h4 mb-3" id="crud-form-title">Új város felvitele</h2>
    <form action="/crud/add" method="POST" id="crud-form">
        <input type="hidden" name="id" id="form-varos-id">
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="form-varos-nev" class="form-label">Város neve</label>
                <input type="text" class="form-control" id="form-varos-nev" name="nev" required>
            </div>
            <div class="col-md-6 mb-3">
                <label for="form-varos-megyeid" class="form-label">Megye</label>
                <select class="form-select" id="form-varos-megyeid" name="megyeid" required>
                    <% if (megyek && megyek.length > 0) { %>
                        <% megyek.forEach(megye => { %>
                            <option value="<%= megye.id %>"><%= megye.nev %></option>
                        <% }) %>
                    <% } %>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label">Megyeszékhely?</label>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="megyeszekhely" id="form-msz-igen" value="-1">
                    <label class="form-check-label" for="form-msz-igen">Igen</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="megyeszekhely" id="form-msz-nem" value="0" checked>
                    <label class="form-check-label" for="form-msz-nem">Nem</label>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label">Megyei jogú?</label>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="megyeijogu" id="form-mj-igen" value="-1">
                    <label class="form-check-label" for="form-mj-igen">Igen</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="megyeijogu" id="form-mj-nem" value="0" checked>
                    <label class="form-check-label" for="form-mj-nem">Nem</label>
                </div>
            </div>
        </div>
        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary" id="crud-submit-btn">Létrehozás</button>
            <button type="button" class="btn btn-secondary d-none" id="crud-cancel-btn">Mégse</button>
        </div>
    </form>
</div>

<h2 class="h4 mb-3">Városok Listája</h2>
<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover table-sm">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Név</th>
                        <th>Megye</th>
                        <th>Megyeszékhely</th>
                        <th>Megyei jogú</th>
                        <th>Műveletek</th>
                    </tr>
                </thead>
                <tbody>
                    <% if (varosok && varosok.length > 0) { %>
                        <% varosok.forEach(varos => { %>
                            <tr id="varos-<%= varos.id %>" 
                                data-id="<%= varos.id %>"
                                data-nev="<%= varos.nev %>"
                                data-megyeid="<%= varos.megyeid %>"
                                data-megyeszekhely="<%= varos.megyeszekhely %>"
                                data-megyeijogu="<%= varos.megyeijogu %>">
                                <td><%= varos.id %></td>
                                <td><%= varos.nev %></td>
                                <td><%= varos.megye_nev %></td>
                                <td><%= varos.megyeszekhely === -1 ? 'Igen' : 'Nem' %></td>
                                <td><%= varos.megyeijogu === -1 ? 'Igen' : 'Nem' %></td>
                                <td class="text-nowrap">
                                    <button class="btn btn-sm btn-warning btn-edit" onclick="editVaros(<%= varos.id %>)">
                                        <i class="bi bi-pencil-fill"></i>
                                    </button>
                                    
                                    <form action="/crud/delete" method="POST" class="d-inline" onsubmit="return confirm('Biztosan törölni szeretné ezt a várost?');">
                                        <input type="hidden" name="id" value="<%= varos.id %>">
                                        <button type="submit" class="btn btn-sm btn-danger">
                                            <i class="bi bi-trash-fill"></i>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <% }) %>
                    <% } else { %>
                        <tr>
                            <td colspan="6" class="text-center">Nincsenek városok az adatbázisban.</td>
                        </tr>
                    <% } %>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
    const form = document.getElementById('crud-form');
    const formTitle = document.getElementById('crud-form-title');
    const submitBtn = document.getElementById('crud-submit-btn');
    const cancelBtn = document.getElementById('crud-cancel-btn');
    const idInput = document.getElementById('form-varos-id');
    const nevInput = document.getElementById('form-varos-nev');
    const megyeIdSelect = document.getElementById('form-varos-megyeid');

    function editVaros(id) {
        const row = document.getElementById('varos-' + id);
        
        const nev = row.dataset.nev;
        const megyeid = row.dataset.megyeid;
        const megyeszekhely = row.dataset.megyeszekhely;
        const megyeijogu = row.dataset.megyeijogu;
        
        form.action = '/crud/update';
        formTitle.innerText = 'Város Módosítása (ID: ' + id + ')';
        submitBtn.innerText = 'Módosítás';
        submitBtn.classList.remove('btn-primary');
        submitBtn.classList.add('btn-success');
        cancelBtn.classList.remove('d-none');

        idInput.value = id;
        nevInput.value = nev;
        megyeIdSelect.value = megyeid;
        
        document.querySelector(\`input[name="megyeszekhely"][value="\${megyeszekhely}"]\`).checked = true;
        document.querySelector(\`input[name="megyeijogu"][value="\${megyeijogu}"]\`).checked = true;
        
        window.scrollTo(0, form.offsetTop);
    }

    cancelBtn.addEventListener('click', () => {
        form.action = '/crud/add';
        formTitle.innerText = 'Új Város Felvitele';
        submitBtn.innerText = 'Létrehozás';
        submitBtn.classList.remove('btn-success');
        submitBtn.classList.add('btn-primary');
        cancelBtn.classList.add('d-none');
        
        form.reset();
        idInput.value = '';
        document.getElementById('form-msz-nem').checked = true;
        document.getElementById('form-mj-nem').checked = true;
    });
</script>
`;

views.admin = `
<div class="card bg-light border-danger">
    <div class="card-body p-4 p-lg-5">
        <h2 class="h4 mt-5">Felhasználók Listája</h2>
        <div class="table-responsive">
            <table class="table table-striped table-sm">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Felhasználónév</th>
                        <th>E-mail</th>
                        <th>Szerepkör</th>
                        <th>Regisztrált</th>
                    </tr>
                </thead>
                <tbody>
                    <% if (users && users.length > 0) { %>
                        <% users.forEach(user => { %>
                            <tr class="<%= user.role === 'admin' ? 'table-danger' : '' %>">
                                <td><%= user.id %></td>
                                <td><%= user.username %></td>
                                <td><%= user.email %></td>
                                <td><%= user.role %></td>
                                <td><%= new Date(user.created_at).toLocaleString('hu-HU') %></td>
                            </tr>
                        <% }) %>
                    <% } else { %>
                        <tr><td colspan="5" class="text-center">Nincsenek felhasználók.</td></tr>
                    <% } %>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;

function renderPage(req, res, viewName, data = {}) {
  try {
    const user = req.session.user;
    const success_msg = req.session.success_msg;
    const error_msg = req.session.error_msg;

    delete req.session.success_msg;
    delete req.session.error_msg;

    const template = views.header + views[viewName] + views.footer;

    const allData = {
      ...data,
      user: user,
      success_msg: success_msg,
      error_msg: error_msg,
    };

    const html = ejs.render(template, allData);
    res.send(html);
  } catch (err) {
    console.error(`Hiba a(z) '${viewName}' nézet renderelése közben:`, err);
    res.status(500).send("Hiba történt a nézet renderelése közben.");
  }
}

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.session.error_msg = "Az oldal megtekintéséhez bejelentkezés szükséges.";
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  req.session.error_msg = "Az oldal megtekintéséhez admin jogosultság szükséges.";
  res.redirect("/");
}

app.get("/", (req, res) => {
  renderPage(req, res, "index");
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  renderPage(req, res, "login");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    req.session.error_msg = "Minden mező kitöltése kötelező.";
    return res.redirect("/login");
  }
  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const role = "registered";

    const [result] = await db.query("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", [
      username,
      email,
      password_hash,
      role,
    ]);

    req.session.success_msg = "Sikeres regisztráció! Most már bejelentkezhet.";
    res.redirect("/login");
  } catch (err) {
    console.error("Regisztrációs hiba:", err);
    if (err.code === "ER_DUP_ENTRY") {
      req.session.error_msg = "A felhasználónév vagy e-mail cím már foglalt.";
    } else {
      req.session.error_msg = "Hiba történt a regisztráció során.";
    }
    res.redirect("/login");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    req.session.error_msg = "Felhasználónév és jelszó megadása kötelező.";
    return res.redirect("/login");
  }
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length === 0) {
      req.session.error_msg = "Hibás felhasználónév vagy jelszó.";
      return res.redirect("/login");
    }

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      req.session.success_msg = `Üdvözlünk, ${user.username}!`;
      res.redirect("/");
    } else {
      req.session.error_msg = "Hibás felhasználónév vagy jelszó.";
      res.redirect("/login");
    }
  } catch (err) {
    console.error("Bejelentkezési hiba:", err);
    req.session.error_msg = "Hiba történt a bejelentkezés során.";
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Kijelentkezési hiba:", err);
    }
    res.redirect("/");
  });
});

app.get("/database", async (req, res) => {
  try {
    const [varosok] = await db.query(`
            SELECT v.id, v.nev, v.megyeszekhely, m.nev AS megye_nev 
            FROM varos v 
            JOIN megye m ON v.megyeid = m.id 
            ORDER BY v.nev
        `);
    const [megyek] = await db.query("SELECT * FROM megye ORDER BY nev");
    const [lelekszamok] = await db.query("SELECT * FROM lelekszam LIMIT 50");

    renderPage(req, res, "database", {
      varosok: varosok,
      megyek: megyek,
      lelekszamok: lelekszamok,
    });
  } catch (err) {
    console.error("Adatbázis lekérdezési hiba:", err);
    req.session.error_msg = "Hiba az adatok lekérdezése közben.";
    res.redirect("/");
  }
});

app.get("/contact", (req, res) => {
  renderPage(req, res, "contact");
});

app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    req.session.error_msg = "A név, e-mail és üzenet mezők kitöltése kötelező.";
    return res.redirect("/contact");
  }
  try {
    await db.query("INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)", [
      name,
      email,
      subject,
      message,
    ]);
    req.session.success_msg = "Üzenetét sikeresen elküldtük és rögzítettük!";
    res.redirect("/contact");
  } catch (err) {
    console.error("Üzenet mentési hiba:", err);
    req.session.error_msg = "Hiba történt az üzenet mentése során.";
    res.redirect("/contact");
  }
});

app.get("/messages", isLoggedIn, async (req, res) => {
  if (req.session.user.role === "visitor") {
    req.session.error_msg = "Nincs jogosultsága az oldal megtekintéséhez.";
    return res.redirect("/");
  }

  try {
    const [messages] = await db.query("SELECT * FROM messages ORDER BY created_at DESC");
    renderPage(req, res, "messages", { messages: messages });
  } catch (err) {
    console.error("Üzenetek lekérdezési hiba:", err);
    req.session.error_msg = "Hiba az üzenetek lekérdezése közben.";
    res.redirect("/");
  }
});

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
