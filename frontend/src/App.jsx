import React, { useState, useEffect } from 'react';
import MapView from './components/map/MapView';
import AlertCard from './components/alerts/AlertCard';
import { fetchDisasterData } from './services/api';

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [radius, setRadius] = useState(2500); // Default 2500km
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    // Get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLon(position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Could not retrieve precise location. Showing global events.");
          // Fallback to fetch global data
          fetchData(null, null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported. Showing global events.");
      fetchData(null, null);
    }
  }, []);

  const fetchData = async (lat, lon, rad) => {
    setLoading(true);
    const data = await fetchDisasterData(lat, lon, lat && lon ? rad : null);
    if (data && data.events) {
      setEvents(data.events);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userLat !== null && userLon !== null) {
      fetchData(userLat, userLon, radius);
    }
  }, [userLat, userLon, radius]);

  // WebSocket for Real-time Updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      try {
        const fullData = JSON.parse(event.data);

        let filtered = fullData;
        if (userLat && userLon) {
          const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };

          filtered = fullData.map(eq => {
            const dist = getDistance(userLat, userLon, eq.latitude, eq.longitude);
            return { ...eq, distance_km: dist.toFixed(2) };
          }).filter(eq => eq.distance_km <= radius);

          filtered.sort((a, b) => b.time - a.time);
        } else {
          filtered.sort((a, b) => b.time - a.time);
        }

        setEvents(filtered);
      } catch (err) {
        console.error("WS parse error: ", err);
      }
    };

    return () => {
      socket.close();
    };
  }, [userLat, userLon, radius]);

  const handleRadiusChange = (e) => {
    setRadius(Number(e.target.value));
  };

  return (
    <>
      <header className="header">
        <h1>Global Disaster Alert System</h1>
      </header>

      <div className="main-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Recent Alerts</h2>
            <p>{events.length} active events detected</p>
            {locationError && <p style={{ color: '#fca5a5', marginTop: '4px', fontSize: '0.75rem' }}>{locationError}</p>}

            <div className="radius-control">
              <div className="radius-header">
                <label htmlFor="radius-slider">Alert Radius</label>
                <span>{radius} km</span>
              </div>
              <input
                id="radius-slider"
                type="range"
                min="500"
                max="10000"
                step="500"
                value={radius}
                onChange={handleRadiusChange}
                disabled={userLat === null}
                className="slider"
              />
              {userLat === null && <small>Location needed to filter by distance.</small>}
            </div>
          </div>

          <div className="sidebar-content">
            {loading ? (
              <div className="empty-state">
                <div className="spinner"></div>
                <p>Scanning global sensors...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="empty-state">
                <p>No significant events detected in your region.</p>
              </div>
            ) : (
              events.map((event, idx) => (
                <AlertCard key={idx} event={event} />
              ))
            )}
          </div>
        </aside>

        <main className="map-container">
          <MapView
            events={events}
            userLat={userLat}
            userLon={userLon}
            radius={radius}
          />
        </main>
      </div>
    </>
  );
}

export default App;
