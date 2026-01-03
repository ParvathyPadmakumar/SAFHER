import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Navigation, MapPin, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

const RoutePanel = ({ onRouteCalculated, routeInfo }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [sourceConfirmed, setSourceConfirmed] = useState('');
  const [destConfirmed, setDestConfirmed] = useState('');

  // Geocode using Nominatim (OpenStreetMap)
  const geocodeAddress = async (query, setSuggestions) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    }
  };

  const handleSourceChange = (value) => {
    setSource(value);
    geocodeAddress(value, setSourceSuggestions);
  };

  const handleDestChange = (value) => {
    setDestination(value);
    geocodeAddress(value, setDestSuggestions);
  };

  const selectSourceSuggestion = (suggestion) => {
    setSourceCoords({
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon)
    });
    setSourceConfirmed(suggestion.display_name);
    setSource(suggestion.display_name);
    setSourceSuggestions([]);
  };

  const selectDestSuggestion = (suggestion) => {
    setDestCoords({
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon)
    });
    setDestConfirmed(suggestion.display_name);
    setDestination(suggestion.display_name);
    setDestSuggestions([]);
  };

  const calculateRoute = async () => {
    if (!sourceCoords || !destCoords) {
      toast.error('Please select both source and destination');
      return;
    }

    setLoading(true);
    try {
      // Call backend API for safest route
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lat: sourceCoords.lat,
          start_lon: sourceCoords.lon,
          end_lat: destCoords.lat,
          end_lon: destCoords.lon
        })
      });

      if (!response.ok) throw new Error('Route calculation failed');
      
      const data = await response.json();
      onRouteCalculated({
        start: sourceCoords,
        end: destCoords,
        ...data
      });
      toast.success('Safest route calculated!');
    } catch (error) {
      console.error('Route calculation error:', error);
      toast.error('Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="absolute top-20 left-6 w-80 glass-panel p-6 z-20 rounded-2xl shadow-xl" data-testid="route-panel">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Navigation className="text-blue-600" size={28} />
          <h2 className="text-2xl font-bold text-slate-800">Plan Safe Route</h2>
        </div>

        {/* Source Input */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-green-600" />
            <label className="text-sm font-medium text-slate-700">From</label>
          </div>
          <Input
            data-testid="source-input"
            placeholder="Enter starting location..."
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="h-10 rounded-lg pl-3 pr-3 text-sm border border-slate-300"
          />
          {sourceSuggestions.length > 0 && (
            <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto z-40">
              {sourceSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-green-50 cursor-pointer text-xs text-slate-700 border-b last:border-b-0"
                  onClick={() => selectSourceSuggestion(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{suggestion.display_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {sourceConfirmed && (
            <p className="text-xs text-green-600 mt-1 truncate">✓ {sourceConfirmed}</p>
          )}
        </div>

        {/* Destination Input */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-blue-600" />
            <label className="text-sm font-medium text-slate-700">To</label>
          </div>
          <Input
            data-testid="destination-input"
            placeholder="Enter destination..."
            value={destination}
            onChange={(e) => handleDestChange(e.target.value)}
            className="h-10 rounded-lg pl-3 pr-3 text-sm border border-slate-300"
          />
          {destSuggestions.length > 0 && (
            <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto z-40">
              {destSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-blue-50 cursor-pointer text-xs text-slate-700 border-b last:border-b-0"
                  onClick={() => selectDestSuggestion(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{suggestion.display_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {destConfirmed && (
            <p className="text-xs text-blue-600 mt-1 truncate">✓ {destConfirmed}</p>
          )}
        </div>

        {/* Calculate Button */}
        <Button
          data-testid="calculate-route-btn"
          onClick={calculateRoute}
          disabled={loading || !sourceCoords || !destCoords}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? 'Calculating...' : 'Find Safest Route'}
        </Button>

        {/* Route Info Display */}
        {routeInfo && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-2" data-testid="route-info">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">
                {routeInfo.route_type === 'safest' ? '🟢 Safest Route' : routeInfo.route_type === 'shortest' ? '🟡 Shortest Route (Fallback)' : '🔵 Alternative Route'}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Distance</span>
              <span className="font-bold text-slate-800">{routeInfo.distance?.toFixed(2) || 'N/A'} km</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Duration</span>
              <span className="font-bold text-slate-800">{routeInfo.duration ? Math.round(routeInfo.duration) : 'N/A'} min</span>
            </div>
            {routeInfo.safety_score !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Overall Safety</span>
                <span className={`font-bold ${
                  routeInfo.safety_score >= 70 ? 'text-emerald-600' :
                  routeInfo.safety_score >= 50 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {routeInfo.safety_score}%
                </span>
              </div>
            )}
            
            {/* Detailed Metrics Breakdown */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              {routeInfo.traffic_score !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Traffic</span>
                  <span className="font-medium text-slate-700">{routeInfo.traffic_score}%</span>
                </div>
              )}
              {routeInfo.cctv_score !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">CCTV Coverage</span>
                  <span className="font-medium text-slate-700">{routeInfo.cctv_score}%</span>
                </div>
              )}
              {routeInfo.crowd_score !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Crowd Density</span>
                  <span className="font-medium text-slate-700">{routeInfo.crowd_score}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RoutePanel;
