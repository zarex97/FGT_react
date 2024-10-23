import { WebSocketServer } from 'ws';
import http from 'http';

// Create an HTTP server
const server = http.createServer();

// Create WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

console.log('WebSocket server is listening on port 8080');

const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    clients.set(clientId, ws);
    
    console.log(`Client ${clientId} connected`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            broadcast(data, clientId);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected`);
    });
});

function broadcast(data, senderId) {
    clients.forEach((client, id) => {
        if (id !== senderId && client.readyState === client.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (error) {
                console.error(`Failed to send to client ${id}:`, error);
            }
        }
    });
}

// Start server
server.listen(3060);