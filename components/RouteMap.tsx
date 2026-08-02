"use client";

import { BriefcaseBusiness, LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Coordinate = { latitude: number; longitude: number };
type RoutePoint = Coordinate & { capturedAt: string; accuracy: number };
type VisitMarker = { _id: string; leadName: string; location: Coordinate };

const TILE_SIZE = 256,
  MAP_HEIGHT = 350;

function project(point: Coordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom,
    latitude = Math.max(-85.0511, Math.min(85.0511, point.latitude)),
    sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function fitZoom(points: Coordinate[], width: number) {
  if (points.length < 2) return 16;
  for (let zoom = 18; zoom >= 3; zoom--) {
    const projected = points.map((point) => project(point, zoom)),
      xs = projected.map((point) => point.x),
      ys = projected.map((point) => point.y);
    if (
      Math.max(...xs) - Math.min(...xs) <= width - 90 &&
      Math.max(...ys) - Math.min(...ys) <= MAP_HEIGHT - 90
    )
      return zoom;
  }
  return 3;
}

export default function RouteMap({
  routePoints,
  pathPoints,
  liveTrail,
  visits,
  active,
  tracking,
  trackingUnavailable,
  currentLocation,
  sessionNumber,
}: {
  routePoints: RoutePoint[];
  pathPoints?: Coordinate[];
  liveTrail?: RoutePoint[];
  visits: VisitMarker[];
  active: boolean;
  tracking: boolean;
  trackingUnavailable?: boolean;
  currentLocation?: RoutePoint | null;
  sessionNumber?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(720),
    [zoomOffset, setZoomOffset] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) =>
      setWidth(Math.max(320, Math.round(entry.contentRect.width))),
    );
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  const map = useMemo(() => {
    const recordedPath = pathPoints?.length ? pathPoints : routePoints,
      coordinates = [
        ...routePoints,
        ...recordedPath,
        ...(active ? (liveTrail ?? []) : []),
        ...visits.map((visit) => visit.location),
        ...(active && currentLocation ? [currentLocation] : []),
      ],
      usable = coordinates.length
        ? coordinates
        : [{ latitude: 17.385, longitude: 78.4867 }],
      zoom = Math.max(3, Math.min(18, fitZoom(usable, width) + zoomOffset)),
      projected = usable.map((point) => project(point, zoom)),
      xs = projected.map((point) => point.x),
      ys = projected.map((point) => point.y),
      centerX = (Math.min(...xs) + Math.max(...xs)) / 2,
      centerY = (Math.min(...ys) + Math.max(...ys)) / 2,
      originX = centerX - width / 2,
      originY = centerY - MAP_HEIGHT / 2,
      minTileX = Math.floor(originX / TILE_SIZE),
      maxTileX = Math.floor((originX + width) / TILE_SIZE),
      minTileY = Math.floor(originY / TILE_SIZE),
      maxTileY = Math.floor((originY + MAP_HEIGHT) / TILE_SIZE),
      tileCount = 2 ** zoom,
      tiles = [];
    for (let x = minTileX; x <= maxTileX; x++)
      for (let y = minTileY; y <= maxTileY; y++) {
        if (y < 0 || y >= tileCount) continue;
        tiles.push({
          x,
          y,
          urlX: ((x % tileCount) + tileCount) % tileCount,
        });
      }
    const screenPoint = (point: Coordinate) => {
        const world = project(point, zoom);
        return { x: world.x - originX, y: world.y - originY };
      },
      route = routePoints.map((point) => ({
        ...screenPoint(point),
        capturedAt: point.capturedAt,
      })),
      path = recordedPath.map(screenPoint),
      trail =
        active && route.at(-1)
          ? [route.at(-1)!, ...(liveTrail ?? []).map(screenPoint)]
          : [];
    return {
      tiles,
      zoom,
      originX,
      originY,
      route,
      path,
      trail,
      currentLocation:
        active && currentLocation ? screenPoint(currentLocation) : null,
      visits: visits.map((visit) => ({ ...visit, ...screenPoint(visit.location) })),
    };
  }, [
    active,
    currentLocation,
    liveTrail,
    pathPoints,
    routePoints,
    visits,
    width,
    zoomOffset,
  ]);

  const start = map.route[0],
    lastSaved = map.route.at(-1),
    current = active ? map.currentLocation : lastSaved,
    recordedPath = map.path.map((point) => `${point.x},${point.y}`).join(" "),
    livePath = map.trail.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="card route-map-card">
      <div className="route-map-head">
        <div>
          <span className="eyebrow">
            {sessionNumber ? `Session ${sessionNumber} · ` : ""}
            {active ? "Live route" : "Completed route"}
          </span>
          <h2 className="section-title">Pathway taken</h2>
        </div>
        <div
          className={`tracking-chip ${tracking && currentLocation ? "active" : ""}`}
        >
          <LocateFixed size={13} />
          {active
            ? !tracking
              ? "Tracking paused"
              : trackingUnavailable
                ? "Location unavailable"
                : currentLocation
                  ? "Live · saves every 2 min"
                  : "Finding device GPS"
            : `${routePoints.length} route points`}
        </div>
      </div>
      <div className="route-map" ref={containerRef} style={{ height: MAP_HEIGHT }}>
        <div className="map-zoom-controls" aria-label="Map zoom controls">
          <button
            className="map-zoom-button"
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={map.zoom >= 18}
            onClick={() => setZoomOffset((value) => Math.min(15, value + 1))}
          >
            <Plus size={17} />
          </button>
          <button
            className="map-zoom-button"
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={map.zoom <= 3}
            onClick={() => setZoomOffset((value) => Math.max(-15, value - 1))}
          >
            <Minus size={17} />
          </button>
        </div>
        {map.tiles.map((tile) => (
          <img
            alt=""
            aria-hidden="true"
            draggable={false}
            key={`${map.zoom}-${tile.x}-${tile.y}`}
            src={`https://tile.openstreetmap.org/${map.zoom}/${tile.urlX}/${tile.y}.png`}
            style={{
              left: tile.x * TILE_SIZE - map.originX,
              top: tile.y * TILE_SIZE - map.originY,
            }}
          />
        ))}
        <svg aria-label="Recorded route pathway" className="route-overlay">
          {recordedPath && (
            <>
              <polyline className="route-path-shadow" points={recordedPath} />
              <polyline className="route-path" points={recordedPath} />
            </>
          )}
          {livePath && tracking && (
            <polyline className="live-route-leg" points={livePath} />
          )}
        </svg>
        {start && (
          <div className="map-marker start" style={{ left: start.x, top: start.y }}>
            S
          </div>
        )}
        {map.visits.map((visit) => (
          <div
            className="map-marker customer"
            key={visit._id}
            style={{ left: visit.x, top: visit.y }}
            title={`Meeting with ${visit.leadName}`}
          >
            <BriefcaseBusiness size={13} />
          </div>
        ))}
        {current && (
          <div
            aria-label={active ? "My current device location" : "Session end"}
            className={`map-marker ${active ? "current live-device" : "end"}`}
            role="img"
            style={{ left: current.x, top: current.y }}
            title={active ? "My current device location" : "Session end"}
          >
            {active ? <LocateFixed size={14} /> : "E"}
          </div>
        )}
        {!routePoints.length && (
          <div className="route-map-empty">Start the day to begin your route.</div>
        )}
        <a
          className="map-attribution"
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          © OpenStreetMap
        </a>
      </div>
      <div className="route-legend">
        <span><i className="legend-line recorded" /> Saved road path</span>
        {active && tracking && (
          <span><i className="legend-line live" /> Live device trail</span>
        )}
        <span><i className="legend-dot start" /> Start</span>
        <span><i className="legend-dot customer" /> Lead meeting</span>
        {active && currentLocation ? (
          <span><i className="legend-dot current" /> My live location</span>
        ) : !active ? (
          <span><i className="legend-dot end" /> Session end</span>
        ) : null}
      </div>
    </section>
  );
}
