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
