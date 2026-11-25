package com.mrnpe.one.f2home.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import com.mrnpe.one.exception.ResourceNotFoundException;

@Component
public class TestAccountSettings {
    private final boolean enabled;

    public TestAccountSettings(Environment environment,
            @Value("${f2home.test-accounts.enabled:true}") boolean configured) {
        enabled = configured && environment.matchesProfiles("(local | staging) & !prod & !production");
    }

    public boolean enabled() { return enabled; }

    public void requireEnabled() {
        if (!enabled) throw new ResourceNotFoundException("Test account management is unavailable.");
    }
}
