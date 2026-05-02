import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { useState, useEffect } from 'react';
import RoutePlanner from './RoutePlanner';
import HeatmapLayer from './HeatmapLayer';

// 🔴 Incident icon
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// 🔵 User icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

interface Incident {
    id: number;
    type: string;
    description: string;
    lat: number;
    lng: number;
}
interface MapProps {
    lat: number;
    lng: number;
    incidents: Incident[];
    focus?: any;
}
// ✅ INNER COMPONENT
const MapInner = ({ lat, lng, incidents, source, destination, focus }: any) => {
    const map = useMap();
    const startPoint = source ? source : { lat, lng };

    // 🔥 AUTO FOCUS
    useEffect(() => {
        if (focus) {
            map.setView([focus.lat, focus.lng], 16);
        }
    }, [focus, map]);

    return (
        <>
            <Marker position={[lat, lng]} icon={DefaultIcon}>
                <Popup>You are here</Popup>
            </Marker>

            {incidents.map((inc: Incident) => (
                <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={redIcon}>
                    <Popup>
                        ⚠️ {inc.type}
                        <br />
                        {inc.description}
                    </Popup>
                </Marker>
            ))}

            {source && (
                <Marker position={[source.lat, source.lng]}>
                    <Popup>📍 Source</Popup>
                </Marker>
            )}

            {destination && (
                <Marker position={[destination.lat, destination.lng]}>
                    <Popup>🎯 Destination</Popup>
                </Marker>
            )}

            {destination && (
                <RoutePlanner
                    map={map}
                    start={startPoint}
                    end={destination}
                />
            )}
        </>
    );
};

const MapView = ({ lat, lng, incidents, focus }: MapProps) => {

    const [sourceInput, setSourceInput] = useState("");
    const [destInput, setDestInput] = useState("");

    const [source, setSource] = useState<any>(null);
    const [destination, setDestination] = useState<any>(null);

    const [loadingRoute, setLoadingRoute] = useState(false);

    const getCoordinates = async (place: string) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${place}`
            );
            const data = await res.json();

            if (!data || data.length === 0) {
                alert(`Location not found: ${place}`);
                return null;
            }

            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        } catch (err) {
            console.error(err);
            alert("Geocoding failed");
            return null;
        }
    };

    const handleRoute = async () => {

        if (!destInput.trim()) {
            alert("Enter destination");
            return;
        }

        setLoadingRoute(true);

        const destCoords = await getCoordinates(destInput);
        if (!destCoords) {
            setLoadingRoute(false);
            return;
        }

        setDestination(destCoords);

        if (sourceInput.trim()) {
            const srcCoords = await getCoordinates(sourceInput);
            if (!srcCoords) {
                setLoadingRoute(false);
                return;
            }
            setSource(srcCoords);
        } else {
            setSource(null);
        }

        setLoadingRoute(false);
    };

    return (
        <div style={{ height: '100%', width: '100%' }}>

            <div style={{
                position: "absolute",
                top: 10,
                left: 60,
                zIndex: 1000,
                background: "white",
                padding: "10px",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                width: "240px"
            }}>
                <input
                    placeholder="Source (e.g. Madurai)"
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                />

                <input
                    placeholder="Destination (e.g. Virudhunagar)"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                />

                <button onClick={handleRoute}>
                    {loadingRoute ? "⏳ Loading..." : "🚀 Find Route"}
                </button>

                {destination && (
                    <div style={{ fontSize: '12px' }}>
                        ✅ Route ready
                    </div>
                )}
            </div>

            <MapContainer
                center={[lat, lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatmapLayer incidents={incidents} />
                <MapInner
                    lat={lat}
                    lng={lng}
                    incidents={incidents}
                    source={source}
                    destination={destination}
                    focus={focus}
                />
            </MapContainer>
        </div>
    );
};

export default MapView;