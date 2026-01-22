// app/components/DriverCard.tsx

import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { calculateDistance } from '../utils/coordinates';

interface DriverCardProps {
  driver: Driver;
  pickupCoords: [number, number] | null;
}

export const DriverCard: React.FC<DriverCardProps> = ({ driver, pickupCoords }) => {
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
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4 border border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
          {driver.profileImage ? (
            <img 
              src={driver.profileImage} 
              alt={driver.name} 
              className="w-12 h-12 rounded-full object-cover" 
            />
          ) : (
            <i className="ri-user-fill text-gray-600 text-xl"></i>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{driver.name}</h3>
            <div className="flex items-center space-x-1">
              <i className="ri-star-fill text-yellow-400"></i>
              <span className="font-medium">{driver.rating.toFixed(1)}</span>
              {driver.totalRides && (
                <span className="text-sm text-gray-500">({driver.totalRides} rides)</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-gray-600 text-sm">
            <span className="flex items-center">
              <i className="ri-car-line mr-1"></i>
              {driver.vehicleType}
            </span>
            <span className="font-mono font-bold">{driver.vehicleNumber}</span>
            {driver.vehicleColor && <span>• {driver.vehicleColor}</span>}
            {pickupCoords && driver.coords && (
              <span className="text-blue-600 font-medium">
                • {(calculateDistance(driver.coords, pickupCoords) * 1000).toFixed(0)}m away
              </span>
            )}
          </div>
          
          {(driver.vehicleBrand || driver.vehicleModel) && (
            <div className="flex items-center space-x-2 text-gray-600 text-sm mt-1">
              <i className="ri-car-fill mr-1"></i>
              <span>
                {driver.vehicleBrand && driver.vehicleBrand !== 'Unknown' ? driver.vehicleBrand : ''}
                {driver.vehicleBrand && driver.vehicleBrand !== 'Unknown' && driver.vehicleModel && driver.vehicleModel !== 'Unknown' ? ' ' : ''}
                {driver.vehicleModel && driver.vehicleModel !== 'Unknown' ? driver.vehicleModel : ''}
                {driver.vehicleYear ? ` (${driver.vehicleYear})` : ''}
              </span>
            </div>
          )}
          
          {driver.licenseNumber && (
            <div className="text-xs text-gray-500 mt-1">
              License: {driver.licenseNumber}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            driver.status === 'arrived' ? 'bg-green-500' : 
            driver.status === 'on-way' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}></div>
          <span className="font-medium">
            {driver.status === 'arrived' && 'Driver has arrived'}
            {driver.status === 'on-way' && `${eta} min away`}
            {driver.status === 'accepted' && 'Driver accepted your ride'}
          </span>
        </div>
        {driver.phone && (
          <a 
            href={`tel:${driver.phone}`}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <i className="ri-phone-fill"></i>
            <span>Call</span>
          </a>
        )}
      </div>
    </div>
  );
};