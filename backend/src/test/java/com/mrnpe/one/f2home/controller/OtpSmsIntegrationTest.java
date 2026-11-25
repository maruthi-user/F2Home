package com.mrnpe.one.f2home.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.mrnpe.one.f2home.service.SmsSender;

/** Run against a disposable PostgreSQL database with F2HOME_OTP_TEST_DB_URL set. */
@SpringBootTest(properties = {
        "spring.config.import=optional:file:target/nonexistent.properties",
        "f2home.jwt.secret-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
})
@ActiveProfiles("prod")
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Import(OtpSmsIntegrationTest.SmsFixture.class)
@ExtendWith(OutputCaptureExtension.class)
@EnabledIfEnvironmentVariable(named = "F2HOME_OTP_TEST_DB_URL", matches = ".+")
class OtpSmsIntegrationTest {
    private static final String AUTH = "/api/f2home/auth";
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, (byte) 0xFF, (byte) 0xD9};
    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private InMemorySender sender;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("F2HOME_OTP_TEST_DB_URL"));
        registry.add("spring.datasource.username", () -> System.getenv("F2HOME_OTP_TEST_DB_USER"));
        registry.add("spring.datasource.password", () -> System.getenv().getOrDefault("F2HOME_OTP_TEST_DB_PASSWORD", ""));
    }

    @Test
    void registersAndResetsPasswordWithDeliveredCodes(CapturedOutput output) throws Exception {
        String phone = phone();
        requestRegistration(phone).andExpect(status().isOk());
        String registration = sender.codeFor(phone);
        verifyRegistration(phone, registration).andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").exists());
        verifyRegistration(phone, registration).andExpect(status().isConflict());

        requestReset(phone).andExpect(status().isOk());
        String reset = sender.codeFor(phone);
        submitReset(phone, reset).andExpect(status().isOk());
        submitReset(phone, reset).andExpect(status().isBadRequest());
        postJson("/login", "{\"phoneNumber\":\"%s\",\"password\":\"Test@123\"}".formatted(phone))
                .andExpect(status().isBadRequest());
        postJson("/login", "{\"phoneNumber\":\"%s\",\"password\":\"Changed@123\"}".formatted(phone))
                .andExpect(status().isOk());
        assertThat(output.getAll()).doesNotContain("Your F2Home verification code is", phone);
    }

    @Test
    void persistsWrongAttemptsAndRejectsExpiredCodes() throws Exception {
        String phone = phone();
        requestRegistration(phone).andExpect(status().isOk());
        String code = sender.codeFor(phone);
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++) verifyRegistration(phone, wrong).andExpect(status().isBadRequest());
        verifyRegistration(phone, code).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select attempts from f2home_otp_verifications where phone_number = ?",
                Integer.class, phone)).isEqualTo(5);

        requestRegistration(phone).andExpect(status().isOk());
        jdbc.update("update f2home_otp_verifications set expires_at = timestamp '2000-01-01 00:00:00' where phone_number = ? and not consumed", phone);
        verifyRegistration(phone, sender.codeFor(phone)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This OTP has expired. Please request a new one."));
    }

    @Test
    void resendIsLimitedAndOnlyLatestCodeRemainsActive() throws Exception {
        String phone = phone();
        for (int i = 0; i < 3; i++) requestRegistration(phone).andExpect(status().isOk());
        requestRegistration(phone).andExpect(status().isTooManyRequests());
        assertThat(jdbc.queryForObject("select count(*) from f2home_otp_verifications where phone_number = ? and not consumed",
                Integer.class, phone)).isEqualTo(1);
        verifyRegistration(phone, sender.codeFor(phone)).andExpect(status().isOk());
    }

    @Test
    void transportFailuresRollBackAndDoNotExposeTheGatewayMessage(CapturedOutput output) throws Exception {
        String registrationPhone = phone();
        sender.failFor = registrationPhone;
        requestRegistration(registrationPhone).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("SMS verification is temporarily unavailable. Please try again later."));
        assertThat(jdbc.queryForObject("select count(*) from f2home_otp_verifications where phone_number = ?",
                Integer.class, registrationPhone)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from f2home_registration_drafts where phone_number = ?",
                Integer.class, registrationPhone)).isZero();

        String customer = phone();
        requestRegistration(customer).andExpect(status().isOk());
        verifyRegistration(customer, sender.codeFor(customer)).andExpect(status().isOk());
        sender.failFor = customer;
        String unavailableResponse = requestReset(customer).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknownResponse = requestReset(phone()).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(unavailableResponse).isEqualTo(unknownResponse);
        assertThat(jdbc.queryForObject("select count(*) from f2home_otp_verifications where phone_number = ? and purpose = 'PASSWORD_RESET'",
                Integer.class, customer)).isZero();
        assertThat(output.getAll()).contains("OTP delivery failed for purpose PASSWORD_RESET")
                .doesNotContain("Synthetic gateway payload", "Your F2Home verification code is", registrationPhone, customer);
    }

    private ResultActions requestRegistration(String phone) throws Exception {
        var registration = new MockMultipartFile("registration", "registration.json", "application/json",
                ("{\"phoneNumber\":\"%s\",\"fullName\":\"Test Customer\",\"village\":\"Guntur\",\"role\":\"CUSTOMER\"}"
                        .formatted(phone)).getBytes(StandardCharsets.UTF_8));
        return mvc.perform(multipart(AUTH + "/register/request-otp")
                .file(registration).file(new MockMultipartFile("photo", "photo.jpg", "image/jpeg", JPEG)));
    }

    private ResultActions verifyRegistration(String phone, String code) throws Exception {
        return postJson("/register/verify-otp",
                "{\"phoneNumber\":\"%s\",\"otp\":\"%s\",\"password\":\"Test@123\"}".formatted(phone, code));
    }

    private ResultActions requestReset(String phone) throws Exception {
        return postJson("/forgot-password", "{\"phoneNumber\":\"%s\"}".formatted(phone));
    }

    private ResultActions submitReset(String phone, String code) throws Exception {
        return postJson("/reset-password",
                "{\"phoneNumber\":\"%s\",\"otp\":\"%s\",\"newPassword\":\"Changed@123\",\"confirmPassword\":\"Changed@123\"}"
                        .formatted(phone, code));
    }

    private ResultActions postJson(String path, String json) throws Exception {
        return mvc.perform(post(AUTH + path).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String phone() {
        return "+919" + ThreadLocalRandom.current().nextLong(100_000_000L, 1_000_000_000L);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class SmsFixture {
        @Bean InMemorySender inMemorySender() { return new InMemorySender(); }
    }

    static class InMemorySender implements SmsSender {
        private static final Pattern CODE = Pattern.compile("\\b[0-9]{6}\\b");
        private final Map<String, String> messages = new HashMap<>();
        private String failFor;

        @Override
        public void sendSms(String phone, String message) {
            if (phone.equals(failFor)) throw new IllegalStateException("Synthetic gateway payload: " + phone + " " + message);
            messages.put(phone, message);
        }

        String codeFor(String phone) {
            var matcher = CODE.matcher(messages.get(phone));
            if (!matcher.find()) throw new IllegalStateException("Test message did not contain a code.");
            return matcher.group();
        }
    }
}
