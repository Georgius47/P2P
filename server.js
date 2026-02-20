const WebSocket = require("ws");

const server = new WebSocket.Server({
  port: process.env.PORT
});

const rooms = {};

server.on("connection", ws => {

  ws.on("message", message => {
    const data = JSON.parse(message);

    // If first time seeing this room
    if (!rooms[data.room]) {
      rooms[data.room] = [];
    }

    // If client not already stored, add it
    if (!rooms[data.room].includes(ws)) {
      rooms[data.room].push(ws);
    }

    // If 2 users in room → tell FIRST one to create offer
    if (rooms[data.room].length === 2) {
      const firstUser = rooms[data.room][0];
      if (firstUser.readyState === WebSocket.OPEN) {
        firstUser.send(JSON.stringify({ role: "offerer" }));
      }
    }

    // Forward SDP / ICE to the other peer
    rooms[data.room].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(client => client !== ws);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
    }
  });

});

console.log("Signaling server running");
