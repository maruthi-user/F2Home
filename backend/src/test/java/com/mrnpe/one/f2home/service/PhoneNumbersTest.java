package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.mrnpe.one.exception.BadRequestException;

class PhoneNumbersTest {

    @ParameterizedTest
    @CsvSource({
            "9876543210,        +919876543210",   // bare Indian mobile -> default +91
            "'98765 43210',     +919876543210",   // spaces ignored
            "98765-43210,       +919876543210",   // dashes ignored
            "09876543210,       +919876543210",   // trunk 0 dropped
            "919876543210,      +919876543210",   // country code without plus
            "+919876543210,     +919876543210",   // already E.164
            "'+91 98765 43210', +919876543210",
            "00919876543210,    +919876543210",   // international prefix
            "+14155552671,      +14155552671",    // other countries untouched
    })
    void normalisesEveryCommonWayOfTypingAnIndianMobile(String typed, String expected) {
        assertThat(PhoneNumbers.normalize(typed)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "   ", "12345", "5876543210", "abcdefghij", "+0123456789" })
    void rejectsThingsThatAreNotMobileNumbers(String typed) {
        assertThatThrownBy(() -> PhoneNumbers.normalize(typed)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void nullIsRejected() {
        assertThatThrownBy(() -> PhoneNumbers.normalize(null)).isInstanceOf(BadRequestException.class);
    }
}
