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
        className="w-full p-3.5 bg-white border-2 border-gray-200 rounded-xl pl-12 pr-12 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/8 text-sm font-medium transition-all text-gray-900 placeholder:text-gray-400 group-hover:border-gray-300"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-yellow-100 rounded-full text-gray-500 hover:text-gray-800 transition-all hover:scale-105 active:scale-95"
          title="Use current location"
          type="button"
        >
          <i className="ri-navigation-fill text-[15px]"></i>
        </button>
      )}
    </div>
    
    {showSuggestions && suggestions.length > 0 && (
      <div className="absolute z-[60] w-full mt-1.5 bg-white border border-gray-200 rounded-2xl max-h-56 overflow-auto hide-scrollbar overflow-y-auto animate-slide-up" style={{boxShadow: 'var(--shadow-lg)'}}>
        {suggestions.map((item, index) => (
          <div 
            key={index}
            className="group/item p-3.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all"
            onMouseDown={() => onSelect(item)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 group-hover/item:bg-yellow-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <i className="ri-map-pin-line text-gray-500 group-hover/item:text-gray-800 transition-colors text-sm"></i>
              </div>
              <span className="text-sm font-medium text-gray-700 line-clamp-1 group-hover/item:text-gray-900 transition-colors">{item.display}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);