package com.mrnpe.one.f2home.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.MarketplaceOrder;
import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.entity.OrderResolution.Action;
import jakarta.persistence.LockModeType;

@Repository
public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, Long> {

    List<MarketplaceOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<MarketplaceOrder> findByIdAndCustomerId(Long id, Long customerId);

    Optional<MarketplaceOrder> findByCustomerIdAndIdempotencyKey(Long customerId, UUID idempotencyKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from MarketplaceOrder o where o.id = :id")
    Optional<MarketplaceOrder> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            select o.id from MarketplaceOrder o
            where o.status = :status and o.responseDeadline <= :now
            order by o.responseDeadline, o.id
            """)
    List<Long> findDueOrderIds(@Param("status") OrderStatus status, @Param("now") Instant now, Pageable limit);

    @Query("""
            select o from MarketplaceOrder o
            where (:term = '' or o.id = :reference
                   or locate(:term, lower(o.customerName)) > 0
                   or locate(:term, o.customerPhone) > 0
                   or locate(:term, lower(o.contactName)) > 0
                   or locate(:term, o.contactPhone) > 0
                   or exists (select item.id from MarketplaceOrder matching join matching.items item
                             where matching.id = o.id and locate(:term, lower(item.farmerName)) > 0))
              and (:delivery = false or o.status = com.mrnpe.one.f2home.entity.OrderStatus.DELIVERY_FAILED)
              and (:cash = false or (o.status = com.mrnpe.one.f2home.entity.OrderStatus.DELIVERED
                  and o.paymentMethod = com.mrnpe.one.f2home.entity.PaymentMethod.COD
                  and o.paymentStatus = com.mrnpe.one.f2home.entity.PaymentStatus.COLLECTION_EXCEPTION
                  and not exists (select r.id from OrderResolution r where r.orderId = o.id and r.action in :cashActions)))
              and (:support = false or exists (select report.id from OrderItemReport report
                   where report.orderId = o.id and report.resolvedAt is null))
              and (:resolved = false or exists (select a.id from OrderResolution a where a.orderId = o.id)
                   or exists (select report.id from OrderItemReport report
                              where report.orderId = o.id and report.resolvedAt is not null))
            order by o.createdAt desc, o.id desc
            """)
    Slice<MarketplaceOrder> searchForAdmin(@Param("term") String term, @Param("reference") Long reference,
            @Param("delivery") boolean delivery, @Param("cash") boolean cash, @Param("resolved") boolean resolved,
            @Param("support") boolean support, @Param("cashActions") List<Action> cashActions, Pageable pageable);

    /** Units sold and revenue per product for one farmer (cancelled orders excluded). */
    @Query("""
            select i.productId as productId, sum(i.quantity) as quantity, sum(i.lineTotal) as revenue
            from MarketplaceOrder o join o.items i
            where i.farmerId = :farmerId
              and o.status <> com.mrnpe.one.f2home.entity.OrderStatus.CANCELLED
              and i.productId is not null
              and i.status = com.mrnpe.one.f2home.entity.OrderItemStatus.ACCEPTED
            group by i.productId
            """)
    List<SoldRow> soldByProduct(@Param("farmerId") Long farmerId);

    interface SoldRow {
        Long getProductId();

        Long getQuantity();

        BigDecimal getRevenue();
    }

    /** [order, line] pairs for every line sold by this farmer, newest first. */
    @Query("""
            select o, i from MarketplaceOrder o join o.items i
            where i.farmerId = :farmerId
            order by o.createdAt desc, i.id asc
            """)
    List<Object[]> findLinesForFarmer(@Param("farmerId") Long farmerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from MarketplaceOrder o where o.id = (select parent.id from MarketplaceOrder parent join parent.items i where i.id = :itemId)")
    java.util.Optional<MarketplaceOrder> findByItemId(@Param("itemId") Long itemId);
}
