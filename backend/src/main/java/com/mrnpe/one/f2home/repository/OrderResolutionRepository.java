package com.mrnpe.one.f2home.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.mrnpe.one.f2home.entity.OrderResolution;

public interface OrderResolutionRepository extends JpaRepository<OrderResolution, Long> {
    List<OrderResolution> findByOrderIdOrderByIdAsc(Long orderId);
}
