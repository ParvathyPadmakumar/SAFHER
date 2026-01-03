import React, { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Users, UserPlus, MapPin, Activity, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import io from 'socket.io-client';

const API = '/api';

const CompanionsPanel = ({ companions }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [nearby, setNearby] = useState([]);
  const [searching, setSearching] = useState(false);
  const [userId] = useState('demo_user');
  const [socket, setSocket] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const s = io(url, { transports: ['websocket'] });
    setSocket(s);

    s.on('companions_found', (payload) => {
      setNearby(payload.companions || []);
      setSearching(false);
      toast.success(`Found ${payload.count} nearby companions`);
    });

    s.on('companion_request', (payload) => {
      if (payload.to_user_id === userId) {
        toast.info(`Companion request from ${payload.from_user_id}`);
      }
    });

    // Get real geolocation and register presence
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCurrentLocation(loc);
          s.emit('user_presence', {
            user_id: userId,
            location: loc,
            route: null,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          const loc = { lat: 0, lon: 0 };
          setCurrentLocation(loc);
          s.emit('user_presence', { user_id: userId, location: loc, route: null });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else {
      const loc = { lat: 0, lon: 0 };
      setCurrentLocation(loc);
      s.emit('user_presence', { user_id: userId, location: loc, route: null });
    }

    return () => {
      s.disconnect();
    };
  }, [userId]);

  const addCompanion = async () => {
    if (!companionName.trim()) {
      toast.error('Please enter companion name');
      return;
    }

    try {
      await axios.post(`${API}/companions`, {
        name: companionName,
        user_id: 'user_' + Date.now(),
        route: {},
        current_location: { lat: 0, lon: 0 }
      });

      toast.success(`${companionName} added as companion`);
      setCompanionName('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding companion:', error);
      toast.error('Failed to add companion');
    }
  };

  const searchNearby = async () => {
    if (!socket) return;
    setSearching(true);
    const loc = currentLocation || { lat: 0, lon: 0 };
    socket.emit('find_companions', {
      user_id: userId,
      location: loc,
      max_distance_km: 2.0,
    });
  };

  const sendRequest = async (toUserId) => {
    try {
      await axios.post(`${API}/companions/request`, {
        from_user_id: userId,
        to_user_id: toUserId,
        message: "Let's walk together?",
      });
      toast.success('Request sent');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send request');
    }
  };

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-[600px] z-20 fade-in" data-testid="companions-panel">
      <Card className="glass-panel p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-slate-800">Companions</h2>
          </div>
          <Button
            data-testid="add-companion-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <UserPlus size={18} />
            Add Companion
          </Button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl space-y-3">
            <Input
              data-testid="companion-name-input"
              placeholder="Enter companion name"
              value={companionName}
              onChange={(e) => setCompanionName(e.target.value)}
              className="h-12 rounded-full"
            />
            <div className="flex gap-2">
              <Button
                data-testid="save-companion-btn"
                onClick={addCompanion}
                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Save
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Search size={16} />
              <span className="text-sm">Nearby users</span>
            </div>
            <Button onClick={searchNearby} className="rounded-full" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {nearby.length > 0 && (
            <div className="space-y-2 mb-4">
              {nearby.map((n) => (
                <Card key={n.user_id} className="p-3 bg-white border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{n.user_id}</div>
                      <div className="text-xs text-slate-500">{n.distance_km} km away</div>
                    </div>
                    <Button variant="outline" className="rounded-full gap-2" onClick={() => sendRequest(n.user_id)}>
                      <Send size={14} />
                      Send Request
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {companions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-base">No active companions</p>
              <p className="text-sm mt-2">Add companions to share your journey</p>
            </div>
          ) : (
            companions.map((companion) => (
              <Card key={companion.id} className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{companion.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <Activity size={14} className="text-emerald-500" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-full gap-2">
                      <MapPin size={16} />
                      Locate
                    </Button>
                    <Button className="rounded-full gap-2" onClick={() => sendRequest(companion.user_id)}>
                      <Send size={16} />
                      Request
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default CompanionsPanel;
