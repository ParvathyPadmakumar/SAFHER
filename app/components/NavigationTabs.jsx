import React from 'react';
import { Map, Users, AlertTriangle, User } from 'lucide-react';

const NavigationTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'companions', label: 'Companions', icon: Users },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-30 glass-panel" data-testid="navigation-tabs">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Map className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Outfit' }}>SafeRoute</h1>
          </div>

          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default NavigationTabs;
