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
  <div className="w-full flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Ride Options</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
          <span><i className="ri-route-line mr-1"></i>{(routeGeometry.distance / 1000).toFixed(1)} km</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span><i className="ri-time-line mr-1"></i>{Math.round(routeGeometry.duration / 60)} min</span>
        </p>
      </div>
      <div className="text-right">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">₹{fare}</div>
      </div>
    </div>
    
    {isFindingDriver ? (
      <FindingDriver onCancel={handleCancelRequest} />
    ) : driver ? (
      <>
        <DriverCard driver={driver} pickupCoords={pickupCoords} onCancel={handleCancelRequest} />
        {rideStatus === 'in-progress' && (
          <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 rounded-xl flex items-center justify-center gap-2 shadow-sm">
            <i className="ri-car-line text-lg animate-bounce"></i>
            <span className="font-medium text-sm">Ride in progress</span>
          </div>
        )}
      </>
    ) : (
      <button 
        className="w-full mt-2 py-3.5 bg-black dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        onClick={handleRequestRide}
        disabled={!session || isLoadingDriverDetails}
      >
        {!session ? 'Login to Request Ride' : 
         isLoadingDriverDetails ? (
           <>
             <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span>Loading driver...</span>
           </>
         ) : 'Confirm Ride'}
      </button>
    )}
  </div>
);