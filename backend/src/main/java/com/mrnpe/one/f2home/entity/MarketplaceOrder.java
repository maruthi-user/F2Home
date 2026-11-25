package com.mrnpe.one.f2home.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * A customer's checkout: many {@link OrderItem} lines + delivery address +
 * payment. Named MarketplaceOrder to avoid clashing with Spring's @Order.
 */
@Entity
@Table(name = "f2home_orders")
public class MarketplaceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "idempotency_key")
    private UUID idempotencyKey;

    @Column(name = "request_fingerprint", length = 64)
    private String requestFingerprint;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_phone", nullable = false, length = 20)
    private String customerPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PLACED;

    @Column(name = "response_deadline")
    private Instant responseDeadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "closure_reason", length = 32)
    private OrderClosureReason closureReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Column(name = "cash_collected", precision = 12, scale = 2)
    private BigDecimal cashCollected;

    @Column(name = "item_count", nullable = false)
    private int itemCount;

    @Column(name = "subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "total", nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "address_mode", nullable = false, length = 20)
    private AddressMode addressMode;

    @Column(name = "address_label")
    private String addressLabel;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_landmark")
    private String addressLandmark;

    @Column(name = "address_city", length = 100)
    private String addressCity;

    @Column(name = "address_pincode", length = 10)
    private String addressPincode;

    @Column(name = "address_lat")
    private Double addressLat;

    @Column(name = "address_lng")
    private Double addressLng;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(name = "contact_phone", nullable = false, length = 20)
    private String contactPhone;

    @Column(name = "delivery_note", length = 500)
    private String deliveryNote;

    // Lines are only ever read with their order, so eager + cascade is the
    // simplest correct mapping here.
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "order_id", nullable = false)
    @OrderBy("id ASC")
    private List<OrderEvent> events = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
    public void setIdempotencyKey(UUID idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getRequestFingerprint() { return requestFingerprint; }
    public void setRequestFingerprint(String requestFingerprint) { this.requestFingerprint = requestFingerprint; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public Instant getResponseDeadline() { return responseDeadline; }
    public void setResponseDeadline(Instant responseDeadline) { this.responseDeadline = responseDeadline; }
    public OrderClosureReason getClosureReason() { return closureReason; }
    public void setClosureReason(OrderClosureReason closureReason) { this.closureReason = closureReason; }

    public void recordStatus(OrderStatus status, String note) {
        setStatus(status);
        events.add(new OrderEvent(status, Instant.now(), note));
    }
    public List<OrderEvent> getEvents() { return events; }
    public BigDecimal getCashCollected() { return cashCollected; }
    public void setCashCollected(BigDecimal cashCollected) { this.cashCollected = cashCollected; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public int getItemCount() { return itemCount; }
    public void setItemCount(int itemCount) { this.itemCount = itemCount; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public void setDeliveryFee(BigDecimal deliveryFee) { this.deliveryFee = deliveryFee; }
    public LocalDate getDeliveryDate() { return deliveryDate; }
    public void setDeliveryDate(LocalDate deliveryDate) { this.deliveryDate = deliveryDate; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public AddressMode getAddressMode() { return addressMode; }
    public void setAddressMode(AddressMode addressMode) { this.addressMode = addressMode; }
    public String getAddressLabel() { return addressLabel; }
    public void setAddressLabel(String addressLabel) { this.addressLabel = addressLabel; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }
    public String getAddressLandmark() { return addressLandmark; }
    public void setAddressLandmark(String addressLandmark) { this.addressLandmark = addressLandmark; }
    public String getAddressCity() { return addressCity; }
    public void setAddressCity(String addressCity) { this.addressCity = addressCity; }
    public String getAddressPincode() { return addressPincode; }
    public void setAddressPincode(String addressPincode) { this.addressPincode = addressPincode; }
    public Double getAddressLat() { return addressLat; }
    public void setAddressLat(Double addressLat) { this.addressLat = addressLat; }
    public Double getAddressLng() { return addressLng; }
    public void setAddressLng(Double addressLng) { this.addressLng = addressLng; }
    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getDeliveryNote() { return deliveryNote; }
    public void setDeliveryNote(String deliveryNote) { this.deliveryNote = deliveryNote; }
    public List<OrderItem> getItems() { return items; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
