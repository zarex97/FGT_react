import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3080 });

console.log('WebSocket server is listening on port 8080');

const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    clients.set(clientId, ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        broadcast(data, clientId);
    });

    ws.on('close', () => {
        clients.delete(clientId);
    });
});

function broadcast(data, senderId) {
    clients.forEach((client, id) => {
        if (id !== senderId) {
            client.send(JSON.stringify(data));
        }
    });
}