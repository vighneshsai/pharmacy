import mysql from "mysql";
import express from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import apiRouter from './routes/api.js'
import fs from 'fs';

import cookieSession from "cookie-session";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
app.use(express.json());
const publicDir = join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
app.use('/public', express.static(publicDir));

app.use(
  cookieSession({ name: "session", keys: ["lama"], maxAge: 24 * 60 * 60 * 100 })
);
app.use("/api", apiRouter);

app.use(function (req, res, next) {

  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Headers", "content-type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "DELETE,PATCH");

  next();
});


app.listen(3006, (req, res) => {
  console.log("Operation port 3006 port is running");
});
