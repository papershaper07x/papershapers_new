import { latLngToCell, cellToLatLng, polygonToCellsExperimental, POLYGON_TO_CELLS_FLAGS } from 'h3-js';

export const LOCATION_RESOLUTION = 7;
export type Coordinates = { latitude: number; longitude: number };
export function coordinates(latitude: unknown, longitude: unknown): Coordinates {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 85 || Math.abs(longitude) > 180) throw new Error('Enter a valid latitude (−85 to 85) and longitude (−180 to 180).');
  return { latitude, longitude };
}
export function coarseLocation(point: Coordinates) {
  const cell = latLngToCell(point.latitude, point.longitude, LOCATION_RESOLUTION);
  const [latitude, longitude] = cellToLatLng(cell);
  return { cell, latitude, longitude };
}
export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
// Cover a conservative bounding square, including boundary cells, then distance-filter.
// At the date line use two polygons rather than a polygon crossing ±180°.
export function nearbyCells(point: Coordinates, radiusKm: number) {
  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 10) throw new Error('Choose a radius between 1 and 10 km.');
  const latitudeSpan = radiusKm / 110;
  const longitudeSpan = radiusKm / (110 * Math.cos((Math.abs(point.latitude) + latitudeSpan) * Math.PI / 180));
  const low = point.longitude - longitudeSpan, high = point.longitude + longitudeSpan;
  const ranges = low < -180 ? [[low + 360,180],[-180,high]] : high > 180 ? [[low,180],[-180,high-360]] : [[low,high]];
  const cells = new Set<string>();
  for (const [west,east] of ranges) {
    const polygon = [[point.latitude-latitudeSpan,west],[point.latitude-latitudeSpan,east],[point.latitude+latitudeSpan,east],[point.latitude+latitudeSpan,west]];
    for (const cell of polygonToCellsExperimental(polygon,LOCATION_RESOLUTION,POLYGON_TO_CELLS_FLAGS.containmentOverlapping)) cells.add(cell);
  }
  if (cells.size > 5000) throw new Error('Search area is too large. Choose a smaller radius.');
  return [...cells];
}
