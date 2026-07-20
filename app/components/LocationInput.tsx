// app/components/LocationInput.tsx

import React from 'react';
import { LocationSuggestion } from '../types';

interface LocationInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions: LocationSuggestion[];
  onSelect: (location: LocationSuggestion) => void;
  placeholder: string;
  icon: React.ReactNode;
  showSuggestions: boolean;
  onFocus: () => void;
  onBlur: () => void;
  currentLocationHandler?: () => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder,
  icon,
  showSuggestions,
  onFocus,
  onBlur,
  currentLocationHandler
}) => (
  <div className="relative w-full">
    <div className="relative group">
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-12 pr-12 focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-medium transition-all shadow-sm group-hover:shadow-md text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
        {icon}
      </div>
      {currentLocationHandler && (
        <button 
          onClick={currentLocationHandler}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full shadow-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-105 active:scale-95"
          title="Use current location"
          type="button"
        >
          <i className="ri-navigation-fill text-[15px]"></i>
        </button>
      )}
    </div>
    
    {showSuggestions && suggestions.length > 0 && (
      <div className="absolute z-[60] w-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-xl max-h-56 overflow-auto hide-scrollbar overflow-y-auto">
        {suggestions.map((item, index) => (
          <div 
            key={index}
            className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors"
            onMouseDown={() => onSelect(item)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <i className="ri-map-pin-line text-slate-500 dark:text-slate-400 text-sm"></i>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{item.display}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);