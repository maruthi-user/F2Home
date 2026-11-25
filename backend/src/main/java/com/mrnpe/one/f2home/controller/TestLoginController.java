package com.mrnpe.one.f2home.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import com.mrnpe.one.f2home.dto.AuthResponse;
import com.mrnpe.one.f2home.service.F2HomeAuthService;
import com.mrnpe.one.f2home.service.TestAccountSettings;

@RestController
@RequestMapping("/api/f2home/auth")
public class TestLoginController {
    private final TestAccountSettings settings;
    private final F2HomeAuthService auth;

    public TestLoginController(TestAccountSettings settings, F2HomeAuthService auth) {
        this.settings = settings;
        this.auth = auth;
    }

    @GetMapping("/login-options")
    public Map<String, Boolean> loginOptions() {
        return Map.of("usernameEnabled", settings.enabled());
    }

    @PostMapping("/username-login")
    public AuthResponse login(@Valid @RequestBody UsernameLogin request) {
        settings.requireEnabled();
        return auth.loginWithUsername(request.username().strip(), request.password());
    }

    public record UsernameLogin(@NotBlank @Size(max = 40) String username, @NotBlank String password) {}
}
