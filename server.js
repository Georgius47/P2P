const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
const rooms = new Map();

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.room && !ws.room) {
      ws.room = data.room;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      
      const room = rooms.get(ws.room);
      room.add(ws);

      // Logic fix: If two people are in the room, tell the first one to start
      if (room.size === 2) {
        const clients = Array.from(room);
        clients[0].send(JSON.stringify({ role: "offerer" }));
      }
      return;
    }

    // Relay signaling data to the other peer only
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
      if (rooms.get(ws.room).size === 0) {
        rooms.delete(ws.room);
      }
    }
  });
});

console.log("✅ Signaling server running on ws://localhost:8080");
