'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import NavigationTabs from './components/NavigationTabs.jsx';
import RoutePanel from './components/RoutePanel.jsx';
import CompanionsPanel from './components/CompanionsPanel.jsx';
import EmergencyPanel from './components/EmergencyPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';

// Dynamically import RouteMap to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import('./components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <p className="text-slate-600 dark:text-slate-400">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('map');
  const [userLocation, setUserLocation] = useState(null);
  const [companions] = useState([]);
  const [currentRoute, setCurrentRoute] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const handleRouteCalculated = (routeData) => {
    setCurrentRoute(routeData);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <RouteMap
          sourceCoords={currentRoute?.start || null}
          destCoords={currentRoute?.end || null}
          routeData={currentRoute}
        />
      </div>

      {/* Navigation Tabs */}
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content based on active tab */}
      {activeTab === 'map' && (
        <RoutePanel onRouteCalculated={handleRouteCalculated} routeInfo={currentRoute} />
      )}

      {activeTab === 'companions' && (
        <CompanionsPanel companions={companions} />
      )}

      {activeTab === 'emergency' && (
        <EmergencyPanel userLocation={userLocation} />
      )}

      {activeTab === 'profile' && (
        <ProfilePanel />
      )}
    </div>
  );
}
