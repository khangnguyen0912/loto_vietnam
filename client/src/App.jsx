import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import Ticket from './components/Ticket';
import Board from './components/Board';

const socket = io('http://localhost:3000', { autoConnect: false });

const COLOR_OPTIONS = [
  { id: 'red', name: 'Đỏ', hex: '#DC2626' },
  { id: 'orange', name: 'Cam', hex: '#EA580C' },
  { id: 'yellow', name: 'Vàng', hex: '#CA8A04' },
  { id: 'blue', name: 'Xanh dương', hex: '#2563EB' },
  { id: 'green', name: 'Xanh lá', hex: '#16A34A' },
  { id: 'purple', name: 'Tím', hex: '#7C3AED' },
  { id: 'pink', name: 'Hồng', hex: '#DB2777' },
];

function App() {
  const [view, setView] = useState('lobby');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [players, setPlayers] = useState([]);

  // Color/ticket selection
  const [selectedColors, setSelectedColors] = useState([]); // max 2
  const [ticketCount, setTicketCount] = useState(1); // only for single color mode
  const [colorStatus, setColorStatus] = useState({}); // availability

  // Game state
  const [tickets, setTickets] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState([]);
  const [currentNumber, setCurrentNumber] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [canKinh, setCanKinh] = useState(false);
  const [winner, setWinner] = useState(null);
  const [prizes, setPrizes] = useState(null);
  const [verifyRow, setVerifyRow] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill room from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) setRoomId(roomParam.toUpperCase());
  }, []);

  useEffect(() => {
    socket.on('room_joined', (data) => {
      setRoomId(data.roomId);
      setIsHost(data.isHost);
      setIsSpectator(data.isSpectator);
      setPlayers(data.players || []);
      if (data.colorStatus) setColorStatus(data.colorStatus);
      if (data.calledNumbers) setCalledNumbers(data.calledNumbers);
      setView(data.isSpectator ? 'game' : 'waiting');
    });

    socket.on('player_joined', (data) => {
      setPlayers(data.players || []);
      if (data.colorStatus) setColorStatus(data.colorStatus);
    });

    socket.on('color_status', ({ colorStatus: cs }) => {
      setColorStatus(cs);
    });

    socket.on('game_started', ({ tickets: t }) => {
      setTickets(t);
      setView('game');
      setMarkedNumbers([]);
      setCalledNumbers([]);
      setCurrentNumber(null);
      setWinner(null);
      setPrizes(null);
      setCanKinh(false);
      setVerifyRow(null);
    });

    socket.on('game_started_spectator', () => {
      setView('game');
    });

    // Southern VN voice
    const speakNumber = useCallback((num) => {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(num.toString());
      u.lang = 'vi-VN';
      u.rate = 0.85;
      u.pitch = 1.0;
      u.onend = () => {
        setCalledNumbers(prev => [...prev, num]);
      };
      window.speechSynthesis.speak(u);
    }, []);

    // ... connect, createRoom ...

    socket.on('number_called', (num) => {
      setCurrentNumber(num);
      // setCalledNumbers is now called after speech ends
      speakNumber(num);
    });

    socket.on('kinh_status', ({ canKinh: ck }) => {
      setCanKinh(ck);
    });

    socket.on('game_over', ({ winnerName, type, winningRow, prizes: p }) => {
      setWinner({ name: winnerName, type, winningRow });
      setPrizes(p);
    });

    socket.on('verify_kinh', ({ winnerName, winningRow }) => {
      setVerifyRow(winningRow);
      // Speak the winning numbers
      speakVerify(winnerName, winningRow);
    });

    socket.on('game_ended', ({ reason }) => {
      alert(reason);
    });

    socket.on('error_msg', (msg) => alert(msg));

    return () => {
      ['room_joined', 'player_joined', 'color_status', 'game_started',
        'game_started_spectator', 'number_called', 'kinh_status',
        'game_over', 'verify_kinh', 'game_ended', 'error_msg'
      ].forEach(e => socket.off(e));
    };
  }, []);

  // Southern VN voice
  const speakNumber = useCallback((num) => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(num.toString());
    u.lang = 'vi-VN';
    u.rate = 0.85;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }, []);

  const speakVerify = useCallback((name, row) => {
    if (!('speechSynthesis' in window)) return;
    const text = `Kiểm tra, ${name} kinh. Các số: ${row.join(', ')}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }, []);

  const connect = () => { if (!socket.connected) socket.connect(); };

  const createRoom = () => {
    if (!playerName.trim()) return alert('Nhập tên đi!');
    connect();
    socket.emit('create_room', { playerName });
  };

  const joinRoom = () => {
    if (!playerName.trim()) return alert('Nhập tên đi!');
    if (!roomId.trim()) return alert('Nhập mã phòng!');
    connect();
    socket.emit('join_room', { roomId, playerName });
  };

  const handleColorSelect = (colorId) => {
    if (selectedColors.length === 0) {
      // First color
      setSelectedColors([colorId]);
      setTicketCount(1);
    } else if (selectedColors.length === 1) {
      if (selectedColors[0] === colorId) {
        // Deselect
        setSelectedColors([]);
        setTicketCount(1);
      } else {
        // Second different color
        setSelectedColors([selectedColors[0], colorId]);
      }
    } else {
      // Already 2, clicking replaces
      if (selectedColors.includes(colorId)) {
        setSelectedColors(selectedColors.filter(c => c !== colorId));
      } else {
        setSelectedColors([selectedColors[0], colorId]);
      }
    }
  };

  const confirmColors = () => {
    if (selectedColors.length === 0) return alert('Chọn ít nhất 1 màu!');

    if (selectedColors.length === 1) {
      // Single color: claim with ticket count (1 or 2)
      socket.emit('claim_color', {
        roomId,
        color: selectedColors[0],
        count: ticketCount,
      });
    } else {
      // Two colors: claim 1 ticket of each
      socket.emit('claim_color', {
        roomId,
        color: selectedColors[0],
        count: 1,
      });
      setTimeout(() => {
        socket.emit('claim_second_color', {
          roomId,
          color: selectedColors[1],
        });
      }, 100);
    }
  };

  const startGame = () => socket.emit('start_game', { roomId });

  const handleNumberClick = (num) => {
    setMarkedNumbers(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const checkWin = () => socket.emit('check_win', { roomId });

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalCost = selectedColors.length === 2 ? 10000 :
    (selectedColors.length === 1 ? ticketCount * 5000 : 0);

  const bgStyle = {
    backgroundImage: 'url(/images/loto_background.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
  };

  // ============ LOBBY ============
  if (view === 'lobby') {
    return (
      <div className="flex items-center justify-center p-4" style={bgStyle}>
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-black text-center text-red-700 mb-1">🎲 LÔ TÔ ONLINE</h1>
          <p className="text-center text-gray-500 text-sm mb-6">Chơi cùng bạn bè, bất cứ đâu!</p>

          <div className="space-y-3">
            <input type="text" placeholder="Tên của bạn"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none text-lg"
              value={playerName} onChange={e => setPlayerName(e.target.value)} />

            <button onClick={createRoom}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition shadow-lg text-lg">
              🏠 Tạo Phòng Mới
            </button>

            <div className="flex items-center py-1">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="mx-4 text-gray-400 text-sm">hoặc vào phòng</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="flex gap-2">
              <input type="text" placeholder="Mã phòng"
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl uppercase text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-red-400 outline-none"
                value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} />
              <button onClick={joinRoom}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition text-lg">
                Vào
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ WAITING ROOM ============
  if (view === 'waiting') {
    return (
      <div className="flex items-center justify-center p-4" style={bgStyle}>
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl w-full max-w-lg">
          <h2 className="text-xl font-bold text-center text-gray-800 mb-3">Phòng chơi</h2>

          {/* Room Code + Copy Link */}
          <div className="bg-gray-50 p-4 rounded-xl mb-4 text-center">
            <p className="text-xs text-gray-500">Mã phòng</p>
            <p className="text-3xl font-black text-red-600 tracking-widest">{roomId}</p>
            <button onClick={copyLink}
              className="mt-2 inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-blue-200 transition">
              {copied ? '✅ Đã copy!' : '📋 Copy link mời bạn bè'}
            </button>
          </div>

          {/* Color Selection */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">🎨 Chọn màu vé <span className="text-gray-400 font-normal">(tối đa 2 màu)</span></p>
            <div className="flex gap-2 flex-wrap justify-center">
              {COLOR_OPTIONS.map(c => {
                const status = colorStatus[c.id];
                const isSelected = selectedColors.includes(c.id);
                const isFull = status?.full && !isSelected;
                return (
                  <button key={c.id}
                    onClick={() => !isFull && handleColorSelect(c.id)}
                    disabled={isFull}
                    className={`w-12 h-12 rounded-full border-3 transition-all relative
                      ${isSelected ? 'ring-3 ring-offset-2 ring-gray-800 scale-110' : 'hover:scale-105'}
                      ${isFull ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={{ background: c.hex, borderColor: isSelected ? '#111' : c.hex }}
                    title={`${c.name}${isFull ? ' (đã đủ)' : ''}`}
                  >
                    {isSelected && <span className="absolute -top-1 -right-1 text-white bg-green-500 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">✓</span>}
                    {isFull && <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket Count (only for single color) */}
          {selectedColors.length === 1 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">📄 Số tờ vé:</p>
              <div className="flex gap-2">
                <button onClick={() => setTicketCount(1)}
                  className={`flex-1 py-2 rounded-lg font-bold transition text-sm
                    ${ticketCount === 1 ? 'bg-red-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  1 tờ — 5,000đ
                </button>
                <button onClick={() => setTicketCount(2)}
                  className={`flex-1 py-2 rounded-lg font-bold transition text-sm
                    ${ticketCount === 2 ? 'bg-red-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  2 tờ (cặp) — 10,000đ
                </button>
              </div>
            </div>
          )}

          {/* Confirm Color Button */}
          {selectedColors.length > 0 && (
            <button onClick={confirmColors}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-2.5 rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-lg mb-4 text-sm">
              ✅ Xác nhận chọn vé — {totalCost.toLocaleString('vi-VN')}đ
            </button>
          )}

          {/* Players */}
          <div className="mb-4">
            <p className="text-sm text-gray-700 font-semibold mb-1">👥 Người chơi ({players.length})</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {players.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                  <div className="flex gap-1">
                    {(p.colors || []).map((c, j) => (
                      <span key={j} className="w-4 h-4 rounded-full border" style={{ background: COLOR_OPTIONS.find(co => co.id === c)?.hex || '#ccc' }}></span>
                    ))}
                    {(!p.colors || p.colors.length === 0) && <span className="w-4 h-4 rounded-full bg-gray-300"></span>}
                  </div>
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.isHost && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 rounded-full">Host</span>}
                  {p.ticketCount > 0 && <span className="text-xs text-gray-400 ml-auto">{p.ticketCount} tờ</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          {isHost ? (
            <button onClick={startGame}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition shadow-lg text-lg">
              🎮 BẮT ĐẦU CHƠI!
            </button>
          ) : (
            <p className="text-center text-gray-500 animate-pulse text-sm mt-2">⏳ Chờ Host bắt đầu...</p>
          )}
        </div>
      </div>
    );
  }

  // ============ GAME SCREEN ============
  return (
    <div className="p-2 sm:p-4" style={bgStyle}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm rounded-xl p-3 mb-3 flex justify-between items-center shadow">
        <div>
          <span className="text-sm text-gray-500">Phòng</span>
          <span className="ml-1 text-lg font-black text-red-600">{roomId}</span>
        </div>
        <div className="text-sm text-gray-600">
          💰 {tickets.length * 5000}đ
        </div>
      </header>

      {/* Winner / Verify Banner */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-xl text-center mb-3 shadow-lg">
          <p className="text-2xl font-black text-white">🎉 {winner.name} đã KINH! 🎉</p>
          <p className="text-white/90 text-sm mt-1">Hàng thắng: <span className="font-bold">{winner.winningRow?.join(' — ')}</span></p>

          {verifyRow && (
            <div className="mt-2 bg-white/20 rounded-lg p-2">
              <p className="text-white text-xs">🔊 Đang kiểm tra: {verifyRow.join(', ')}</p>
            </div>
          )}

          {prizes && (
            <div className="mt-3 bg-white/20 rounded-lg p-3 text-left text-sm text-white">
              <p className="font-bold mb-1">💰 Kết quả chia tiền:</p>
              {prizes.winners?.map((w, i) => (
                <p key={i}>🏆 {w.name}: <span className="text-green-200 font-bold">+{w.prize.toLocaleString('vi-VN')}đ</span></p>
              ))}
              {prizes.losers?.map((l, i) => (
                <p key={i}>📉 {l.name}: <span className="text-red-200">-{l.loss.toLocaleString('vi-VN')}đ</span></p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Board */}
        <div className="lg:col-span-1">
          <Board calledNumbers={calledNumbers} currentNumber={currentNumber} />
        </div>

        {/* Tickets */}
        <div className="lg:col-span-2">
          {!isSpectator && tickets.map((t, i) => (
            <Ticket
              key={i}
              ticketData={t.data}
              markedNumbers={markedNumbers}
              calledNumbers={calledNumbers}
              onNumberClick={handleNumberClick}
              color={t.color}
              label={tickets.length > 1 ? `Tờ ${i + 1}` : ''}
            />
          ))}

          {isSpectator && (
            <div className="bg-white/80 p-6 rounded-xl text-center">
              <p className="text-gray-600 text-lg">👀 Bạn đang xem trận đấu</p>
              <p className="text-gray-400 text-sm mt-1">Trận đã bắt đầu, bạn tham gia muộn</p>
            </div>
          )}

          {/* KINH Button */}
          {!isSpectator && !winner && (
            <div className="mt-4 flex justify-center">
              <button onClick={checkWin} disabled={!canKinh}
                className={`text-xl font-black px-10 py-4 rounded-full shadow-2xl transition-all
                  ${canKinh
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105 active:scale-95 animate-bounce'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}>
                🎉 KINH RỒI!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
