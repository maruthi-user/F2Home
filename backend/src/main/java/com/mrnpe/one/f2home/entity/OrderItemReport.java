package com.mrnpe.one.f2home.entity;

import java.time.Instant;
import jakarta.persistence.*;

@Entity
@Table(name = "f2home_item_reports")
public class OrderItemReport {
    public enum Kind { MISSING, DAMAGED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long orderId;
    private Long itemId;
    private String itemName;
    @Enumerated(EnumType.STRING)
    private Kind kind;
    private String details;
    private Instant createdAt;
    private Instant resolvedAt;
    private Long adminId;
    private String adminName;
    private String resolution;

    protected OrderItemReport() {}

    public OrderItemReport(Long orderId, OrderItem item, Kind kind, String details) {
        this.orderId = orderId;
        this.itemId = item.getId();
        this.itemName = item.getProductName();
        this.kind = kind;
        this.details = details;
        this.createdAt = Instant.now();
    }

    public void resolve(Long adminId, String adminName, String resolution) {
        this.adminId = adminId;
        this.adminName = adminName;
        this.resolution = resolution;
        this.resolvedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getOrderId() { return orderId; }
    public Long getItemId() { return itemId; }
    public String getItemName() { return itemName; }
    public Kind getKind() { return kind; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Long getAdminId() { return adminId; }
    public String getAdminName() { return adminName; }
    public String getResolution() { return resolution; }
}
