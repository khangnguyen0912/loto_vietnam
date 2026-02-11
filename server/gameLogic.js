// ========== 7 TICKET COLORS ==========
export const TICKET_COLORS = {
    red: { name: 'Đỏ', bg: '#FFE0E0', border: '#DC2626', cell: '#FFC2C2', empty: '#FFAAAA' },
    orange: { name: 'Cam', bg: '#FFECD2', border: '#EA580C', cell: '#FFD4A8', empty: '#FFB87A' },
    yellow: { name: 'Vàng', bg: '#FFF9C4', border: '#CA8A04', cell: '#FFF3A0', empty: '#FFE66D' },
    blue: { name: 'Xanh dương', bg: '#DBEAFE', border: '#2563EB', cell: '#B6D4FE', empty: '#93BBFD' },
    green: { name: 'Xanh lá', bg: '#DCFCE7', border: '#16A34A', cell: '#BBF7D0', empty: '#86EFAC' },
    purple: { name: 'Tím', bg: '#EDE9FE', border: '#7C3AED', cell: '#DDD6FE', empty: '#C4B5FD' },
    pink: { name: 'Hồng', bg: '#FCE7F3', border: '#DB2777', cell: '#FBCFE8', empty: '#F9A8D4' },
};

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Column ranges: 9 columns, each decade 1-10, 11-20, ..., 81-90
function getColumnRange(col) {
    const min = col * 10 + 1;
    const max = Math.min((col + 1) * 10, 90);
    const nums = [];
    for (let n = min; n <= max; n++) nums.push(n);
    return nums;
}

// ========== PLACEMENT MATRIX ==========
// Generate a 9x9 binary matrix where each row and each col has exactly 5 ones.
// Uses 5 disjoint perfect matchings from cyclic construction.
function generatePlacementMatrix() {
    const matrix = Array.from({ length: 9 }, () => Array(9).fill(0));

    // 9 disjoint matchings: matching k maps row i -> col (i+k) % 9
    // Pick 5 random offsets from [0..8]
    const offsets = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5);

    for (const offset of offsets) {
        for (let row = 0; row < 9; row++) {
            const col = (row + offset) % 9;
            matrix[row][col] = 1;
        }
    }

    return matrix;
}

// ========== TICKET GENERATOR ==========
export class TicketGenerator {
    // Generate a PAIR of same-color tickets
    // Each column's 10 numbers are split 5/5 randomly
    generatePair() {
        const poolA = [];
        const poolB = [];

        for (let col = 0; col < 9; col++) {
            const range = shuffle(getColumnRange(col));
            poolA.push(range.slice(0, 5));
            poolB.push(range.slice(5));
        }

        const placementA = generatePlacementMatrix();
        const placementB = generatePlacementMatrix();

        const ticketA = this._buildTicket(poolA, placementA);
        const ticketB = this._buildTicket(poolB, placementB);

        return [ticketA, ticketB];
    }

    // Generate a single ticket (not paired)
    generateSingle() {
        const pool = [];
        for (let col = 0; col < 9; col++) {
            const range = shuffle(getColumnRange(col));
            pool.push(range.slice(0, 5));
        }
        const placement = generatePlacementMatrix();
        return this._buildTicket(pool, placement);
    }

    // Build a 9x9 ticket grid
    // pool[col] = array of 5 numbers for that column
    // placement[row][col] = 1 if number should be placed, 0 for colored empty
    _buildTicket(pool, placement) {
        const ticket = Array.from({ length: 9 }, () => Array(9).fill(0));

        for (let col = 0; col < 9; col++) {
            // Sort numbers ascending for the column
            const nums = [...pool[col]].sort((a, b) => a - b);
            let idx = 0;
            for (let row = 0; row < 9; row++) {
                if (placement[row][col] === 1 && idx < nums.length) {
                    ticket[row][col] = nums[idx++];
                }
            }
        }

        return ticket;
    }
}

// ========== GAME ENGINE ==========
export class GameEngine {
    constructor(id) {
        this.id = id;
        this.numbers = Array.from({ length: 90 }, (_, i) => i + 1);
        this.calledNumbers = [];
        this.isPlaying = false;
        this.intervalId = null;
        this.speed = 5000; // 5 seconds
    }

    startGame(callback) {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.numbers = shuffle(this.numbers);

        this.intervalId = setInterval(() => {
            if (this.numbers.length === 0) {
                this.stopGame();
                callback(null);
                return;
            }
            const num = this.numbers.shift();
            this.calledNumbers.push(num);
            callback(num);
        }, this.speed);
    }

    stopGame() {
        this.isPlaying = false;
        if (this.intervalId) clearInterval(this.intervalId);
    }

    // Check if any row on any ticket has all numbers called (KINH)
    checkWin(tickets) {
        for (const ticket of tickets) {
            for (let r = 0; r < ticket.length; r++) {
                const rowNums = ticket[r].filter(n => n !== 0);
                if (rowNums.length > 0 && rowNums.length <= 5 &&
                    rowNums.every(n => this.calledNumbers.includes(n))) {
                    return { isWin: true, type: 'Kinh', winningRow: rowNums };
                }
            }
        }
        return { isWin: false };
    }

    // Check if KINH button should be enabled
    hasCompleteRow(tickets) {
        for (const ticket of tickets) {
            for (let r = 0; r < ticket.length; r++) {
                const rowNums = ticket[r].filter(n => n !== 0);
                if (rowNums.length > 0 && rowNums.length <= 5 &&
                    rowNums.every(n => this.calledNumbers.includes(n))) {
                    return true;
                }
            }
        }
        return false;
    }
}

// ========== COLOR SLOT MANAGER ==========
export class ColorSlotManager {
    constructor() {
        this.colorSlots = {};
        for (const color of Object.keys(TICKET_COLORS)) {
            this.colorSlots[color] = { A: null, B: null };
        }
    }

    claimColor(playerId, color, count) {
        const slot = this.colorSlots[color];
        if (count === 2) {
            if (slot.A !== null || slot.B !== null) {
                return { success: false, error: `Màu ${TICKET_COLORS[color].name} đã có người chọn!` };
            }
            slot.A = playerId;
            slot.B = playerId;
            return { success: true, slots: ['A', 'B'], color };
        } else {
            if (slot.A === null) {
                slot.A = playerId;
                return { success: true, slots: ['A'], color };
            } else if (slot.B === null) {
                slot.B = playerId;
                return { success: true, slots: ['B'], color };
            } else {
                return { success: false, error: `Màu ${TICKET_COLORS[color].name} đã đủ người!` };
            }
        }
    }

    releasePlayer(playerId) {
        for (const color of Object.keys(this.colorSlots)) {
            const slot = this.colorSlots[color];
            if (slot.A === playerId) slot.A = null;
            if (slot.B === playerId) slot.B = null;
        }
    }

    getStatus() {
        const status = {};
        for (const [color, slot] of Object.entries(this.colorSlots)) {
            status[color] = {
                available: (slot.A === null ? 1 : 0) + (slot.B === null ? 1 : 0),
                full: slot.A !== null && slot.B !== null,
                samePlayer: slot.A !== null && slot.A === slot.B,
            };
        }
        return status;
    }
}

// ========== ROOM MANAGER ==========
export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(hostId) {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const game = new GameEngine(roomId);
        const colorManager = new ColorSlotManager();

        this.rooms.set(roomId, {
            id: roomId,
            host: hostId,
            players: [],
            spectators: [],
            game,
            colorManager,
            gameStarted: false,
            generatedPairs: {},
        });
        return roomId;
    }

    joinRoom(roomId, playerId, playerName) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (room.gameStarted) {
            room.spectators.push({ id: playerId, name: playerName });
            return { room, isSpectator: true };
        }

        room.players.push({
            id: playerId,
            name: playerName,
            colors: [],
            tickets: [],
            isWinner: false,
        });
        return { room, isSpectator: false };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    removePlayer(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.colorManager.releasePlayer(playerId);
        room.players = room.players.filter(p => p.id !== playerId);
        room.spectators = room.spectators.filter(s => s.id !== playerId);
        if (room.players.length === 0 && room.host === playerId) {
            this.rooms.delete(roomId);
        }
    }

    calculatePrize(room) {
        const ticketPrice = 5000;
        const winners = room.players.filter(p => p.isWinner);
        const losers = room.players.filter(p => !p.isWinner);
        if (winners.length === 0) return null;

        const totalLoserBet = losers.reduce((sum, p) => sum + ticketPrice * p.tickets.length, 0);
        const prizePerWinner = Math.floor(totalLoserBet / winners.length);

        return {
            winners: winners.map(w => ({ name: w.name, prize: prizePerWinner })),
            losers: losers.map(l => ({ name: l.name, loss: ticketPrice * l.tickets.length })),
            totalPot: totalLoserBet,
        };
    }
}
