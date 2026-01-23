'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    ChevronLeft,
    Camera,
    MapPin,
    Check,
    Upload,
    Loader2,
    Globe,
    X
} from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';

const TINT_COLORS = [
    { id: 'slate', value: 'bg-slate-500' },
    { id: 'pink', value: 'bg-pink-500' },
    { id: 'purple', value: 'bg-purple-500' },
    { id: 'indigo', value: 'bg-indigo-500' },
    { id: 'blue', value: 'bg-blue-500' },
    { id: 'green', value: 'bg-green-500' },
    { id: 'yellow', value: 'bg-yellow-500' },
    { id: 'orange', value: 'bg-orange-500' },
    { id: 'red', value: 'bg-red-500' },
];

interface CityResult {
    id: number;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
}

export default function CreateCalendarPage() {
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState('indigo');
    const [locationType, setLocationType] = useState<'city' | 'global'>('city');
    const [location, setLocation] = useState('');
    const [viewState, setViewState] = useState({
        longitude: -74.006,
        latitude: 40.7128,
        zoom: 12
    });

    // Image State
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [avatarImage, setAvatarImage] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // City Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<CityResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Image Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (type === 'cover') setCoverImage(url);
            else setAvatarImage(url);
        }
    };

    // City Search Handler
    useEffect(() => {
        if (!location || location.length < 3 || locationType === 'global') {
            setSearchResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en&format=json`);
                const data = await res.json();
                if (data.results) {
                    setSearchResults(data.results);
                    setShowResults(true);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Failed to search cities', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [location, locationType]);

    const selectCity = (city: CityResult) => {
        const locationString = city.admin1
            ? `${city.name}, ${city.admin1}, ${city.country}`
            : `${city.name}, ${city.country}`;
        setLocation(locationString);
        setShowResults(false);
        setViewState({
            latitude: city.latitude,
            longitude: city.longitude,
            zoom: 12
        });
    };

    return (
        <div className="min-h-screen bg-bg-primary pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-text-secondary" />
                        </Link>
                        <h1 className="text-lg font-bold text-text-primary">Create Calendar</h1>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                {/* Main Card */}
                <GlossyCard className="overflow-hidden bg-[#1C1C1E]">
                    {/* Cover Image Area */}
                    <div className="h-48 bg-white/5 relative group">
                        {coverImage ? (
                            <Image
                                src={coverImage}
                                alt="Cover"
                                fill
                                className="object-cover transition-opacity group-hover:opacity-75"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="flex items-center gap-2 text-sm font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">
                                    <Camera size={16} /> Change Cover
                                </span>
                            </div>
                        )}

                        <button
                            onClick={() => coverInputRef.current?.click()}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors z-10"
                        >
                            {coverImage ? 'Edit Cover' : 'Change Cover'}
                        </button>
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'cover')}
                        />
                    </div>

                    <div className="px-8 pb-8">
                        {/* Avatar Upload */}
                        <div className="-mt-10 mb-6 relative inline-block z-20">
                            <div
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-20 h-20 rounded-2xl bg-[#2C2C2E] border-4 border-[#1C1C1E] flex items-center justify-center shadow-xl cursor-pointer hover:bg-[#3C3C3E] transition-colors group overflow-hidden relative"
                            >
                                {avatarImage ? (
                                    <Image
                                        src={avatarImage}
                                        alt="Avatar"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <Upload size={24} className="text-text-muted group-hover:text-white transition-colors" />
                                )}
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, 'avatar')}
                            />
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Calendar Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-transparent text-3xl font-bold text-text-primary placeholder:text-text-muted/50 border-none outline-none focus:ring-0 p-0"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Add a short description..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-transparent text-base text-text-secondary placeholder:text-text-muted/50 border-none outline-none focus:ring-0 p-0"
                                />
                            </div>
                        </div>
                    </div>
                </GlossyCard>

                {/* Customization Card */}
                <GlossyCard className="p-8 bg-[#1C1C1E] space-y-8">
                    <h2 className="text-lg font-bold text-text-primary">Customization</h2>

                    {/* Tint Color */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-text-secondary">Tint Color</label>
                        <div className="flex flex-wrap gap-3">
                            {TINT_COLORS.map((color) => (
                                <button
                                    key={color.id}
                                    onClick={() => setSelectedColor(color.id)}
                                    className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-transform hover:scale-110 ${selectedColor === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1C1E]' : ''
                                        }`}
                                >
                                    {selectedColor === color.id && <Check size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Public URL */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-text-secondary">Public URL</label>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                            <span className="text-text-muted select-none">luma.com/</span>
                            <input
                                type="text"
                                placeholder="username"
                                className="flex-1 bg-transparent border-none outline-none text-text-primary ml-1 placeholder:text-text-muted/50"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-3 w-full">
                        <label className="text-sm font-medium text-text-secondary">Location</label>
                        <div className="flex gap-4">
                            {/* Toggle */}
                            <div className="w-[200px] h-[44px] bg-[#2C2C2E] p-1 rounded-lg flex shrink-0">
                                <button
                                    onClick={() => setLocationType('city')}
                                    className={`flex-1 rounded-md text-sm font-medium transition-all ${locationType === 'city' ? 'bg-[#3A3A3C] text-white shadow-sm' : 'text-text-muted hover:text-text-secondary'
                                        }`}
                                >
                                    City
                                </button>
                                <button
                                    onClick={() => {
                                        setLocationType('global');
                                        setViewState({
                                            latitude: 20,
                                            longitude: 0,
                                            zoom: 1.5
                                        });
                                    }}
                                    className={`flex-1 rounded-md text-sm font-medium transition-all ${locationType === 'global' ? 'bg-[#3A3A3C] text-white shadow-sm' : 'text-text-muted hover:text-text-secondary'
                                        }`}
                                >
                                    Global
                                </button>
                            </div>

                            {/* Map Input Area */}
                            <div className="flex-1 h-[140px] rounded-xl relative overflow-hidden group">
                                <div className="absolute inset-0">
                                    <Map
                                        {...viewState}
                                        onMove={evt => setViewState(evt.viewState)}
                                        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                                        attributionControl={false}
                                    />
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                                    <div className={`w-full max-w-[280px] h-[40px] bg-[#1C1C1E]/90 backdrop-blur-md rounded-lg flex items-center px-3 gap-3 border border-white/10 shadow-lg pointer-events-auto relative z-20 transition-transform ${locationType === 'city' ? 'hover:scale-[1.02]' : 'opacity-50'}`}>
                                        {isSearching ? <Loader2 size={16} className="text-text-muted animate-spin shrink-0" /> : <MapPin size={16} className="text-text-muted shrink-0" />}
                                        <input
                                            type="text"
                                            placeholder={locationType === 'global' ? "Global Location" : "Pick a city"}
                                            value={locationType === 'global' ? '' : location}
                                            onChange={(e) => {
                                                setLocation(e.target.value);
                                                setShowResults(true);
                                            }}
                                            onFocus={() => setShowResults(true)}
                                            className="w-full bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted/50 h-full"
                                            disabled={locationType === 'global'}
                                        />
                                        {location && locationType === 'city' && (
                                            <button onClick={() => { setLocation(''); setSearchResults([]); }} className="text-text-muted hover:text-white">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showResults && searchResults.length > 0 && locationType === 'city' && (
                                    <div className="absolute top-[85px] left-1/2 -translate-x-1/2 w-full max-w-[280px] bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 flex flex-col">
                                        {searchResults.map((city) => (
                                            <button
                                                key={city.id}
                                                onClick={() => selectCity(city)}
                                                className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-white/5 border-b border-white/5 last:border-0 flex flex-col"
                                            >
                                                <span className="font-medium">{city.name}</span>
                                                <span className="text-xs text-text-muted">
                                                    {[city.admin1, city.country].filter(Boolean).join(', ')}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </GlossyCard>

                {/* Submit Action */}
                <div className="pt-4">
                    <Button
                        size="lg"
                        fullWidth
                        className="h-12 text-base font-bold bg-white text-black hover:bg-white/90"
                        onClick={() => router.push('/')}
                    >
                        Create Calendar
                    </Button>
                </div>
            </main>
        </div>
    );
}
