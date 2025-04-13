class ConnectFour {
    constructor() {
        this.ROWS = 6;
        this.COLS = 7;
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(null));
        this.currentPlayer = 'red';
        this.gameOver = false;
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerId = null;
        this.isMyTurn = false;
        
        // DOM elements
        this.statusElement = document.getElementById('status');
        this.gameBoard = document.getElementById('gameBoard');
        this.resetButton = document.getElementById('resetButton');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomIdInput = document.getElementById('roomIdInput');
        this.roomInfo = document.getElementById('roomInfo');
        this.waitingMessage = document.getElementById('waitingMessage');
        
        // Initialize Socket.IO
        this.socket = io();
        this.setupSocketListeners();
        
        this.initializeGame();
        this.setupEventListeners();
    }
    
    initializeGame() {
        // Create game board
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.gameBoard.appendChild(cell);
            }
        }
    }
    
    setupSocketListeners() {
        // Handle room creation response
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.playerId = this.socket.id;
            this.roomInfo.textContent = `Room ID: ${this.roomId}`;
            this.waitingMessage.textContent = 'Waiting for opponent to join...';
            this.createRoomBtn.disabled = true;
            this.joinRoomBtn.disabled = true;
            this.roomIdInput.disabled = true;
        });
        
        // Handle room join response
        this.socket.on('roomJoined', (data) => {
            if (data.error) {
                alert(data.error);
                return;
            }
            
            this.roomId = this.roomIdInput.value;
            this.playerId = this.socket.id;
            this.roomInfo.textContent = `Room ID: ${this.roomId}`;
            this.waitingMessage.textContent = '';
            this.createRoomBtn.disabled = true;
            this.joinRoomBtn.disabled = true;
            this.roomIdInput.disabled = true;
        });
        
        // Handle game start
        this.socket.on('gameStart', (data) => {
            this.isMultiplayer = true;
            this.waitingMessage.textContent = '';
            this.updateStatus();
        });
        
        // Handle moves made by opponent
        this.socket.on('moveMade', (data) => {
            const { row, col, player, currentPlayer } = data;
            
            // Update the board
            this.board[row][col] = player === 0 ? 'red' : 'yellow';
            this.updateCell(row, col);
            
            // Update turn status
            this.isMyTurn = currentPlayer === this.socket.id;
            this.updateStatus();
        });
        
        // Handle game over
        this.socket.on('gameOver', (data) => {
            this.gameOver = true;
            
            if (data.draw) {
                this.statusElement.textContent = "It's a Draw!";
            } else {
                const winner = data.winner === this.socket.id ? 'You' : 'Opponent';
                this.statusElement.textContent = `${winner} Win!`;
            }
        });
        
        // Handle opponent leaving
        this.socket.on('playerLeft', () => {
            this.statusElement.textContent = 'Opponent left the game';
            this.gameOver = true;
            this.waitingMessage.textContent = 'Waiting for a new opponent...';
            this.createRoomBtn.disabled = false;
            this.joinRoomBtn.disabled = false;
            this.roomIdInput.disabled = false;
        });
    }
    
    setupEventListeners() {
        // Game board click
        this.gameBoard.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell')) {
                const col = parseInt(e.target.dataset.col);
                this.makeMove(col);
            }
        });
        
        // Reset button
        this.resetButton.addEventListener('click', () => this.resetGame());
        
        // Create room button
        this.createRoomBtn.addEventListener('click', () => {
            this.socket.emit('createRoom', (response) => {
                this.roomId = response.roomId;
                this.roomInfo.textContent = `Room ID: ${this.roomId}`;
                this.waitingMessage.textContent = 'Waiting for opponent to join...';
                this.createRoomBtn.disabled = true;
                this.joinRoomBtn.disabled = true;
                this.roomIdInput.disabled = true;
            });
        });
        
        // Join room button
        this.joinRoomBtn.addEventListener('click', () => {
            const roomId = this.roomIdInput.value.trim();
            if (!roomId) {
                alert('Please enter a room ID');
                return;
            }
            
            this.socket.emit('joinRoom', roomId, (response) => {
                if (response.error) {
                    alert(response.error);
                    return;
                }
                
                this.roomId = roomId;
                this.roomInfo.textContent = `Room ID: ${this.roomId}`;
                this.waitingMessage.textContent = '';
                this.createRoomBtn.disabled = true;
                this.joinRoomBtn.disabled = true;
                this.roomIdInput.disabled = true;
            });
        });
    }
    
    makeMove(col) {
        if (this.gameOver) return;
        
        // In multiplayer mode, only allow moves on your turn
        if (this.isMultiplayer && !this.isMyTurn) {
            return;
        }
        
        const row = this.findLowestEmptyRow(col);
        if (row === -1) return;
        
        // In multiplayer mode, send the move to the server
        if (this.isMultiplayer) {
            this.socket.emit('makeMove', { roomId: this.roomId, col });
            this.isMyTurn = false;
            return;
        }
        
        // Single player mode
        this.board[row][col] = this.currentPlayer;
        this.updateCell(row, col);
        
        if (this.checkWin(row, col)) {
            this.gameOver = true;
            this.statusElement.textContent = `Player ${this.currentPlayer === 'red' ? '1' : '2'} Wins!`;
            return;
        }
        
        if (this.checkDraw()) {
            this.gameOver = true;
            this.statusElement.textContent = "It's a Draw!";
            return;
        }
        
        this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
        this.updateStatus();
    }
    
    findLowestEmptyRow(col) {
        for (let row = this.ROWS - 1; row >= 0; row--) {
            if (this.board[row][col] === null) {
                return row;
            }
        }
        return -1;
    }
    
    updateCell(row, col) {
        const cell = this.gameBoard.children[row * this.COLS + col];
        cell.classList.add(this.board[row][col]);
    }
    
    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]],  // horizontal
            [[1, 0], [-1, 0]],  // vertical
            [[1, 1], [-1, -1]], // diagonal /
            [[1, -1], [-1, 1]]  // diagonal \
        ];
        
        return directions.some(dir => {
            const count = 1 + 
                this.countDirection(row, col, dir[0][0], dir[0][1]) +
                this.countDirection(row, col, dir[1][0], dir[1][1]);
            return count >= 4;
        });
    }
    
    countDirection(row, col, deltaRow, deltaCol) {
        let count = 0;
        let currentRow = row + deltaRow;
        let currentCol = col + deltaCol;
        
        while (
            currentRow >= 0 && currentRow < this.ROWS &&
            currentCol >= 0 && currentCol < this.COLS &&
            this.board[currentRow][currentCol] === this.currentPlayer
        ) {
            count++;
            currentRow += deltaRow;
            currentCol += deltaCol;
        }
        
        return count;
    }
    
    checkDraw() {
        return this.board[0].every(cell => cell !== null);
    }
    
    updateStatus() {
        if (this.isMultiplayer) {
            if (this.gameOver) {
                // Status already set by gameOver event
                return;
            }
            
            if (this.isMyTurn) {
                this.statusElement.textContent = "Your Turn";
            } else {
                this.statusElement.textContent = "Opponent's Turn";
            }
        } else {
            this.statusElement.textContent = `Player ${this.currentPlayer === 'red' ? '1' : '2'}'s Turn (${this.currentPlayer === 'red' ? 'Red' : 'Yellow'})`;
        }
    }
    
    resetGame() {
        this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(null));
        this.currentPlayer = 'red';
        this.gameOver = false;
        
        // Clear board
        Array.from(this.gameBoard.children).forEach(cell => {
            cell.className = 'cell';
        });
        
        // Reset multiplayer state
        if (this.isMultiplayer) {
            this.isMultiplayer = false;
            this.roomId = null;
            this.playerId = null;
            this.isMyTurn = false;
            
            // Reset UI
            this.roomInfo.textContent = '';
            this.waitingMessage.textContent = '';
            this.createRoomBtn.disabled = false;
            this.joinRoomBtn.disabled = false;
            this.roomIdInput.disabled = false;
            this.roomIdInput.value = '';
        }
        
        this.updateStatus();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new ConnectFour();
}); 