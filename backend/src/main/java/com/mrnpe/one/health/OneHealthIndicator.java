package com.mrnpe.one.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class OneHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        boolean isHealthy = checkCustomHealth();
        if (isHealthy) {
            return Health.up().withDetail("CustomHealth", "All systems are operational").build();
        } else {
            return Health.down().withDetail("CustomHealth", "Some systems are down").build();
        }
    }

    private boolean checkCustomHealth() {
        return true;
    }
}