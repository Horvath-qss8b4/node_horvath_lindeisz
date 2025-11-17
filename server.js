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

//-------------------------------------------------------------
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
