package com.mrnpe.one.f2home.service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.FarmProfileRequest;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest.Address;
import com.mrnpe.one.f2home.entity.*;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.RefreshTokenRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@Service
public class TestUserService {
    private final TestAccountSettings settings;
    private final F2HomeUserRepository users;
    private final RefreshTokenRepository sessions;
    private final SavedAddressService addresses;
    private final FarmProfileService farms;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;

    public TestUserService(TestAccountSettings settings, F2HomeUserRepository users, RefreshTokenRepository sessions,
            SavedAddressService addresses, FarmProfileService farms, PasswordEncoder encoder, JdbcTemplate jdbc) {
        this.settings = settings;
        this.users = users;
        this.sessions = sessions;
        this.addresses = addresses;
        this.farms = farms;
        this.encoder = encoder;
        this.jdbc = jdbc;
    }

    public record Details(@NotBlank @Size(max = 120) String fullName,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9._-]{2,39}") String username,
            @NotBlank @Size(max = 25) String phoneNumber, @NotBlank @Size(max = 120) String location,
            @Valid FarmProfileRequest farm, @Valid CustomerLocation customerAddress) {}

    public record CustomerLocation(@NotBlank @Size(max = 255) String street, @NotBlank @Size(max = 100) String city,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String pincode,
            @NotNull @Min(-90) @Max(90) Double lat, @NotNull @Min(-180) @Max(180) Double lng) {}

    public record Create(@Valid @NotNull Details details, @NotNull F2HomeRole role,
            boolean pendingApproval, @NotBlank @Size(min = 8, max = 72) String password) {}

    public record UserView(Long id, F2HomeRole role, F2HomeUserStatus status, Details details) {}
    public record UserList(List<UserView> users, boolean hasNext) {}

    @Transactional(readOnly = true)
    public UserList search(String query, F2HomeRole role, F2HomeUserStatus status, int page, int size) {
        settings.requireEnabled();
        var result = users.searchTestAccounts(query.strip().toLowerCase(Locale.ROOT), role, status,
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(50, size))));
        return new UserList(result.stream().map(user -> view(user, false)).toList(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public UserView get(long id) {
        settings.requireEnabled();
        return users.findById(id).filter(F2HomeUser::isTestAccount).map(user -> view(user, true))
                .orElseThrow(() -> new ResourceNotFoundException("Test account not found."));
    }

    @Transactional
    public UserView create(long admin, Create request) {
        settings.requireEnabled();
        if (request.role() != F2HomeRole.CUSTOMER && request.role() != F2HomeRole.FARMER) {
            throw new BadRequestException("Choose Farmer or Customer.");
        }
        var user = new F2HomeUser();
        user.setTestAccount(true);
        user.setRole(request.role());
        user.setStatus(request.role() == F2HomeRole.FARMER && request.pendingApproval()
                ? F2HomeUserStatus.PENDING_APPROVAL : F2HomeUserStatus.ACTIVE);
        user.setPasswordHash(hash(request.password()));
        apply(user, request.details());
        save(user);
        saveAddress(user, request.details().customerAddress());
        audit(admin, user, "CREATE");
        return view(user, true);
    }

    @Transactional
    public UserView update(long admin, long id, Details details) {
        var user = managed(id);
        String previousPhone = user.getPhoneNumber();
        apply(user, details);
        if (!previousPhone.equals(user.getPhoneNumber())) revoke(user);
        save(user);
        saveAddress(user, details.customerAddress());
        audit(admin, user, "UPDATE");
        return view(user, true);
    }

    @Transactional
    public UserView status(long admin, long id, F2HomeUserStatus status) {
        var user = managed(id);
        if (status == F2HomeUserStatus.PENDING_APPROVAL && user.getRole() != F2HomeRole.FARMER) {
            throw new BadRequestException("Only farmers can be pending approval.");
        }
        if (user.getStatus() != status) {
            user.setStatus(status);
            if (status == F2HomeUserStatus.INACTIVE) revoke(user);
            audit(admin, user, status.name());
        }
        return view(user, false);
    }

    @Transactional
    public void resetPassword(long admin, long id, String password) {
        var user = managed(id);
        user.setPasswordHash(hash(password));
        revoke(user);
        audit(admin, user, "RESET_PASSWORD");
    }

    private F2HomeUser managed(long id) {
        settings.requireEnabled();
        return users.lockForCheckout(id).filter(F2HomeUser::isTestAccount)
                .orElseThrow(() -> new ResourceNotFoundException("Test account not found."));
    }

    private void apply(F2HomeUser user, Details details) {
        String phone = PhoneNumbers.normalize(details.phoneNumber());
        String username = details.username().toLowerCase(Locale.ROOT);
        if (!phone.equals(user.getPhoneNumber()) && users.existsByPhoneNumber(phone)) {
            throw new BadRequestException("This phone number is already in use.");
        }
        if (!username.equals(user.getUsername()) && users.existsByUsernameIgnoreCase(username)) {
            throw new BadRequestException("This username is already in use.");
        }
        if (user.getRole() == F2HomeRole.FARMER) {
            if (details.farm() == null) throw new BadRequestException("Enter the farm coordinates, radius and delivery days.");
            farms.apply(user, details.farm());
        } else if (details.farm() != null) {
            throw new BadRequestException("Farm settings are only available for farmers.");
        }
        if (user.getRole() != F2HomeRole.CUSTOMER && details.customerAddress() != null) {
            throw new BadRequestException("Delivery addresses are only available for customers.");
        }
        user.setUsername(username);
        user.setPhoneNumber(phone);
        user.setFullName(details.fullName().strip());
        user.setVillage(details.location().strip());
    }

    private void save(F2HomeUser user) {
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new BadRequestException("The username or phone number is already in use.");
        }
    }

    private void saveAddress(F2HomeUser user, CustomerLocation location) {
        if (location == null) {
            if (user.getDefaultAddressId() != null) {
                Long previous = user.getDefaultAddressId();
                user.setDefaultAddressId(null);
                users.flush();
                addresses.delete(user.getId(), previous);
            }
            return;
        }
        var address = new Address(AddressMode.MANUAL, user.getVillage(), location.street().strip(), null,
                location.city().strip(), location.pincode(), location.lat(), location.lng(), user.getFullName(),
                user.getPhoneNumber(), null);
        if (user.getDefaultAddressId() == null) {
            user.setDefaultAddressId(addresses.save(user.getId(), "Home", address).id());
        } else {
            addresses.update(user.getId(), user.getDefaultAddressId(), address);
        }
    }

    private UserView view(F2HomeUser user, boolean includeAddress) {
        FarmProfileRequest farm = user.getRole() == F2HomeRole.FARMER
                ? new FarmProfileRequest(user.getFarmLat(), user.getFarmLng(), user.getFarmLocationLabel(),
                        user.getDeliveryRadiusKm(), user.getDeliveryDays() == null ? List.of()
                                : List.of(user.getDeliveryDays().split(","))) : null;
        CustomerLocation location = null;
        if (includeAddress && user.getDefaultAddressId() != null) {
            Address address = addresses.find(user.getId(), user.getDefaultAddressId());
            location = new CustomerLocation(address.line1(), address.city(), address.pincode(), address.lat(), address.lng());
        }
        return new UserView(user.getId(), user.getRole(), user.getStatus(),
                new Details(user.getFullName(), user.getUsername(), user.getPhoneNumber(), user.getVillage(), farm, location));
    }

    private String hash(String password) {
        if (password.isBlank() || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Use at least 8 characters and at most 72 UTF-8 bytes for the password.");
        }
        return encoder.encode(password);
    }

    private void revoke(F2HomeUser user) {
        user.invalidateSessions();
        sessions.revokeAllByUserId(user.getId());
    }

    private void audit(long admin, F2HomeUser user, String action) {
        jdbc.update("insert into f2home_test_user_audit (admin_id, user_id, action) values (?, ?, ?)",
                admin, user.getId(), action);
    }
}
