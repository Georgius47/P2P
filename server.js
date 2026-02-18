const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map();

wss.on("connection", ws => {
  ws.on("message", msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) { return; }

    if (data.room && !ws.room) {
      ws.room = data.room;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      const room = rooms.get(ws.room);
      room.add(ws);

      // Trigger the handshake when the second person arrives
      if (room.size === 2) {
        const clients = Array.from(room);
        clients[0].send(JSON.stringify({ role: "offerer" }));
      }
      return;
    }

    // Relay signaling (SDP/ICE) to the other peer
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms.has(ws.room)) {
      const room = rooms.get(ws.room);
      room.delete(ws);
      if (room.size === 0) rooms.delete(ws.room);
    }
  });
});

console.log(`✅ Server live on port ${PORT}`);
