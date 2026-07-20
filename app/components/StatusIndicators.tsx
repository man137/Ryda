// app/components/StatusIndicators.tsx

import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusIndicatorsProps {
  connectionStatus: ConnectionStatus;
  isLoadingDriverDetails: boolean;
  apiError: string | null;
  onDismissError: () => void;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({ 
  connectionStatus, 
  isLoadingDriverDetails, 
  apiError, 
  onDismissError 
}) => (
  <div className="space-y-3 mb-4 empty:hidden">
    {connectionStatus !== 'disconnected' && (
      <div className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
        connectionStatus === 'connected' 
          ? 'badge-success'
          : connectionStatus === 'connecting'
          ? 'badge-warning'
          : 'badge-error'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-yellow-600 animate-pulse' : 'bg-red-500'
          }`}></div>
          {connectionStatus === 'connected' && 'Live tracking active'}
          {connectionStatus === 'connecting' && 'Connecting to server...'}
          {connectionStatus === 'error' && 'Connection error — retrying...'}
        </div>
      </div>
    )}

    {isLoadingDriverDetails && (
      <div className="px-4 py-3 rounded-xl badge-warning text-sm font-medium">
        <div className="flex items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-lg"></i>
          Loading driver details...
        </div>
      </div>
    )}
    
    {apiError && (
      <div className="badge-error px-4 py-3 rounded-xl text-sm font-medium">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <i className="ri-error-warning-fill text-lg"></i>
            <span>{apiError}</span>
          </div>
          <button 
            onClick={onDismissError}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-200 transition-colors"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
      </div>
    )}
  </div>
);