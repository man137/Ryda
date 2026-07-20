// app/components/FindingDriver.tsx

import React, { useState, useEffect } from 'react';
import { RIDE_CONFIG } from '../constants';

interface FindingDriverProps {
  onCancel: () => void;
}

export const FindingDriver: React.FC<FindingDriverProps> = ({ onCancel }) => {
  const [dots, setDots] = useState('');
  const [searchingMessage, setSearchingMessage] = useState('Looking for nearby drivers');

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const messages = [
      'Looking for nearby drivers',
      'Finding the best match',
      'Connecting with drivers',
      'Almost found your ride'
    ];

    const messageInterval = setInterval(() => {
      setSearchingMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, 3000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="card-light rounded-2xl p-8 text-center relative overflow-hidden">
      <div className="mb-8">
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full bg-yellow-100 animate-ping-soft"></div>
          <div className="absolute inset-3 rounded-full bg-yellow-200/60 animate-ping-soft" style={{animationDelay: '0.4s'}}></div>
          <div className="relative z-10 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg">
            <i className="ri-car-fill text-2xl text-yellow-400"></i>
          </div>
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">
          Finding your Ryda{dots}
        </h3>
        <p className="text-gray-500 text-sm font-medium">{searchingMessage}</p>
      </div>

      <div className="space-y-2.5 mb-8">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl py-2.5 px-4">
          <i className="ri-time-line text-gray-700"></i>
          <span>Estimated wait: <span className="font-bold text-gray-800">{RIDE_CONFIG.ESTIMATED_WAIT_MIN}–{RIDE_CONFIG.ESTIMATED_WAIT_MAX} min</span></span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl py-2.5 px-4">
          <i className="ri-map-pin-line text-gray-700"></i>
          <span>Searching within <span className="font-bold text-gray-800">{RIDE_CONFIG.SEARCH_RADIUS_KM} km</span></span>
        </div>
      </div>

      <button 
        onClick={onCancel}
        className="w-full py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-all font-semibold text-sm active:scale-95"
      >
        Cancel Request
      </button>
    </div>
  );
};