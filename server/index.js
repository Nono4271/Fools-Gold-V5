import { WebSocketServer } from 'ws';

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`Server running on ws://localhost:${PORT}`);

wss.on('connection', (socket) => {
console.log('Client connected');

socket.on('message', (data) => {
const msg = JSON.parse(data);
console.log('Received:', msg);
socket.send(JSON.stringify({ type: 'ack', received: msg.type }));
});

socket.on('close', () => console.log('Client disconnected'));
});
