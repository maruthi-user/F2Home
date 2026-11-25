package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import com.mrnpe.one.exception.ResourceNotFoundException;

class TestAccountSettingsTest {
    @Test
    void enablesTestingInLocalAndStagingOnly() {
        for (String profile : new String[]{"local", "staging"}) {
            var environment = new MockEnvironment();
            environment.setActiveProfiles(profile);
            assertThat(new TestAccountSettings(environment, true).enabled()).isTrue();
            assertThat(new TestAccountSettings(environment, false).enabled()).isFalse();
        }
    }

    @Test
    void productionTakesPrecedenceOverOtherProfilesAndConfiguration() {
        for (String profile : new String[]{"prod", "production"}) {
            var environment = new MockEnvironment();
            environment.setActiveProfiles("local", profile);
            var settings = new TestAccountSettings(environment, true);
            assertThat(settings.enabled()).isFalse();
            assertThatThrownBy(settings::requireEnabled).isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
