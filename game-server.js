const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

let rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('使用者已連線');

  socket.on('createRoom', (size) => {
    const roomId = Math.random().toString(36).substr(2, 9);
    const boardSize = size || 2;
    rooms[roomId] = { players: [], board: generateBoard(boardSize), currentPlayer: 0, scores: {} };
    socket.join(roomId);
    rooms[roomId].players.push(socket.id);
    rooms[roomId].scores[socket.id] = 0;
    socket.emit('roomCreated', roomId);
    socket.emit('board', rooms[roomId].board);
  });

  socket.on('joinRoom', (roomId) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].players.push(socket.id);
      rooms[roomId].scores[socket.id] = 0;
      io.to(roomId).emit('updatePlayers', rooms[roomId].players);
      socket.emit('board', rooms[roomId].board);
    } else {
      socket.emit('error', '找不到房間');
    }
  });

  socket.on('flipCard', (roomId, cardIndex) => {
    if (rooms[roomId]) {
      const room = rooms[roomId];
      const playerId = socket.id;

      if (room.currentPlayer !== room.players.indexOf(playerId)) {
        socket.emit('error', '不是你的回合');
        return;
      }

      room.flippedCards = room.flippedCards || [];

      if (room.flippedCards.length < 2) {
        room.flippedCards.push({ playerId, cardIndex });
        io.to(roomId).emit('cardFlipped', cardIndex, room.board[cardIndex]);

        if (room.flippedCards.length === 2) {
          const [firstCard, secondCard] = room.flippedCards;
          if (room.board[firstCard.cardIndex] === room.board[secondCard.cardIndex]) {
            room.scores[playerId]++;
            io.to(roomId).emit('pairFound', firstCard.cardIndex, secondCard.cardIndex, playerId);
            room.flippedCards = [];
            removeCards(room.board, firstCard.cardIndex, secondCard.cardIndex);
            if (isGameOver(room.board)) {
              io.to(roomId).emit('gameOver', room.scores);
            }
          } else {
            setTimeout(() => {
              io.to(roomId).emit('flipBack', firstCard.cardIndex, secondCard.cardIndex);
              room.flippedCards = [];
              room.currentPlayer = (room.currentPlayer + 1) % room.players.length;
              io.to(roomId).emit('nextPlayer', room.players[room.currentPlayer]);
            }, 1000);
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('使用者已斷線');
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.indexOf(socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        delete room.scores[socket.id];
        io.to(roomId).emit('updatePlayers', room.players);
        if (room.players.length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`伺服器正在執行於端口 ${PORT}`);
});

function generateBoard(size) {
  const totalCards = size * size;
  const maxNumber = 32;
  const cards = [];
  for (let i = 1; i <= totalCards / 2; i++) {
    const value = i % (maxNumber + 1);
    cards.push(value, value);
  }
  return shuffle(cards);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function removeCards(board, index1, index2) {
  board[index1] = null;
  board[index2] = null;
}

function isGameOver(board) {
  return board.every(card => card === null);
}
