package com.mrnpe.one.f2home.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "f2home_order_events")
public class OrderEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(length = 300)
    private String note;

    protected OrderEvent() {}

    public OrderEvent(OrderStatus status, Instant occurredAt, String note) {
        this.status = status;
        this.occurredAt = occurredAt;
        this.note = note;
    }

    public OrderStatus getStatus() { return status; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getNote() { return note; }
}
