import "dotenv/config";
import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { connectDB } from "./db/db.js";
import Checkbox from "./db/model.checkbox.js";
import { publisher, subcriber } from "./redis-connection.js";
let dbState;
const CHECKBOX_SIZE = 100;

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
  const PORT = process.env.PORT || 8000;

  await connectDB();

  await initDB();

  const app = express();
  const server = http.createServer(app);
  const io = new Server();
  io.attach(server);

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

  io.on("connection", (socket) => {
    console.log("Socket Connected :-", socket.id);

    socket.on("client:checkbox:change", async (data) => {
      console.log(`Socket ${socket.id} : checkbox:change`, data);

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
