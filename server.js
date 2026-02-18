const WebSocket = require("ws");

// Use the PORT provided by Render, or 8080 for local testing
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
const rooms = new Map();

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.room && !ws.room) {
      ws.room = data.room;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      
      const room = rooms.get(ws.room);
      room.add(ws);

      // Signaling logic: Tell the first person to start when the second joins
      if (room.size === 2) {
        const clients = Array.from(room);
        clients[0].send(JSON.stringify({ role: "offerer" }));
      }
      return;
    }

    if (rooms.has(ws.room)) {
      for (const client of rooms.get(ws.room)) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      }
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
