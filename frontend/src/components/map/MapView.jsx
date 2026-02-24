import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';

// Define custom icons based on risk
const createRiskIcon = (risk) => {
    const riskClass = `pulse-${risk?.toLowerCase() || 'low'}`;
    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="pulse-circle ${riskClass}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

const LocationMarker = ({ lat, lon }) => {
    const map = useMap();

    useEffect(() => {
        if (lat && lon) {
            map.setView([lat, lon], map.getZoom(), { animate: true });
        }
    }, [lat, lon, map]);

    if (!lat || !lon) return null;

    const userIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });

    return (
        <Marker position={[lat, lon]} icon={userIcon}>
            <Popup>
                <div className="popup-content">
                    <h3>Your Location</h3>
                </div>
            </Popup>
        </Marker>
    );
};

const MapView = ({ events, userLat, userLon, radius, onMarkerClick }) => {
    const defaultCenter = [20.5937, 78.9629]; // India Center as fallback
    const center = userLat && userLon ? [userLat, userLon] : defaultCenter;

    return (
        <div className="map-container">
            <MapContainer
                center={center}
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationMarker lat={userLat} lon={userLon} />

                {userLat && userLon && radius && (
                    <Circle
                        center={[userLat, userLon]}
                        radius={radius * 1000} /* Leaflet radius is in meters */
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2, dashArray: '5, 10' }}
                    />
                )}

                {events.map((event, idx) => {
                    if (!event.latitude || !event.longitude) return null;

                    // Calculate impact radius based on magnitude (e.g., Mag 5.0 -> ~50km)
                    // The formula is arbitrary, but an exponential curve fits map visuals well
                    const eventRadius = Math.max(5000, Math.pow(1.8, event.magnitude) * 5000);
                    const riskColor = event.risk === 'High' ? '#ef4444' : event.risk === 'Medium' ? '#f59e0b' : '#10b981';

                    return (
                        <React.Fragment key={idx}>
                            <Circle
                                center={[event.latitude, event.longitude]}
                                radius={eventRadius}
                                pathOptions={{
                                    color: riskColor,
                                    fillColor: riskColor,
                                    fillOpacity: 0.15,
                                    weight: 1,
                                    opacity: 0.5
                                }}
                            />
                            <Marker
                                position={[event.latitude, event.longitude]}
                                icon={createRiskIcon(event.risk)}
                                eventHandlers={{
                                    click: () => {
                                        if (onMarkerClick) onMarkerClick(event);
                                    },
                                }}
                            >
                                <Popup>
                                    <div className="popup-content">
                                        <h3>{event.place}</h3>
                                        <p>Magnitude: <span>{event.magnitude}</span></p>
                                        <p>Risk: <span className={`risk-badge badge-${event.risk}`}>{event.risk}</span></p>
                                        <p>Depth: <span>{event.depth} km</span></p>
                                        {event.distance_km && <p>Distance: <span>{event.distance_km} km</span></p>}
                                        <p>Time: <span>{new Date(event.time).toLocaleString()}</span></p>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapView;
