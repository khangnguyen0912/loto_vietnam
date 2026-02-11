import React from 'react';

const Board = ({ calledNumbers = [], currentNumber }) => {
    const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);

    return (
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg">
            <h3 className="text-base font-bold mb-2 text-gray-700">
                Đã gọi: <span className="text-red-600">{calledNumbers.length}</span>/90
            </h3>

            {/* Current Number */}
            {currentNumber && (
                <div className="flex justify-center mb-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-white text-5xl sm:text-6xl font-black rounded-full shadow-2xl animate-bounce border-4 border-yellow-300">
                        {currentNumber}
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-10 gap-[2px] text-xs sm:text-sm">
                {allNumbers.map((num) => {
                    const isCalled = calledNumbers.includes(num);
                    const isCurrent = num === currentNumber;

                    return (
                        <div
                            key={num}
                            className={`
                aspect-square flex items-center justify-center rounded font-semibold transition-all duration-200
                ${isCurrent ? 'bg-red-600 text-white ring-2 ring-yellow-400 scale-110 z-10 animate-pulse' : ''}
                ${isCalled && !isCurrent ? 'bg-gray-800 text-white' : ''}
                ${!isCalled ? 'bg-gray-100 text-gray-400' : ''}
              `}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Board;
