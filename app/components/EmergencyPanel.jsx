import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, Phone, MapPin, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = '/api';

const EmergencyPanel = ({ userLocation }) => {
  const emergencyContacts = [
    { name: 'Police', number: '999', icon: Shield, color: 'blue' },
    { name: 'Ambulance', number: '999', icon: Phone, color: 'red' },
    { name: 'Fire Service', number: '999', icon: AlertTriangle, color: 'orange' }
  ];

  const handleQuickSOS = async () => {
    if (!userLocation) {
      toast.error('Unable to get your location');
      return;
    }

    try {
      await axios.post(`${API}/sos`, {
        user_id: 'user_' + Date.now(),
        location: userLocation,
        message: 'Quick SOS Alert!'
      });

      toast.success('Emergency alert sent!', {
        description: 'Your location has been shared with emergency contacts'
      });
    } catch (error) {
      console.error('SOS error:', error);
      toast.error('Failed to send alert');
    }
  };

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-[600px] z-20 fade-in" data-testid="emergency-panel">
      <Card className="glass-panel p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="text-red-600" size={28} />
          <h2 className="text-2xl font-bold text-slate-800">Emergency</h2>
        </div>

        {/* Quick SOS */}
        <div className="mb-6 p-6 bg-red-50 rounded-xl border-2 border-red-200">
          <h3 className="text-lg font-bold text-red-900 mb-2">Quick SOS</h3>
          <p className="text-sm text-red-700 mb-4">
            Press this button to immediately alert emergency contacts and share your location
          </p>
          <Button
            data-testid="quick-sos-btn"
            onClick={handleQuickSOS}
            className="w-full h-14 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg animate-pulse"
          >
            <AlertTriangle size={24} className="mr-2" />
            SEND SOS ALERT
          </Button>
        </div>

        {/* Emergency Contacts */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Emergency Contacts</h3>
          {emergencyContacts.map((contact, idx) => {
            const Icon = contact.icon;
            return (
              <Card key={idx} className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-${contact.color}-100 rounded-full flex items-center justify-center`}>
                      <Icon size={24} className={`text-${contact.color}-600`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{contact.name}</h4>
                      <p className="text-sm text-slate-500">{contact.number}</p>
                    </div>
                  </div>
                  <Button
                    data-testid={`call-${contact.name.toLowerCase()}-btn`}
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={() => toast.info(`Calling ${contact.name}...`)}
                  >
                    <Phone size={16} />
                    Call
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Current Location */}
        {userLocation && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-700">Your Current Location</h3>
            </div>
            <p className="text-sm text-slate-600">
              Latitude: {userLocation.lat.toFixed(6)}<br />
              Longitude: {userLocation.lon.toFixed(6)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmergencyPanel;
