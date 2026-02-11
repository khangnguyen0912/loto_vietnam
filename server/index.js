import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager, TicketGenerator, TICKET_COLORS } from './gameLogic.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
const roomManager = new RoomManager();
const ticketGenerator = new TicketGenerator();

function getPlayerList(room) {
    return room.players.map(p => ({
        name: p.name,
        isHost: p.id === room.host,
        colors: p.colors,
        ticketCount: p.tickets.length || p.colors.reduce((sum, c) => {
            const slot = room.colorManager.colorSlots[c];
            const count = (slot.A === p.id ? 1 : 0) + (slot.B === p.id ? 1 : 0);
            return sum + count;
        }, 0),
    }));
}

app.get('/', (req, res) => res.send('Loto V3 🚀'));

io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.id}`);
    let currentRoomId = null;

    // ====== CREATE ROOM ======
    socket.on('create_room', ({ playerName }) => {
        const roomId = roomManager.createRoom(socket.id);
        roomManager.joinRoom(roomId, socket.id, playerName);
        currentRoomId = roomId;
        socket.join(roomId);

        const room = roomManager.getRoom(roomId);
        socket.emit('room_joined', {
            roomId,
            isHost: true,
            isSpectator: false,
            players: getPlayerList(room),
            colors: TICKET_COLORS,
            colorStatus: room.colorManager.getStatus(),
        });
        console.log(`🏠 Room ${roomId} by ${playerName}`);
    });

    // ====== JOIN ROOM ======
    socket.on('join_room', ({ roomId, playerName }) => {
        const result = roomManager.joinRoom(roomId, socket.id, playerName);
        if (!result) {
            socket.emit('error_msg', 'Phòng không tồn tại!');
            return;
        }

        currentRoomId = roomId;
        socket.join(roomId);
        const room = result.room;

        socket.emit('room_joined', {
            roomId,
            isHost: false,
            isSpectator: result.isSpectator,
            players: getPlayerList(room),
            colors: TICKET_COLORS,
            colorStatus: room.colorManager.getStatus(),
            calledNumbers: result.isSpectator ? room.game.calledNumbers : undefined,
        });

        if (!result.isSpectator) {
            socket.to(roomId).emit('player_joined', {
                players: getPlayerList(room),
                colorStatus: room.colorManager.getStatus(),
            });
        }
        console.log(`👤 ${playerName} joined ${roomId}${result.isSpectator ? ' (spectator)' : ''}`);
    });

    // ====== CLAIM COLOR ======
    socket.on('claim_color', ({ roomId, color, count }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Release previous claims for this player
        room.colorManager.releasePlayer(socket.id);
        player.colors = [];

        const result = room.colorManager.claimColor(socket.id, color, count);
        if (!result.success) {
            socket.emit('error_msg', result.error);
            // Re-send updated status
            socket.emit('color_status', { colorStatus: room.colorManager.getStatus() });
            return;
        }

        player.colors.push(color);

        io.to(roomId).emit('player_joined', {
            players: getPlayerList(room),
            colorStatus: room.colorManager.getStatus(),
        });
    });

    // ====== CLAIM SECOND COLOR (for 2 different colors) ======
    socket.on('claim_second_color', ({ roomId, color }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Claim 1 ticket of the second color
        const result = room.colorManager.claimColor(socket.id, color, 1);
        if (!result.success) {
            socket.emit('error_msg', result.error);
            socket.emit('color_status', { colorStatus: room.colorManager.getStatus() });
            return;
        }

        if (!player.colors.includes(color)) {
            player.colors.push(color);
        }

        io.to(roomId).emit('player_joined', {
            players: getPlayerList(room),
            colorStatus: room.colorManager.getStatus(),
        });
    });

    // ====== START GAME ======
    socket.on('start_game', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.host !== socket.id) {
            socket.emit('error_msg', 'Chỉ Host mới được bắt đầu!');
            return;
        }

        // Check all players have chosen colors
        const noColor = room.players.find(p => p.colors.length === 0);
        if (noColor) {
            socket.emit('error_msg', `${noColor.name} chưa chọn màu vé!`);
            return;
        }

        room.gameStarted = true;

        // Generate ticket pairs for each color that has players
        const usedColors = new Set();
        room.players.forEach(p => p.colors.forEach(c => usedColors.add(c)));

        for (const color of usedColors) {
            room.generatedPairs[color] = ticketGenerator.generatePair();
        }

        // Assign tickets to players
        room.players.forEach(player => {
            player.tickets = [];
            for (const color of player.colors) {
                const pair = room.generatedPairs[color];
                const slot = room.colorManager.colorSlots[color];
                if (slot.A === player.id) player.tickets.push({ data: pair[0], color });
                if (slot.B === player.id) player.tickets.push({ data: pair[1], color });
            }

            io.to(player.id).emit('game_started', {
                tickets: player.tickets,
            });
        });

        // Spectators
        room.spectators.forEach(spec => {
            io.to(spec.id).emit('game_started_spectator', {});
        });

        // Start calling numbers
        room.game.startGame((num) => {
            if (num === null) {
                io.to(roomId).emit('game_ended', { reason: 'Hết số!' });
                return;
            }
            io.to(roomId).emit('number_called', num);

            // Check each player if KINH button should enable
            room.players.forEach(player => {
                const ticketDatas = player.tickets.map(t => t.data);
                const canWin = room.game.hasCompleteRow(ticketDatas);
                io.to(player.id).emit('kinh_status', { canKinh: canWin });
            });
        });

        console.log(`🎮 Game started in ${roomId}`);
    });

    // ====== CHECK WIN (KINH) ======
    socket.on('check_win', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        const ticketDatas = player.tickets.map(t => t.data);
        const result = room.game.checkWin(ticketDatas);

        if (result.isWin) {
            player.isWinner = true;
            room.game.stopGame();

            const prizes = roomManager.calculatePrize(room);

            // Immediately announce
            io.to(roomId).emit('game_over', {
                winnerName: player.name,
                type: result.type,
                winningRow: result.winningRow,
                prizes,
            });

            // After 5 seconds, read the winning numbers for verification
            setTimeout(() => {
                io.to(roomId).emit('verify_kinh', {
                    winnerName: player.name,
                    winningRow: result.winningRow,
                });
            }, 5000);

            console.log(`🏆 ${player.name} KINH in ${roomId}! Row: ${result.winningRow}`);
        } else {
            socket.emit('error_msg', 'Chưa đủ điều kiện Kinh! Kiểm tra lại nhé.');
        }
    });

    // ====== DISCONNECT ======
    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        if (currentRoomId) {
            const room = roomManager.getRoom(currentRoomId);
            if (room) {
                roomManager.removePlayer(currentRoomId, socket.id);
                const updated = roomManager.getRoom(currentRoomId);
                if (updated) {
                    io.to(currentRoomId).emit('player_joined', {
                        players: getPlayerList(updated),
                        colorStatus: updated.colorManager.getStatus(),
                    });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`🚀 Loto V3 Server on port ${PORT}`));
