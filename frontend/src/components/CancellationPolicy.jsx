import React, { useState } from 'react';

const CancellationPolicy = () => {
    const [isPolicyOpen, setIsPolicyOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
            <button
                onClick={() => setIsPolicyOpen(!isPolicyOpen)}
                className="w-full p-4 text-left flex justify-between items-center focus:outline-none hover:bg-gray-50 transition-colors"
            >
                <span className="font-semibold text-gray-800">Cancellation Policy</span>
                <span className="text-gray-500 text-xl">{isPolicyOpen ? '−' : '+'}</span>
            </button>

            {isPolicyOpen && (
                <div className="p-4 pt-0 text-sm text-gray-600 border-t border-gray-100 space-y-2">
                    <p>• Cancellations are not permitted less than 1 hour before the showtime.</p>
                    <p>• <span className="font-semibold">48+ hours before show:</span> 75% of Base Price refunded.</p>
                    <p>• <span className="font-semibold">12 - 48 hours before show:</span> 50% of Base Price refunded.</p>
                    <p>• <span className="font-semibold">1 - 12 hours before show:</span> 25% of Base Price refunded.</p>
                    <p className="text-red-500 mt-2 text-xs font-semibold">• Note: Platform convenience fees and taxes are strictly non-refundable.</p>
                </div>
            )}
        </div>
    );
};

export default CancellationPolicy;