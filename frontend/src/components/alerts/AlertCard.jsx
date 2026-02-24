import React from 'react';

const AlertCard = ({ event, onClick }) => {
    return (
        <div className={`alert-card risk-${event.risk}`} onClick={() => onClick && onClick(event)}>
            <div className="alert-header">
                <div className="alert-title">{event.place}</div>
                <div className={`risk-badge badge-${event.risk}`}>{event.risk}</div>
            </div>
            <div className="alert-details">
                <div className="alert-detail-item">
                    Magnitude
                    <span>{event.magnitude}</span>
                </div>
                <div className="alert-detail-item">
                    Depth
                    <span>{event.depth} km</span>
                </div>
                {event.distance_km && (
                    <div className="alert-detail-item">
                        Distance
                        <span>{event.distance_km} km</span>
                    </div>
                )}
                <div className="alert-detail-item">
                    Time
                    <span>{new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
    );
};

export default AlertCard;
