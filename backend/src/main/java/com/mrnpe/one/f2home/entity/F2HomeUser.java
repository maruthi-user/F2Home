package com.mrnpe.one.f2home.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "f2home_users")
public class F2HomeUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_number", nullable = false, unique = true, length = 20)
    private String phoneNumber;

    @Column(name = "email")
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private F2HomeRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private F2HomeUserStatus status;

    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "village", length = 120)
    private String village;

    // Self-taken registration photo (bytea, like product media).
    @Column(name = "photo_content_type", length = 100)
    private String photoContentType;

    @Column(name = "photo_bytes")
    private byte[] photoBytes;

    @Column(name = "photo_size_bytes")
    private Long photoSizeBytes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public F2HomeRole getRole() { return role; }
    public void setRole(F2HomeRole role) { this.role = role; }

    public F2HomeUserStatus getStatus() { return status; }
    public void setStatus(F2HomeUserStatus status) { this.status = status; }

    public boolean isPhoneVerified() { return phoneVerified; }
    public void setPhoneVerified(boolean phoneVerified) { this.phoneVerified = phoneVerified; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public String getPhotoContentType() { return photoContentType; }
    public void setPhotoContentType(String photoContentType) { this.photoContentType = photoContentType; }

    public byte[] getPhotoBytes() { return photoBytes; }
    public void setPhotoBytes(byte[] photoBytes) { this.photoBytes = photoBytes; }

    public Long getPhotoSizeBytes() { return photoSizeBytes; }
    public void setPhotoSizeBytes(Long photoSizeBytes) { this.photoSizeBytes = photoSizeBytes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }
}