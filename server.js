const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map();

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    // Join room
    if (data.room && !ws.room) {
      ws.room = data.room;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      rooms.get(ws.room).add(ws);
      return;
    }

    // NEW: If P2P fails (like on Tor), the server relays the encrypted message
    if (data.relay && rooms.has(ws.room)) {
      rooms.get(ws.room).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ relay: data.relay }));
        }
      });
      return;
    }

    // Standard signaling relay (for non-Tor users)
    if (rooms.has(ws.room)) {
      rooms.get(ws.room).forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
    }
  });
});
