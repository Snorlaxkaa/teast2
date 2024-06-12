const socket = io();
let roomId;
let playerId;

function createRoom() {
  const size = document.getElementById('board-size').value;
  socket.emit('createRoom', size);
}

socket.on('roomCreated', (id) => {
  roomId = id;
  document.getElementById('room-id').value = roomId;
  document.getElementById('game').style.display = 'block';
});

function joinRoom() {
  roomId = document.getElementById('room-id').value;
  socket.emit('joinRoom', roomId);
  document.getElementById('game').style.display = 'block';
}

socket.on('updatePlayers', (players) => {
  const playersList = document.getElementById('players');
  playersList.innerHTML = '';
  players.forEach((player) => {
    const playerItem = document.createElement('li');
    playerItem.textContent = player;
    playersList.appendChild(playerItem);
  });
});

function flipCard(index) {
  socket.emit('flipCard', roomId, index);
}

socket.on('cardFlipped', (index, value) => {
  const card = document.getElementById(`card-${index}`);
  card.classList.add('flipped');
  card.textContent = value;
});

socket.on('pairFound', (index1, index2, player) => {
  const card1 = document.getElementById(`card-${index1}`);
  const card2 = document.getElementById(`card-${index2}`);
  card1.classList.add('removed');
  card2.classList.add('removed');
  if (player === playerId) {
    alert('你找到了一對牌!');
  }
});

socket.on('flipBack', (index1, index2) => {
  const card1 = document.getElementById(`card-${index1}`);
  const card2 = document.getElementById(`card-${index2}`);
  setTimeout(() => {
    card1.classList.remove('flipped');
    card1.textContent = '';
    card2.classList.remove('flipped');
    card2.textContent = '';
  }, 500);
});

socket.on('nextPlayer', (nextPlayer) => {
  if (nextPlayer === playerId) {
    alert('輪到你了!');
  }
});

socket.on('gameOver', (scores) => {
  alert('遊戲結束! 最終得分: ' + JSON.stringify(scores));
});

// 初始化棋盤
function initializeBoard(board) {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  const boardSize = Math.sqrt(board.length);
  boardElement.style.width = `${60 * boardSize + 5 * (boardSize - 1)}px`;
  board.forEach((value, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${index}`;
    card.dataset.value = value;
    card.onclick = () => flipCard(index);
    boardElement.appendChild(card);
  });
}

socket.on('board', (board) => {
  initializeBoard(board);
});
