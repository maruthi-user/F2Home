package com.mrnpe.one.f2home.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.mrnpe.one.f2home.entity.OrderItemReport;

public interface OrderItemReportRepository extends JpaRepository<OrderItemReport, Long> {
    List<OrderItemReport> findByOrderIdOrderByIdDesc(Long orderId);
    boolean existsByItemIdAndResolvedAtIsNull(Long itemId);
}
