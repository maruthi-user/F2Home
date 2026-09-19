package com.mrnpe.one.f2home.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.MarketplaceOrder;

@Repository
public interface MarketplaceOrderRepository extends JpaRepository<MarketplaceOrder, Long> {

    List<MarketplaceOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
