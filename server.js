// import http from "node:http";
// import path from "node:path";
// import express from "express";
// import { Server } from "socket.io";
// import { connectDB } from "./db/db.js";
// import Checkbox from "./db/model.checkbox.js";
// let dbState;
// const CHECKBOX_SIZE = 100;
// // const state = {
// //   checkboxes: new Array(CHECKBOX_SIZE).fill(false),
// // };
// async function initDB() {
//   let doc = await CheckboxModel.findOne();

//   if (!doc) {
//     doc = await Checkbox.create({
//       checkboxes: new Array(CHECKBOX_SIZE).fill(false),
//     });
//   }

//   dbState = doc;
// }

// async function main() {
//   const PORT = process.env.PORT || 8000;
//   const app = express();
//   const server = http.createServer(app);
//   const io = new Server();
//   io.attach(server);

//   //Socket io handelere
//   io.on("connection", (socket) => {
//     console.log("Socket Connected :-", socket.id);
//     socket.on("client:checkbox:change", (data) => {
//       console.log(`Socket ${socket.id} : checkbox:change`, data);
//       io.emit("server:checkbox:change", data);
//       dbState.checkboxes[data.index] = data.checked;
//     });
//   });

//   //express
//   app.use(express.static(path.resolve("./public")));
//   app.get("/health", (req, res) => {
//     res.json({ healthy: true });
//   });

//   app.get("/checkboxes", (req, res) => {
//     return res.json({ checkboxes: state.checkboxes });
//   });

//   server.listen(PORT, () => {
//     console.log(`Server id running on http://localhost:${PORT}`);
//   });
// }

// main();

import http from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { connectDB } from "./db/db.js";
import Checkbox from "./db/model.checkbox.js";

let dbState;
const CHECKBOX_SIZE = 100;

// ✅ init DB
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

  // ✅ connect DB FIRST
  await connectDB();

  // ✅ initialize data
  await initDB();

  const app = express();
  const server = http.createServer(app);
  const io = new Server();
  io.attach(server);

  // ✅ socket
  io.on("connection", (socket) => {
    console.log("Socket Connected :-", socket.id);

    socket.on("client:checkbox:change", async (data) => {
      console.log(`Socket ${socket.id} : checkbox:change`, data);

      // update DB
      dbState.checkboxes[data.index] = data.checked;
      await dbState.save();

      // broadcast
      io.emit("server:checkbox:change", data);
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
