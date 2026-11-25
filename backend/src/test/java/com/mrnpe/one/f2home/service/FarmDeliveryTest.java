package com.mrnpe.one.f2home.service;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class FarmDeliveryTest {
    @Test
    void radiusBoundaryIsInclusiveAndDateUsesNextScheduledDay() {
        LocalDate monday = LocalDate.of(2026, 11, 23);
        double boundary = GeoUtils.haversineKm(16.3, 80.44, 16.4, 80.44);
        var atBoundary = FarmDelivery.check(16.3, 80.44, "MON,THU", boundary, 16.4, 80.44, monday);
        assertThat(atBoundary.reason()).isNull();
        assertThat(atBoundary.date()).isEqualTo(monday.plusDays(3));
        assertThat(FarmDelivery.check(16.3, 80.44, "MON,THU", boundary - .001, 16.4, 80.44, monday).date()).isNull();
        assertThat(FarmDelivery.check(16.3, 80.44, "MON,THU", boundary + .001, 16.4, 80.44, monday).date()).isNotNull();
    }
}
