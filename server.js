const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const { room } = data;
    if (!room) return;

    // First time joining
    if (!ws.room) {
      ws.room = room;

      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }

      const peers = rooms.get(room);

      // Limit to 2 peers only
      if (peers.size >= 2) {
        ws.close();
        return;
      }

      peers.add(ws);

      // First peer becomes offerer
      if (peers.size === 1) {
        ws.send(JSON.stringify({ role: "offerer" }));
      }

      return;
    }

    // Relay signaling data to other peer
    const peers = rooms.get(ws.room);
    if (!peers) return;

    for (const client of peers) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  });

  ws.on("close", () => {
    if (!ws.room) return;

    const peers = rooms.get(ws.room);
    if (!peers) return;

    peers.delete(ws);

    if (peers.size === 0) {
      rooms.delete(ws.room);
    }
  });
});

console.log(`✅ Signaling server running on port ${PORT}`);
