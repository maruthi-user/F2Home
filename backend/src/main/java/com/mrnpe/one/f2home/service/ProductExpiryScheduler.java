package com.mrnpe.one.f2home.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically expires perishable listings that passed their window. */
@Component
public class ProductExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProductExpiryScheduler.class);

    private final ProductService productService;

    public ProductExpiryScheduler(ProductService productService) {
        this.productService = productService;
    }

    @Scheduled(initialDelay = 10_000,
            fixedDelayString = "${f2home.marketplace.expiry-sweep-ms:60000}")
    public void sweep() {
        try {
            int n = productService.expireDue();
            if (n > 0) log.info("Expired {} perishable listing(s)", n);
        } catch (RuntimeException e) {
            log.warn("Perishable expiry sweep failed: {}", e.getMessage());
        }
    }
}
