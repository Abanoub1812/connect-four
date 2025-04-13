const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game rooms
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Handle room creation
    socket.on('createRoom', (callback) => {
        const roomId = generateRoomId();
        rooms.set(roomId, {
            players: [socket.id],
            currentPlayer: socket.id,
            board: Array(6).fill().map(() => Array(7).fill(null)),
            gameStarted: false
        });
        
        socket.join(roomId);
        console.log(`Room created: ${roomId} by player ${socket.id}`);
        callback({ roomId });
    });
    
    // Handle room joining
    socket.on('joinRoom', (roomId, callback) => {
        const room = rooms.get(roomId);
        
        if (!room) {
            console.log(`Room ${roomId} not found`);
            callback({ error: 'Room not found' });
            return;
        }
        
        if (room.players.length >= 2) {
            console.log(`Room ${roomId} is full`);
            callback({ error: 'Room is full' });
            return;
        }
        
        room.players.push(socket.id);
        socket.join(roomId);
        room.gameStarted = true;
        
        console.log(`Player ${socket.id} joined room ${roomId}`);
        callback({ success: true });
        
        // Notify both players that the game has started
        io.to(roomId).emit('gameStart', {
            currentPlayer: room.currentPlayer
        });
    });
    
    // Handle moves
    socket.on('makeMove', ({ roomId, col }) => {
        const room = rooms.get(roomId);
        
        if (!room) {
            console.log(`Room ${roomId} not found for move`);
            return;
        }
        
        if (!room.gameStarted) {
            console.log(`Game not started in room ${roomId}`);
            return;
        }
        
        if (room.currentPlayer !== socket.id) {
            console.log(`Not ${socket.id}'s turn in room ${roomId}`);
            return;
        }
        
        // Find the lowest empty row in the selected column
        const row = findLowestEmptyRow(room.board, col);
        
        if (row === -1) {
            console.log(`Column ${col} is full in room ${roomId}`);
            return;
        }
        
        // Make the move
        const playerIndex = room.players.indexOf(socket.id);
        room.board[row][col] = playerIndex;
        
        console.log(`Move made in room ${roomId}: row=${row}, col=${col}, player=${playerIndex}`);
        
        // Check for win
        if (checkWin(room.board, row, col)) {
            console.log(`Player ${socket.id} won in room ${roomId}`);
            io.to(roomId).emit('gameOver', { winner: socket.id });
            rooms.delete(roomId);
            return;
        }
        
        // Check for draw
        if (checkDraw(room.board)) {
            console.log(`Game draw in room ${roomId}`);
            io.to(roomId).emit('gameOver', { draw: true });
            rooms.delete(roomId);
            return;
        }
        
        // Switch turns
        room.currentPlayer = room.players.find(id => id !== socket.id);
        
        // Broadcast the move to all players in the room
        io.to(roomId).emit('moveMade', {
            row,
            col,
            player: playerIndex,
            currentPlayer: room.currentPlayer
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        // Find and clean up rooms where this player was participating
        for (const [roomId, room] of rooms.entries()) {
            if (room.players.includes(socket.id)) {
                console.log(`Player ${socket.id} left room ${roomId}`);
                io.to(roomId).emit('playerLeft');
                rooms.delete(roomId);
                break;
            }
        }
    });
});

// Helper functions
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function findLowestEmptyRow(board, col) {
    for (let row = board.length - 1; row >= 0; row--) {
        if (board[row][col] === null) {
            return row;
        }
    }
    return -1;
}

function checkWin(board, row, col) {
    const directions = [
        [[0, 1], [0, -1]],  // horizontal
        [[1, 0], [-1, 0]],  // vertical
        [[1, 1], [-1, -1]], // diagonal /
        [[1, -1], [-1, 1]]  // diagonal \
    ];
    
    const player = board[row][col];
    
    return directions.some(dir => {
        const count = 1 + 
            countDirection(board, row, col, dir[0][0], dir[0][1], player) +
            countDirection(board, row, col, dir[1][0], dir[1][1], player);
        return count >= 4;
    });
}

function countDirection(board, row, col, deltaRow, deltaCol, player) {
    let count = 0;
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;
    
    while (
        currentRow >= 0 && currentRow < board.length &&
        currentCol >= 0 && currentCol < board[0].length &&
        board[currentRow][currentCol] === player
    ) {
        count++;
        currentRow += deltaRow;
        currentCol += deltaCol;
    }
    
    return count;
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