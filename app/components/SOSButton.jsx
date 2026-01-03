import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

const SOSButton = ({ onClick }) => {
  const [pressing, setPressing] = useState(false);

  const handlePress = () => {
    setPressing(true);
    setTimeout(() => {
      onClick();
      setPressing(false);
    }, 500);
  };

  return (
    <Button
      data-testid="sos-button"
      onClick={handlePress}
      className={`fixed bottom-8 right-8 z-50 w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl border-4 border-white flex items-center justify-center transition-all ${
        pressing ? 'scale-95' : 'scale-100 hover:scale-105'
      } animate-pulse`}
    >
      <div className="flex flex-col items-center">
        <AlertCircle size={32} />
        <span className="text-xs font-bold mt-1">SOS</span>
      </div>
    </Button>
  );
};

export default SOSButton;
