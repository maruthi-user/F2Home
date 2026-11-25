package com.mrnpe.one.f2home.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;

final class FarmDelivery {
    record Availability(double distanceKm, LocalDate date, String reason) {}

    static LocalDate today() {
        return LocalDate.now(ZoneId.of("Asia/Kolkata"));
    }

    static Availability check(Double farmLat, Double farmLng, String schedule, double radius,
            double lat, double lng, LocalDate today) {
        if (farmLat == null || farmLng == null || schedule == null || schedule.isBlank()) {
            return new Availability(0, null, "This farm has not set up delivery yet.");
        }
        double distance = GeoUtils.haversineKm(farmLat, farmLng, lat, lng);
        if (distance > radius) {
            return new Availability(distance, null, "This address is outside the farm's " + radius + " km delivery area.");
        }
        var days = Arrays.asList(schedule.split(","));
        for (int offset = 1; offset <= 7; offset++) {
            LocalDate candidate = today.plusDays(offset);
            if (days.contains(candidate.getDayOfWeek().name().substring(0, 3))) return new Availability(distance, candidate, null);
        }
        return new Availability(distance, null, "This farm has no available delivery days.");
    }

    private FarmDelivery() {}
}
