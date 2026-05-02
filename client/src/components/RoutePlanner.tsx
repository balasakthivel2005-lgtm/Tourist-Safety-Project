import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

const RoutePlanner = ({ map, start, end }: any) => {

    useEffect(() => {
    if (!map || !start || !end) return;

    // 🧹 Remove old route safely
    try {
        if ((window as any).routingControl) {
        map.removeControl((window as any).routingControl);
        }
    } catch {}

    // 🧭 Create new route
    const control = (L as any).Routing.control({
        waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
        ],
        routeWhileDragging: false,
        show: false
    }).addTo(map);

    // Save reference
    (window as any).routingControl = control;

    }, [map, start, end]);

    return null;
};

export default RoutePlanner;