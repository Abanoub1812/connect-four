const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Game rooms
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle room creation
    socket.on('createRoom', (callback) => {
        const roomId = generateRoomId();
        rooms.set(roomId, {
            players: [socket.id],
            board: Array(6).fill().map(() => Array(7).fill(null)),
            currentPlayer: 0,
            gameOver: false
        });
        socket.join(roomId);
        callback({ roomId });
    });
    
    // Handle joining a room
    socket.on('joinRoom', (roomId, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            callback({ error: 'Room not found' });
            return;
        }
        
        if (room.players.length >= 2) {
            callback({ error: 'Room is full' });
            return;
        }
        
        room.players.push(socket.id);
        socket.join(roomId);
        callback({ success: true });
        
        // Notify both players that the game can start
        io.to(roomId).emit('gameStart', {
            players: room.players,
            currentPlayer: room.players[room.currentPlayer]
        });
    });
    
    // Handle game moves
    socket.on('makeMove', (data) => {
        const { roomId, col } = data;
        const room = rooms.get(roomId);
        
        if (!room || room.gameOver) return;
        
        // Check if it's the player's turn
        const playerIndex = room.players.indexOf(socket.id);
        if (playerIndex !== room.currentPlayer) return;
        
        // Find the lowest empty row in the selected column
        const row = findLowestEmptyRow(room.board, col);
        if (row === -1) return;
        
        // Make the move
        room.board[row][col] = playerIndex;
        
        // Check for win
        if (checkWin(room.board, row, col, playerIndex)) {
            room.gameOver = true;
            io.to(roomId).emit('gameOver', {
                winner: socket.id,
                board: room.board
            });
            return;
        }
        
        // Check for draw
        if (checkDraw(room.board)) {
            room.gameOver = true;
            io.to(roomId).emit('gameOver', {
                draw: true,
                board: room.board
            });
            return;
        }
        
        // Switch turns
        room.currentPlayer = (room.currentPlayer + 1) % 2;
        
        // Broadcast the move to all players in the room
        io.to(roomId).emit('moveMade', {
            row,
            col,
            player: playerIndex,
            currentPlayer: room.players[room.currentPlayer]
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find and clean up rooms where this player was
        for (const [roomId, room] of rooms.entries()) {
            const playerIndex = room.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('playerLeft');
                }
            }
        }
    });
});

// Helper functions
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function findLowestEmptyRow(board, col) {
    for (let row = 5; row >= 0; row--) {
        if (board[row][col] === null) {
            return row;
        }
    }
    return -1;
}

function checkWin(board, row, col, player) {
    // Check horizontal
    let count = 1;
    for (let i = col - 1; i >= 0 && board[row][i] === player; i--) count++;
    for (let i = col + 1; i < 7 && board[row][i] === player; i++) count++;
    if (count >= 4) return true;
    
    // Check vertical
    count = 1;
    for (let i = row - 1; i >= 0 && board[i][col] === player; i--) count++;
    for (let i = row + 1; i < 6 && board[i][col] === player; i++) count++;
    if (count >= 4) return true;
    
    // Check diagonal (top-left to bottom-right)
    count = 1;
    for (let i = 1; row - i >= 0 && col - i >= 0 && board[row-i][col-i] === player; i++) count++;
    for (let i = 1; row + i < 6 && col + i < 7 && board[row+i][col+i] === player; i++) count++;
    if (count >= 4) return true;
    
    // Check diagonal (top-right to bottom-left)
    count = 1;
    for (let i = 1; row - i >= 0 && col + i < 7 && board[row-i][col+i] === player; i++) count++;
    for (let i = 1; row + i < 6 && col - i >= 0 && board[row+i][col-i] === player; i++) count++;
    if (count >= 4) return true;
    
    return false;
}

function checkDraw(board) {
    return board[0].every(cell => cell !== null);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to play`);
}); 