package com.mrnpe.one.f2home.service;

/** Great-circle helpers shared by the nearby query. */
public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double KM_PER_DEGREE_LAT = 111.32;

    private GeoUtils() {
    }

    /** Haversine distance between two points, in km. */
    public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
    }

    /**
     * Bounding box (minLat, maxLat, minLng, maxLng) that fully contains the
     * circle of {@code radiusKm} around the point - the SQL pre-filter.
     */
    public static double[] boundingBox(double lat, double lng, double radiusKm) {
        double dLat = radiusKm / KM_PER_DEGREE_LAT;
        double cos = Math.max(Math.cos(Math.toRadians(lat)), 0.01); // avoid /0 at the poles
        double dLng = radiusKm / (KM_PER_DEGREE_LAT * cos);
        return new double[] {
                Math.max(-90, lat - dLat), Math.min(90, lat + dLat),
                Math.max(-180, lng - dLng), Math.min(180, lng + dLng)
        };
    }
}
