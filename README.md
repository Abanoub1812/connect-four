# Connect Four - Online Multiplayer

A classic Connect Four game built with Electron.js and Socket.IO, allowing you to play with friends online. Players take turns dropping colored pieces into a grid, trying to connect four pieces of their color horizontally, vertically, or diagonally.

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Game

To start the game server:
```bash
npm start
```

This will start the server on port 3000. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Play Online

1. **Creating a Game Room:**
   - Click the "Create New Room" button
   - You'll receive a Room ID (e.g., "ABC123")
   - Share this Room ID with your friend

2. **Joining a Game Room:**
   - Your friend should enter the Room ID you shared
   - Click the "Join Room" button
   - The game will start automatically when both players are connected

3. **Playing the Game:**
   - Players take turns dropping pieces into columns
   - Player 1 uses red pieces, Player 2 uses yellow pieces
   - Click on any cell in the column where you want to place your piece
   - The first player to connect four pieces of their color in a row (horizontally, vertically, or diagonally) wins
   - If the board fills up with no winner, the game is a draw
   - Click "New Game" to start a new game at any time

## Playing Locally

If you want to play the game locally (on the same computer):
1. Open the game in two different browser windows
2. Create a room in one window
3. Join the room from the other window using the Room ID

## Features

- Modern web-based user interface
- Online multiplayer functionality
- Room-based gameplay
- Real-time updates
- Turn-based gameplay
- Win detection in all directions
- Draw detection
- Game reset functionality
- Visual feedback for current player's turn
- Cross-platform compatibility (Windows, macOS, Linux) 