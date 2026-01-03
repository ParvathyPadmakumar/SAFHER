import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Video, Building2 } from 'lucide-react';

const LayerControls = ({ activeLayers, toggleLayer }) => {
  return (
    <Card className="absolute top-20 right-6 glass-panel p-4 z-20 rounded-2xl shadow-xl" data-testid="layer-controls">
      <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Map Layers</h3>
      <div className="space-y-2">
        <Button
          data-testid="toggle-cctv-layer"
          onClick={() => toggleLayer('cctv')}
          variant={activeLayers.cctv ? 'default' : 'outline'}
          className={`w-full justify-start gap-2 rounded-lg transition-all ${
            activeLayers.cctv 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Video size={18} />
          <span className="text-sm font-medium">CCTV</span>
        </Button>

        <Button
          data-testid="toggle-infrastructure-layer"
          onClick={() => toggleLayer('infrastructure')}
          variant={activeLayers.infrastructure ? 'default' : 'outline'}
          className={`w-full justify-start gap-2 rounded-lg transition-all ${
            activeLayers.infrastructure 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Building2 size={18} />
          <span className="text-sm font-medium">Public Infrastructure</span>
        </Button>
      </div>
    </Card>
  );
};

export default LayerControls;
