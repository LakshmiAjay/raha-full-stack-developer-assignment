"use client";

import { BriefcaseBusiness, LocateFixed } from "lucide-react";
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
  visits,
  active,
  tracking,
}: {
  routePoints: RoutePoint[];
  visits: VisitMarker[];
  active: boolean;
  tracking: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(720);

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
    const coordinates = [
        ...routePoints,
        ...visits.map((visit) => visit.location),
      ],
      usable = coordinates.length
        ? coordinates
        : [{ latitude: 17.385, longitude: 78.4867 }],
      zoom = fitZoom(usable, width),
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
      route = routePoints.map(screenPoint);
    return {
      tiles,
      zoom,
      originX,
      originY,
      route,
      visits: visits.map((visit) => ({ ...visit, ...screenPoint(visit.location) })),
    };
  }, [routePoints, visits, width]);

  const start = map.route[0],
    current = map.route.at(-1),
    path = map.route.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="card route-map-card">
      <div className="route-map-head">
        <div>
          <span className="eyebrow">{active ? "Live route" : "Completed route"}</span>
          <h2 className="section-title">Pathway taken</h2>
        </div>
        <div className={`tracking-chip ${tracking ? "active" : ""}`}>
          <LocateFixed size={13} />
          {active
            ? tracking
              ? "Updating every 2 min"
              : "Tracking paused"
            : `${routePoints.length} route points`}
        </div>
      </div>
      <div className="route-map" ref={containerRef} style={{ height: MAP_HEIGHT }}>
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
          {path && (
            <>
              <polyline className="route-path-shadow" points={path} />
              <polyline className="route-path" points={path} />
            </>
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
            className={`map-marker ${active ? "current" : "end"}`}
            style={{ left: current.x, top: current.y }}
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
        <span><i className="legend-dot start" /> Start</span>
        <span><i className="legend-dot customer" /> Lead meeting</span>
        <span><i className={`legend-dot ${active ? "current" : "end"}`} /> {active ? "Latest position" : "End"}</span>
      </div>
    </section>
  );
}
