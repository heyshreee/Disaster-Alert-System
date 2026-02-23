import asyncio
import threading
import time

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.services.earthquake_service import fetch_earthquakes
from app.services.risk_engine import calculate_risk
from app.services.websocket_manager import ConnectionManager
from app.utils.distance import haversine
from app.config import POLL_INTERVAL, ALERT_RADIUS_KM

app = FastAPI()
manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cached_data = []

# Example: Fixed user location (India center)
USER_LAT = 20.5937
USER_LON = 78.9629


def background_fetch():
    global cached_data

    while True:
        earthquakes = fetch_earthquakes()
        processed = []

        for eq in earthquakes:
            magnitude = eq["magnitude"]
            eq_lat = eq["latitude"]
            eq_lon = eq["longitude"]

            if magnitude is None:
                continue

            distance = haversine(USER_LAT, USER_LON, eq_lat, eq_lon)

            if distance <= ALERT_RADIUS_KM:
                risk = calculate_risk(magnitude)

                processed.append({
                    "place": eq["place"],
                    "magnitude": magnitude,
                    "depth": eq["depth"],
                    "risk": risk,
                    "distance_km": round(distance, 2),
                    "latitude": eq_lat,
                    "longitude": eq_lon,
                    "time": eq["time"]
                })

        cached_data = processed
        print("Updated disaster data")

        time.sleep(POLL_INTERVAL)


threading.Thread(target=background_fetch, daemon=True).start()


@app.get("/health")
def health_check():
    return {"status": "running"}

@app.get("/data")
def get_data():
    return {
        "count": len(cached_data),
        "events": cached_data
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await manager.broadcast(cached_data)
            await asyncio.sleep(2)
    except:
        manager.disconnect(websocket)