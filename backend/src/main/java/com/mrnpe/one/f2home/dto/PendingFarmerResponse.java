package com.mrnpe.one.f2home.dto;

import java.time.LocalDateTime;

import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;

/**
 * A farmer awaiting (or already past) admin review. Never carries the photo
 * bytes themselves - the admin dashboard fetches those separately via
 * {@code GET /api/f2home/admin/farmers/{id}/photo} so the list stays light.
 */
public record PendingFarmerResponse(
        Long id,
        String fullName,
        String phoneNumber,
        String village,
        F2HomeUserStatus status,
        boolean hasPhoto,
        LocalDateTime createdAt
) {
    public static PendingFarmerResponse from(F2HomeUser user) {
        return new PendingFarmerResponse(
                user.getId(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getVillage(),
                user.getStatus(),
                user.getPhotoBytes() != null && user.getPhotoBytes().length > 0,
                user.getCreatedAt());
    }
}
