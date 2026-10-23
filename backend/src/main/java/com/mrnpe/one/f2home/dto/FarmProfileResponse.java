package com.mrnpe.one.f2home.dto;

import java.util.List;

import com.mrnpe.one.f2home.entity.F2HomeUser;

/** A farmer's farm pin and delivery reach - null fields mean "not set yet". */
public record FarmProfileResponse(
        Double lat,
        Double lng,
        String locationLabel,
        Double deliveryRadiusKm,
        List<String> deliveryDays,
        double effectiveRadiusKm
) {
    public static FarmProfileResponse from(F2HomeUser user, double defaultRadiusKm) {
        return new FarmProfileResponse(
                user.getFarmLat(),
                user.getFarmLng(),
                user.getFarmLocationLabel(),
                user.getDeliveryRadiusKm(),
                user.getDeliveryDays() == null || user.getDeliveryDays().isBlank()
                        ? List.of()
                        : List.of(user.getDeliveryDays().split(",")),
                user.getDeliveryRadiusKm() != null ? user.getDeliveryRadiusKm() : defaultRadiusKm);
    }
}
