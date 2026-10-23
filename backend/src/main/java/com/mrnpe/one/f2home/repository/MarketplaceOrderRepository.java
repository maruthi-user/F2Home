package com.mrnpe.one.f2home.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.MarketplaceOrder;

@Repository
public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, Long> {

    List<MarketplaceOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

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

    @Query("select o from MarketplaceOrder o join o.items i where i.id = :itemId")
    java.util.Optional<MarketplaceOrder> findByItemId(@Param("itemId") Long itemId);
}
