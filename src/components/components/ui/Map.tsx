'use client';

import { useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

interface MapProps {
    lat: number;
    lng: number;
    zoom?: number;
    className?: string;
    interactive?: boolean;
}

export default function EventMap({
    lat,
    lng,
    zoom = 13,
    className = "",
    interactive = true
}: MapProps) {
    const initialViewState = useMemo(() => ({
        longitude: lng,
        latitude: lat,
        zoom: zoom
    }), [lng, lat, zoom]);

    return (
        <div className={`relative w-full h-full overflow-hidden rounded-xl bg-bg-elevated ${className}`}>
            <Map
                initialViewState={initialViewState}
                style={{ width: '100%', height: '100%' }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                attributionControl={false}
                reuseMaps
                scrollZoom={interactive}
                dragPan={interactive}
                dragRotate={interactive}
                touchZoomRotate={interactive}
                doubleClickZoom={interactive}
            >
                {interactive && <NavigationControl position="bottom-right" showCompass={false} />}

                <Marker longitude={lng} latitude={lat} anchor="bottom">
                    <div className="relative flex flex-col items-center">
                        <div className="relative z-10 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] border-2 border-border-primary">
                            <MapPin size={16} className="text-white fill-white" />
                        </div>
                        <div className="w-1 h-8 bg-linear-to-b from-blue-600/50 to-transparent -mt-1" />
                        <div className="absolute bottom-0 w-8 h-8 bg-blue-500/20 blur-xl rounded-full translate-y-1/2" />
                    </div>
                </Marker>
            </Map>
        </div>
    );
}
