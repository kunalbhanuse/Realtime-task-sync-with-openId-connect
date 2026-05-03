import "dotenv/config";
import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { connectDB } from "./db/db.js";
import Checkbox from "./db/model.checkbox.js";
import { publisher, subcriber } from "./redis-connection.js";
import cookieParser from "cookie-parser";
let dbState;
const CHECKBOX_SIZE = 100;
import jwt from "jsonwebtoken";

async function initDB() {
  let doc = await Checkbox.findOne();

  if (!doc) {
    doc = await Checkbox.create({
      checkboxes: new Array(CHECKBOX_SIZE).fill(false),
    });
  }

  dbState = doc;
}

async function main() {
  const PORT = process.env.PORT || 9000;

  await connectDB();

  await initDB();

  const app = express();
  app.use(cookieParser());
  const server = http.createServer(app);
  const io = new Server();
  io.attach(server);

  // -------------------------Auth------------//------------------------------------
  app.get("/login", (req, res) => {
    const param = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: "code",
      scope: "openid profile",
      state: "random_string_123",
    });
    // console.log("param-", param);
    const authParm = `http://localhost:8000/authorize?${param.toString()}`;
    // console.log("authParm -", authParm);
    res.redirect(authParm);
  });

  // calback
  app.get("/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.redirect("/"); // normal page
    }
    try {
      const response = await fetch("http://localhost:8000/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code,
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.REDIRECT_URI,
        }),
      });
      const data = await response.json();
      if (data.access_token) {
        console.log("Success! Access Token:", data.access_token);
        res.cookie("access_token", data.access_token, {
          httpOnly: true,
          secure: false,
          maxAge: 0.5 * 60 * 1000,
        });
        res.redirect("/");
      }
    } catch (error) {
      console.error("Error during token exchange:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // -------------------------------------//------------------------------------
  //Subscriber =
  await subcriber.subscribe("internal:server:chekbox:change");
  subcriber.on("message", async (channel, message) => {
    if (channel === "internal:server:chekbox:change") {
      const { index, checked } = JSON.parse(message);
      dbState.checkboxes[index] = checked;
      await dbState.save();
      io.emit("server:checkbox:change", { index, checked });
    }
  });

  io.engine.use(cookieParser());
  // ------------------mid- ---------------------
  io.use((socket, next) => {
    const token = socket.request.cookies?.access_token;

    if (!token) {
      console.log("❌ No token, blocking connection");
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("decoded:-", decoded);

      socket.user = decoded; // attach user
      next(); // ✅ allow connection
    } catch (err) {
      console.log(err);
      console.log("❌ Invalid token");
      return next(new Error("Unauthorized"));
    }
  });

  // --------------------mid---------------------
  io.on("connection", (socket) => {
    console.log("✅ Authenticated user:", socket.user);
    socket.on("client:checkbox:change", async (data) => {
      await publisher.publish(
        "internal:server:chekbox:change",
        JSON.stringify(data),
      );
    });
  });

  // express
  app.use(express.static(path.resolve("./public")));

  app.get("/health", (req, res) => {
    res.json({ healthy: true });
  });

  // ✅ FIXED API
  app.get("/checkboxes", (req, res) => {
    return res.json({ checkboxes: dbState.checkboxes });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

main();
