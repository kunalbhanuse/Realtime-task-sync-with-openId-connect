import http from "node:http";
import path from "node:path";

import express from "express";
import { Server } from "socket.io";

const CHECKBOX_SIZE = 100;
const state = {
  checkboxes: new Array(CHECKBOX_SIZE).fill(false),
};

async function main() {
  const PORT = process.env.PORT || 8000;
  const app = express();
  const server = http.createServer(app);
  const io = new Server();
  io.attach(server);

  //Socket io handelere
  io.on("connection", (socket) => {
    console.log("Socket Connected :-", socket.id);
    socket.on("client:checkbox:change", (data) => {
      console.log(`Socket ${socket.id} : checkbox:change`, data);
      io.emit("server:checkbox:change", data);
      state.checkboxes[data.index] = data.checked;
    });
  });

  //express
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.json({ healthy: true });
  });

  app.get("/checkboxes", (req, res) => {
    return res.json({ checkboxes: state.checkboxes });
  });

  server.listen(PORT, () => {
    console.log(`Server id running on http://localhost:${PORT}`);
  });
}

main();
