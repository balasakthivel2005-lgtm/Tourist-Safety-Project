import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat"; // ✅ correct way

const HeatmapLayer = ({ incidents }: any) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        if (!incidents || incidents.length === 0) return;

        const heatPoints = incidents
            .filter((inc: any) => inc.lat && inc.lng)
            .map((inc: any) => [
                Number(inc.lat),
                Number(inc.lng),
                0.7
            ]);

        if (heatPoints.length === 0) return;

        const heatLayer = (L as any).heatLayer(heatPoints, {
            radius: 25,
            blur: 18,
            maxZoom: 17,
            gradient: {
                0.2: "blue",
                0.4: "lime",
                0.6: "yellow",
                1.0: "red"
            }
        });

        heatLayer.addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [incidents, map]);

    return null;
};

export default HeatmapLayer;