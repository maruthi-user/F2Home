package com.mrnpe.one.f2home.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * Everything a new user supplies before the OTP is sent: full name, village,
 * role and the self-taken photo, keyed by phone number. The row is consumed
 * (and deleted) by {@code F2HomeAuthService.register(...)} once the OTP is
 * verified - that is the moment the real account row is created.
 */
@Entity
@Table(name = "f2home_registration_drafts", indexes = {
        @Index(name = "idx_f2home_registration_drafts_created_at", columnList = "created_at")
})
public class F2HomeRegistrationDraft {

    @Id
    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "village", nullable = false, length = 120)
    private String village;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private F2HomeRole role;

    @Column(name = "photo_content_type", nullable = false, length = 100)
    private String photoContentType;

    @Column(name = "photo_bytes", nullable = false)
    private byte[] photoBytes;

    @Column(name = "photo_size_bytes", nullable = false)
    private long photoSizeBytes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public F2HomeRole getRole() { return role; }
    public void setRole(F2HomeRole role) { this.role = role; }

    public String getPhotoContentType() { return photoContentType; }
    public void setPhotoContentType(String photoContentType) { this.photoContentType = photoContentType; }

    public byte[] getPhotoBytes() { return photoBytes; }
    public void setPhotoBytes(byte[] photoBytes) { this.photoBytes = photoBytes; }

    public long getPhotoSizeBytes() { return photoSizeBytes; }
    public void setPhotoSizeBytes(long photoSizeBytes) { this.photoSizeBytes = photoSizeBytes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
