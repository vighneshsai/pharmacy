import mysql from "mysql";
import express from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import apiRouter from './routes/api.js'

import cookieSession from "cookie-session";
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
dotenv.config();
app.use(express.json());

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
