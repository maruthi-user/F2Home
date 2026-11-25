package com.mrnpe.one.f2home.service;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.mrnpe.one.f2home.entity.OrderStatus;
import com.mrnpe.one.f2home.repository.MarketplaceOrderRepository;

@Component
public class OrderResponseScheduler {
    private static final Logger log = LoggerFactory.getLogger(OrderResponseScheduler.class);

    private final MarketplaceOrderRepository orders;
    private final OrderDecisionService decisions;

    public OrderResponseScheduler(MarketplaceOrderRepository orders, OrderDecisionService decisions) {
        this.orders = orders;
        this.decisions = decisions;
    }

    @Scheduled(fixedDelayString = "${f2home.marketplace.order-response-sweep-ms:30000}")
    public void sweep() {
        for (Long id : orders.findDueOrderIds(OrderStatus.PLACED, Instant.now(), PageRequest.of(0, 100))) {
            try {
                decisions.expire(id);
            } catch (RuntimeException e) {
                log.warn("Could not expire order {}", id, e);
            }
        }
    }
}
