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
    socket.on('shoot', (data) => {
      for (let playerId in players) {
        if (playerId !== socket.id) {
          if (checkCollision(data, players[playerId])) {
            // Обрабатываем попадание
            players[playerId].hp -= 10;

            // Отправляем информацию о попадании другим игрокам
            io.emit('hit', { id: playerId, hp: players[playerId].hp});

            // Если у игрока закончились HP, уведомляем об этом
            if (players[playerId].hp <= 0) {
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

function checkCollision(bullet, player) {
    let hit = false;
    if ((bullet.rotate == 0) && Math.abs(bullet.y - player.y) < 20 && (bullet.x < player.x)) {
      hit = true;
    } else if ((bullet.rotate == 180) && Math.abs(bullet.y - player.y) < 20 && (bullet.x > player.x)) {
      hit = true;
    } else if ((bullet.rotate == 270) && Math.abs(bullet.x - player.x) < 20 && (bullet.y > player.y)) {
      hit = true;
    } else if ((bullet.rotate == 90) && Math.abs(bullet.x - player.x) < 20 && (bullet.y < player.y)) {
      hit = true;
    }

    return hit;
}

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});