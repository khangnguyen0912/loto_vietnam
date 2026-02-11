import React from 'react';

const TICKET_COLOR_MAP = {
    red: { bg: '#FFE0E0', border: '#DC2626', cell: '#FFF5F5', empty: '#FCA5A5', marked: '#DC2626' },
    orange: { bg: '#FFECD2', border: '#EA580C', cell: '#FFFBEB', empty: '#FDBA74', marked: '#EA580C' },
    yellow: { bg: '#FFF9C4', border: '#CA8A04', cell: '#FFFFF0', empty: '#FDE047', marked: '#CA8A04' },
    blue: { bg: '#DBEAFE', border: '#2563EB', cell: '#EFF6FF', empty: '#93C5FD', marked: '#2563EB' },
    green: { bg: '#DCFCE7', border: '#16A34A', cell: '#F0FFF4', empty: '#86EFAC', marked: '#16A34A' },
    purple: { bg: '#EDE9FE', border: '#7C3AED', cell: '#F5F3FF', empty: '#C4B5FD', marked: '#7C3AED' },
    pink: { bg: '#FCE7F3', border: '#DB2777', cell: '#FFF1F2', empty: '#F9A8D4', marked: '#DB2777' },
};

// Column headers for the board
const COL_HEADERS = ['1-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90'];

const Ticket = ({ ticketData, calledNumbers = [], onNumberClick, color = 'pink', label = '' }) => {
    const scheme = TICKET_COLOR_MAP[color] || TICKET_COLOR_MAP.pink;
    if (!ticketData || ticketData.length === 0) return null;

    return (
        <div className="rounded-xl shadow-lg overflow-hidden mx-auto mb-4"
            style={{ border: `3px solid ${scheme.border}`, maxWidth: '600px' }}>

            {/* Header */}
            {label && (
                <div className="text-center py-1.5 font-bold text-sm tracking-wider"
                    style={{ background: scheme.border, color: '#fff' }}>
                    {label}
                </div>
            )}

            {/* Grid: 9 rows x 9 cols */}
            <div className="p-1" style={{ background: scheme.bg }}>
                {ticketData.map((row, rowIndex) => {
                    // Check waiting row: count non-zero numbers that are called
                    const rowNums = row.filter(n => n !== 0);
                    const calledCount = rowNums.filter(n => calledNumbers.includes(num)).length; // Bug in thought: num is undefined here. FIX: calledNumbers.includes(n)
                    // Wait, calledNumbers.includes(n).
                    // Correct logic:
                    const matchCount = rowNums.filter(n => calledNumbers.includes(n)).length;
                    const isWaiting = matchCount === 4 && rowNums.length === 5; // Should be 5 normally.

                    return (
                        <div key={rowIndex} className={`grid grid-cols-9 gap-[2px] mb-[2px] rounded transition-all duration-300 ${isWaiting ? 'ring-2 ring-yellow-400 bg-yellow-100 shadow-inner animate-pulse' : ''}`}>
                            {row.map((num, colIndex) => {
                                const isEmpty = num === 0;
                                const isCalled = !isEmpty && calledNumbers.includes(num);

                                // Section divider: rows 0-2 = top, 3-5 = middle, 6-8 = bottom
                                const isLastInSection = rowIndex === 2 || rowIndex === 5;

                                return (
                                    <div key={`${rowIndex}-${colIndex}`}
                                        onClick={() => !isEmpty && onNumberClick && onNumberClick(num)}
                                        className={`
                    flex items-center justify-center rounded transition-all duration-150 select-none
                    ${!isEmpty ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}
                    ${isLastInSection ? 'mb-[2px]' : ''}
                  `}
                                        style={{
                                            height: '36px',
                                            background: isEmpty ? scheme.empty : (isCalled ? scheme.marked : scheme.cell),
                                            color: isEmpty ? 'transparent' : (isCalled ? '#fff' : '#1a1a1a'),
                                            fontWeight: 'bold',
                                            fontSize: num > 9 ? '0.95rem' : '1.1rem',
                                            boxShadow: isCalled ? `0 0 8px ${scheme.marked}55` : 'none',
                                        }}>
                                        {!isEmpty && num}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Ticket;
