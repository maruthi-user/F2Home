package com.mrnpe.one.f2home.entity;

import java.math.BigDecimal;
import java.time.Instant;

import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "f2home_order_resolutions")
public class OrderResolution {
    public enum Action {
        RETRY_DELIVERY, CLOSE_FAILED_DELIVERY, CONFIRM_FULL_CASH, KEEP_RECORDED_CASH;

        public boolean isCashResolution() {
            return this == CONFIRM_FULL_CASH || this == KEEP_RECORDED_CASH;
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long orderId;
    @Column(nullable = false)
    private Long adminId;
    @Column(nullable = false)
    private String adminName;
    @Column(nullable = false)
    private Instant resolvedAt;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Action action;
    @Column(nullable = false, length = 500)
    private String reason;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus previousStatus;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus resultingStatus;
    @Column(precision = 12, scale = 2)
    private BigDecimal previousCash;
    @Column(precision = 12, scale = 2)
    private BigDecimal resultingCash;

    protected OrderResolution() {}

    public OrderResolution(MarketplaceOrder order, F2HomeUserPrincipal admin, Action action, String reason) {
        this.orderId = order.getId();
        this.adminId = admin.id();
        this.adminName = admin.fullName();
        this.resolvedAt = Instant.now();
        this.action = action;
        this.reason = reason;
        this.previousStatus = order.getStatus();
        this.previousCash = order.getCashCollected();
    }

    public void captureResult(MarketplaceOrder order) {
        resultingStatus = order.getStatus();
        resultingCash = order.getCashCollected();
    }

    public Long getId() { return id; }
    public Long getAdminId() { return adminId; }
    public String getAdminName() { return adminName; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Action getAction() { return action; }
    public String getReason() { return reason; }
    public OrderStatus getPreviousStatus() { return previousStatus; }
    public OrderStatus getResultingStatus() { return resultingStatus; }
    public BigDecimal getPreviousCash() { return previousCash; }
    public BigDecimal getResultingCash() { return resultingCash; }
}
