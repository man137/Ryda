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
      <div className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        connectionStatus === 'connected' 
          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
          : connectionStatus === 'connecting'
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'bg-red-500/10 text-red-700 dark:text-red-400'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          {connectionStatus === 'connected' && 'Live tracking active'}
          {connectionStatus === 'connecting' && 'Connecting to server...'}
          {connectionStatus === 'error' && 'Connection error - retrying...'}
        </div>
      </div>
    )}

    {isLoadingDriverDetails && (
      <div className="px-4 py-3 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-medium">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading driver details...
        </div>
      </div>
    )}
    
    {apiError && (
      <div className="bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
        <div className="flex items-center justify-between gap-2">
          <span className="flex-1">{apiError}</span>
          <button 
            onClick={onDismissError}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
      </div>
    )}
  </div>
);