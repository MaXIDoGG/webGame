const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const players = {};
const bullets = {};

io.on('connection', (socket) => {
  // Событие, которое срабатывает при подключении нового игрока
  socket.on('join', (playerName) => {
    players[socket.id] = {
      id: socket.id,
      name: playerName,
      hp: 100,
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      rotate: 0
    };

    // Отправляем информацию о других игроках текущему игроку
    socket.emit('players', players);

    // Отправляем информацию о новом игроке другим игрокам
    socket.broadcast.emit('newPlayer', players[socket.id]);

    console.log(`${playerName} joined the game`);

    // Событие, которое срабатывает при движении корабля
    socket.on('move', (data) => {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].rotate = data.rotate;

      // Отправляем новые координаты текущего игрока всем остальным игрокам
      socket.broadcast.emit('move', { id: socket.id, x: data.x, y: data.y, rotate: data.rotate });
    });


    // Событие, которое срабатывает при выстреле
    socket.on('shoot', () => {
      // Обрабатываем попадание
      for (const playerId in players) {
        if (playerId !== socket.id) {
          const player = players[playerId];
          if (
            players[socket.id].x < player.x + 20 &&
            players[socket.id].x + 20 > player.x &&
            players[socket.id].y < player.y + 20 &&
            players[socket.id].y + 20 > player.y
          ) {
            player.hp -= 10;

            // Отправляем информацию о попадании другим игрокам
            io.emit('hit', { id: playerId, hp: player.hp });

            // Если у игрока закончились HP, уведомляем об этом
            if (player.hp <= 0) {
              delete players[playerId];
              io.emit('playerDied', playerId);
            }
          }
        }
      }
    });

    // Событие, которое срабатывает при отключении игрока
    socket.on('disconnect', () => {
      delete players[socket.id];

      // Отправляем информацию об отключившемся игроке
      io.emit('playerDisconnected', socket.id);

      console.log(`${playerName} left the game`);
    });
  });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});