"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LayerControls from "./LayerControls.jsx";

// Fix default marker icons in Leaflet for webpack/Next bundling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
	iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
	shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RouteMapProps {
	sourceCoords: [number, number] | null;
	destCoords: [number, number] | null;
	routeData?: {
		route?: [number, number][];
		distance?: number;
		duration?: number;
		safety_score?: number;
		is_safe?: boolean;
	} | null;
}

export default function RouteMap({ sourceCoords, destCoords, routeData }: RouteMapProps) {
	const mapRef = useRef<L.Map | null>(null);
	const markersRef = useRef<{ source?: L.Marker; dest?: L.Marker }>({});
	const routeLayerRef = useRef<L.Polyline | null>(null);
	const [activeLayers, setActiveLayers] = useState({ cctv: false, infrastructure: false });
	const layerGroupsRef = useRef<{ cctv?: L.LayerGroup; infrastructure?: L.LayerGroup }>({});

	// Initialize map once
	useEffect(() => {
		if (typeof window === "undefined") return;

		if (!mapRef.current) {
			mapRef.current = L.map("map").setView([37.7749, -122.4194], 13);

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					"© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
				maxZoom: 19,
			}).addTo(mapRef.current);

			// Initialize layer groups
			layerGroupsRef.current.cctv = L.layerGroup().addTo(mapRef.current);
			layerGroupsRef.current.infrastructure = L.layerGroup().addTo(mapRef.current);
		}

		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		};
	}, []);

	// Fetch and display CCTV layer
	const toggleCCTVLayer = async () => {
		const newState = !activeLayers.cctv;
		setActiveLayers(prev => ({ ...prev, cctv: newState }));

		if (!mapRef.current || !layerGroupsRef.current.cctv) return;

		if (newState && layerGroupsRef.current.cctv?.getLayers().length === 0) {
			try {
				const bounds = mapRef.current.getBounds();
				const response = await fetch(
					`/api/cctv?min_lon=${bounds.getWest()}&min_lat=${bounds.getSouth()}&max_lon=${bounds.getEast()}&max_lat=${bounds.getNorth()}`
				);
				const data = await response.json();

				data.features?.forEach((feature: any) => {
					const cctvIcon = L.divIcon({
						className: "cctv-marker",
						html: `<div style="background-color: #DC2626; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
								<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
							</svg>
						</div>`,
						iconSize: [28, 28],
						iconAnchor: [14, 14],
					});

					const [lon, lat] = feature.geometry.coordinates;
					L.marker([lat, lon], { icon: cctvIcon })
						.bindPopup("<b>CCTV Camera</b>")
						.addTo(layerGroupsRef.current.cctv!);
				});
			} catch (error) {
				console.error("Error fetching CCTV data:", error);
			}
		}
	};

	// Fetch and display Public Infrastructure layer
	const toggleInfrastructureLayer = async () => {
		const newState = !activeLayers.infrastructure;
		setActiveLayers(prev => ({ ...prev, infrastructure: newState }));

		if (!mapRef.current || !layerGroupsRef.current.infrastructure) return;

		if (newState && layerGroupsRef.current.infrastructure?.getLayers().length === 0) {
			try {
				// Fetch public infrastructure from backend (which uses OpenStreetMap/Overpass API)
				const bounds = mapRef.current.getBounds();
				const response = await fetch(
					`/api/infrastructure?min_lon=${bounds.getWest()}&min_lat=${bounds.getSouth()}&max_lon=${bounds.getEast()}&max_lat=${bounds.getNorth()}`
				);
				const data = await response.json();

				data.features?.forEach((feature: any) => {
					let icon = '🏥';
					const type = feature.properties?.type;
					
					if (type === 'police') icon = '🚔';
					else if (type === 'fire_station') icon = '🚒';
					else if (type === 'ambulance_station') icon = '🚑';

					const infraIcon = L.divIcon({
						className: "infrastructure-marker",
						html: `<div style="background-color: #7C3AED; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px;">
							${icon}
						</div>`,
						iconSize: [32, 32],
						iconAnchor: [16, 16],
					});

					const label = feature.properties?.name || type || 'Infrastructure';
					const [lon, lat] = feature.geometry.coordinates;
					L.marker([lat, lon], { icon: infraIcon })
						.bindPopup(`<b>${label}</b>`)
						.addTo(layerGroupsRef.current.infrastructure!);
				});
			} catch (error) {
				console.error("Error fetching infrastructure data:", error);
			}
		}
	};

	const handleToggleLayer = (layer: string) => {
		if (layer === 'cctv') toggleCCTVLayer();
		if (layer === 'infrastructure') toggleInfrastructureLayer();
	};

	// Update markers when coordinates change
	useEffect(() => {
		if (!mapRef.current) return;

		if (markersRef.current.source) markersRef.current.source.remove();
		if (markersRef.current.dest) markersRef.current.dest.remove();

		if (sourceCoords) {
			const sourceIcon = L.divIcon({
				className: "custom-marker",
				html: `<div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
					</svg>
				</div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 16],
			});

			markersRef.current.source = L.marker(sourceCoords, { icon: sourceIcon })
				.addTo(mapRef.current)
				.bindPopup("<b>Source</b>");
		}

		if (destCoords) {
			const destIcon = L.divIcon({
				className: "custom-marker",
				html: `<div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
						<path d="M12 2L2 7v9c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
					</svg>
				</div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 16],
			});

			markersRef.current.dest = L.marker(destCoords, { icon: destIcon })
				.addTo(mapRef.current)
				.bindPopup("<b>Destination</b>");
		}

		if (sourceCoords && destCoords) {
			const bounds = L.latLngBounds([sourceCoords, destCoords]);
			mapRef.current.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [sourceCoords, destCoords]);

	// Draw route when route data is available
	useEffect(() => {
		if (!mapRef.current) return;

		if (routeLayerRef.current) {
			routeLayerRef.current.remove();
		}

		if (routeData && routeData.route && routeData.route.length > 0) {
			const routeCoordinates: [number, number][] = routeData.route.map((point) => [
				point[0],
				point[1],
			]);

			routeLayerRef.current = L.polyline(routeCoordinates, {
				color: routeData.is_safe ? "#10B981" : "#EF4444",
				weight: 5,
				opacity: 0.8,
				smoothFactor: 1,
			}).addTo(mapRef.current);

			const midIndex = Math.floor(routeCoordinates.length / 2);
			const popupContent = `
				<div style="text-align: center;">
					<h3 style="margin: 0 0 8px 0; font-weight: bold;">${routeData.is_safe ? "✓ Safe Route" : "⚠ Caution"}</h3>
					${routeData.distance ? `<p style="margin: 4px 0;"><strong>Distance:</strong> ${(routeData.distance / 1000).toFixed(2)} km</p>` : ""}
					${routeData.duration ? `<p style="margin: 4px 0;"><strong>Duration:</strong> ${Math.round(routeData.duration / 60)} min</p>` : ""}
					${routeData.safety_score ? `<p style=\"margin: 4px 0;\"><strong>Safety Score:</strong> ${routeData.safety_score}/100</p>` : ""}
				</div>
			`;

			L.popup()
				.setLatLng(routeCoordinates[midIndex])
				.setContent(popupContent)
				.openOn(mapRef.current);
		}
	}, [routeData]);

	return (
		<>
			<div id="map" className="absolute inset-0 z-0" />
			<LayerControls 
				activeLayers={activeLayers} 
				toggleLayer={handleToggleLayer}
			/>
		</>
	);
}
