package com.mrnpe.one.f2home.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;
import com.mrnpe.one.f2home.service.TestUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/f2home/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class TestUsersController {
    private final TestUserService users;

    public TestUsersController(TestUserService users) { this.users = users; }

    @GetMapping
    public TestUserService.UserList list(@RequestParam(defaultValue = "") @Size(max = 120) String q,
            @RequestParam(required = false) F2HomeRole role, @RequestParam(required = false) F2HomeUserStatus status,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return users.search(q, role, status, page, size);
    }

    @GetMapping("/{id}")
    public TestUserService.UserView get(@PathVariable long id) { return users.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TestUserService.UserView create(@AuthenticationPrincipal F2HomeUserPrincipal admin,
            @Valid @RequestBody TestUserService.Create request) {
        return users.create(admin.id(), request);
    }

    @PutMapping("/{id}")
    public TestUserService.UserView update(@AuthenticationPrincipal F2HomeUserPrincipal admin, @PathVariable long id,
            @Valid @RequestBody TestUserService.Details request) {
        return users.update(admin.id(), id, request);
    }

    @PutMapping("/{id}/status")
    public TestUserService.UserView status(@AuthenticationPrincipal F2HomeUserPrincipal admin, @PathVariable long id,
            @Valid @RequestBody StatusRequest request) {
        return users.status(admin.id(), id, request.status());
    }

    @PostMapping("/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@AuthenticationPrincipal F2HomeUserPrincipal admin, @PathVariable long id,
            @Valid @RequestBody PasswordRequest request) {
        users.resetPassword(admin.id(), id, request.password());
    }

    public record StatusRequest(@NotNull F2HomeUserStatus status) {}
    public record PasswordRequest(@NotBlank @Size(min = 8, max = 72) String password) {}
}
