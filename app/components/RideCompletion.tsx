// components/RideCompletion.tsx

import React from 'react';

// Assuming Driver type is imported from './types'
type Driver = any;
type PaymentMethod = 'online' | 'cash';

interface RideCompletionProps {
  driver: Driver;
  fare: number;
  onConfirmPayment: () => void;
  onOpenOnlinePayment?: () => void;
  onBackToDashboard: () => void;
  isPaying: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paymentError: string | null;
}

export const RideCompletion: React.FC<RideCompletionProps> = ({
  driver,
  fare,
  onConfirmPayment,
  onBackToDashboard,
  isPaying,
  paymentMethod,
  setPaymentMethod,
  paymentError,
}) => {
  let buttonText = 'Confirm Payment Method';
  if (isPaying) {
    buttonText = 'Processing Online Payment...';
  } else if (paymentMethod === 'cash') {
    buttonText = 'Confirm Cash Payment & Start New Ride';
  } else {
    buttonText = 'Continue to Online Payment';
  }

  return (
    <div className="card-float rounded-2xl p-8 relative overflow-hidden">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 rounded-t-2xl" />
      
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 border border-green-200">
          <i className="ri-check-line text-4xl text-green-600"></i>
        </div>
        <h2 className="text-2xl font-black text-gray-900">Ride Completed!</h2>
        <p className="text-gray-500 text-sm mt-1">Thank you for riding with Ryda</p>
      </div>

      {/* Final Fare */}
      <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-2xl mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Final Fare Due</p>
        <span className="text-5xl font-black text-gray-900">
          ₹{fare.toFixed(2)}
        </span>
      </div>

      {/* Driver Details */}
      <div className="flex items-center gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl mb-6">
        <div className="w-12 h-12 rounded-xl bg-gray-200 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {driver.profileImage ? (
            <img src={driver.profileImage} alt={driver.name} className="w-full h-full object-cover" />
          ) : (
            <i className="ri-user-fill text-gray-500 text-xl"></i>
          )}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{driver.name}</h3>
          <p className="text-sm text-gray-500">
            {driver.vehicleType} • <span className="font-mono bg-gray-200 px-1 rounded text-xs">{driver.vehicleNumber}</span>
          </p>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-4 mb-6">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => setPaymentMethod('online')}
            disabled={isPaying}
            className={`flex-1 p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
              paymentMethod === 'online'
                ? 'bg-black border-black text-white shadow-md'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <i className="ri-bank-card-line text-2xl"></i>
            <span className="text-sm font-semibold">Online</span>
          </button>

          <button
            onClick={() => setPaymentMethod('cash')}
            disabled={isPaying}
            className={`flex-1 p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
              paymentMethod === 'cash'
                ? 'bg-black border-black text-white shadow-md'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <i className="ri-money-rupee-circle-line text-2xl"></i>
            <span className="text-sm font-semibold">Cash</span>
          </button>
        </div>

        {paymentMethod === 'cash' && (
          <div className="text-sm text-gray-600 p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3 items-start">
            <i className="ri-information-line text-yellow-600 mt-0.5 flex-shrink-0"></i>
            <p>You confirm you will pay ₹{fare.toFixed(2)} directly to the driver.</p>
          </div>
        )}
      </div>

      {/* Payment Error */}
      {paymentError && (
        <div className="p-3 mb-6 badge-error rounded-xl text-sm flex items-center">
          <i className="ri-error-warning-line mr-2 text-lg"></i>
          Payment failed: {paymentError}
        </div>
      )}

      {/* Main Payment Button */}
      <button
        onClick={onConfirmPayment}
        disabled={isPaying}
        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 rounded-xl text-base font-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
      >
        {isPaying && <i className="ri-loader-4-line animate-spin"></i>}
        {buttonText}
      </button>

      <button
        onClick={onBackToDashboard}
        disabled={isPaying}
        className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
      >
        <i className="ri-arrow-left-line mr-2"></i>
        Start New Ride
      </button>
    </div>
  );
};
