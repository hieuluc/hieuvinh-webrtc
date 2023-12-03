const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Create a new Express application
const app = express();
// Create an HTTP server and attach it to Express
const server = http.createServer(app);
// Attach Socket.IO to the server
const io = socketIO(server);

// Serve static files (like your HTML, CSS, JS) from a directory named 'public'
app.use(express.static('public'));

// Start the server on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected with id:', socket.id);

  // Handle room creation
  socket.on('createRoom', () => {
    const roomId = generateUniqueId();
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    console.log(`Room created with ID: ${roomId}`);
  });

  // Handle joining an existing room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('userJoined', socket.id);
    console.log(`User with ID: ${socket.id} joined room: ${roomId}`);
  });

  // Handle signaling within the room
  socket.on('signal', (data) => {
    console.log('Received signal', data);
    // Forward the signal to other users in the same room
    socket.to(data.room).emit('signal', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User with id ${socket.id} disconnected`);
  });
});

// Function to generate a unique room ID
function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
