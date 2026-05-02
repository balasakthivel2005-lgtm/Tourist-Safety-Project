import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
interface FocusProps {
    focus: {
    lat: number;
    lng: number;
    } | null;
}

const MapFocusController = ({ focus }: FocusProps) => {
    const map = useMap();

    useEffect(() => {
    if (focus && focus.lat && focus.lng) {
        map.setView([focus.lat, focus.lng], 16, {
        animate: true,
        duration: 1.5
        });
    }
    }, [focus, map]);

    return null;
};

export default MapFocusController;