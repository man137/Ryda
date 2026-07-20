// app/components/PriceDisplay.tsx

import React from 'react';
import { Driver, RouteGeometry, RideStatus } from '../types';
import { FARE_CONFIG } from '../constants';
import { FindingDriver } from './FindingDriver';
import { DriverCard } from './DriverCard';

interface PriceDisplayProps {
  fare: number;
  routeGeometry: RouteGeometry;
  isFindingDriver: boolean;
  driver: Driver | null;
  rideStatus: RideStatus;
  pickupCoords: [number, number] | null;
  handleCancelRequest: () => void;
  handleRequestRide: () => void;
  session: any;
  isLoadingDriverDetails: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({ 
  fare, 
  routeGeometry, 
  isFindingDriver, 
  driver, 
  rideStatus, 
  pickupCoords,
  handleCancelRequest,
  handleRequestRide,
  session,
  isLoadingDriverDetails
}) => (
  <div className="w-full flex flex-col gap-5">
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
      <div>
        <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
          <i className="ri-roadster-line text-gray-700"></i>
          Ryda Standard
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2 font-medium">
          <span className="flex items-center bg-white border border-gray-200 px-2 py-0.5 rounded-full"><i className="ri-route-line mr-1 text-gray-600"></i>{(routeGeometry.distance / 1000).toFixed(1)} km</span>
          <span className="flex items-center bg-white border border-gray-200 px-2 py-0.5 rounded-full"><i className="ri-time-line mr-1 text-gray-600"></i>{Math.round(routeGeometry.duration / 60)} min</span>
        </p>
      </div>
      <div className="text-right">
        <div className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">₹{fare}</div>
      </div>
    </div>
    
    {isFindingDriver ? (
      <FindingDriver onCancel={handleCancelRequest} />
    ) : driver ? (
      <>
        <DriverCard driver={driver} pickupCoords={pickupCoords} onCancel={handleCancelRequest} />
        {rideStatus === 'in-progress' && (
          <div className="mt-2 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center gap-2">
            <i className="ri-car-line text-xl animate-float"></i>
            <span className="font-bold text-sm tracking-wide">Ride in progress</span>
          </div>
        )}
      </>
    ) : (
      <button 
        className="relative overflow-hidden w-full mt-1 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 group"
        onClick={handleRequestRide}
        disabled={!session || isLoadingDriverDetails}
      >
        {!session ? (
          <><i className="ri-lock-line text-lg"></i> Login to Request Ride</>
        ) : isLoadingDriverDetails ? (
           <>
             <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span>Loading driver...</span>
           </>
         ) : (
          <><i className="ri-taxi-fill text-lg group-hover:scale-110 transition-transform"></i> Confirm Ride</>
         )}
      </button>
    )}
  </div>
);