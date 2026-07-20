// app/components/DriverCard.tsx

import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { calculateDistance } from '../utils/coordinates';

interface DriverCardProps {
  driver: Driver;
  pickupCoords: [number, number] | null;
  onCancel?: () => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, pickupCoords, onCancel }) => {
  const [eta, setEta] = useState(0);

  useEffect(() => {
    if (driver.coords && pickupCoords) {
      if (driver.estimatedArrival) {
        setEta(driver.estimatedArrival);
      } else {
        const distance = calculateDistance(driver.coords, pickupCoords);
        setEta(Math.round(distance * 2));
      }
    }
  }, [driver.coords, driver.estimatedArrival, pickupCoords]);

  return (
    <div className="card-light rounded-2xl p-5 mb-4 relative overflow-hidden group">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 rounded-2xl border border-gray-100 bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
          {driver.profileImage ? (
            <img 
              src={driver.profileImage} 
              alt={driver.name} 
              className="w-14 h-14 object-cover" 
            />
          ) : (
            <i className="ri-user-fill text-gray-400 text-2xl"></i>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-lg text-gray-900 truncate">{driver.name}</h3>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex-shrink-0">
              <i className="ri-star-fill text-amber-500 text-sm"></i>
              <span className="font-bold text-sm text-amber-700">{driver.rating.toFixed(1)}</span>
              {driver.totalRides && (
                <span className="text-xs text-amber-600/80">({driver.totalRides})</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2 text-sm mt-1.5">
            <span className="flex items-center text-gray-600 font-medium">
              <i className="ri-car-line mr-1.5 text-gray-500"></i>
              {driver.vehicleType}
            </span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-lg font-mono font-bold tracking-wider text-xs text-gray-700">{driver.vehicleNumber}</span>
            {driver.vehicleColor && <span className="text-gray-400 text-xs">• {driver.vehicleColor}</span>}
          </div>
          
          {(driver.vehicleBrand || driver.vehicleModel) && (
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1.5">
              <i className="ri-steering-2-line"></i>
              <span>
                {driver.vehicleBrand && driver.vehicleBrand !== 'Unknown' ? driver.vehicleBrand : ''}
                {driver.vehicleBrand && driver.vehicleBrand !== 'Unknown' && driver.vehicleModel && driver.vehicleModel !== 'Unknown' ? ' ' : ''}
                {driver.vehicleModel && driver.vehicleModel !== 'Unknown' ? driver.vehicleModel : ''}
                {driver.vehicleYear ? ` (${driver.vehicleYear})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            driver.status === 'arrived' ? 'bg-green-500' : 
            driver.status === 'on-way' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}></div>
          <span className={`font-semibold text-sm ${
            driver.status === 'arrived' ? 'text-green-700' : 
            driver.status === 'on-way' ? 'text-yellow-700' : 'text-blue-700'
          }`}>
            {driver.status === 'arrived' && 'Driver has arrived'}
            {driver.status === 'on-way' && (
              <span>
                {eta} min away
                {pickupCoords && driver.coords && (
                  <span className="text-gray-400 text-xs font-normal ml-1.5">
                    • {(calculateDistance(driver.coords, pickupCoords) * 1000).toFixed(0)}m
                  </span>
                )}
              </span>
            )}
            {driver.status === 'accepted' && 'Driver accepted your ride'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all font-semibold active:scale-95"
            >
              <i className="ri-close-circle-line"></i>
              <span>Cancel</span>
            </button>
          )}
          {driver.phone && (
            <a 
              href={`tel:${driver.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-all font-semibold active:scale-95"
            >
              <i className="ri-phone-fill"></i>
              <span>Call</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};