package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.FarmProfileRequest;
import com.mrnpe.one.f2home.dto.FarmProfileResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@ExtendWith(MockitoExtension.class)
class FarmProfileServiceTest {

    @Mock private F2HomeUserRepository userRepository;

    private FarmProfileService service;
    private final F2HomeUserPrincipal ravi = new F2HomeUserPrincipal(1L, "+919000000001", "Ravi", F2HomeRole.FARMER);
    private F2HomeUser raviRow;

    @BeforeEach
    void setUp() {
        // Platform-wide max radius is 20 km for these tests.
        MarketplaceProperties props = new MarketplaceProperties(
                20, 5, new BigDecimal("500"), 4_194_304, 5, 26_214_400);
        service = new FarmProfileService(userRepository, props);

        raviRow = new F2HomeUser();
        raviRow.setId(1L);
        // The radius/day validation runs before the user is looked up, so
        // the rejection tests never touch either stub below.
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(raviRow));
        lenient().when(userRepository.save(any(F2HomeUser.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static FarmProfileRequest request(double radiusKm, List<String> days) {
        return new FarmProfileRequest(16.3, 80.44, "Ravi's farm, Guntur", radiusKm, days);
    }

    @Test
    void updateSavesThePinRadiusAndDays() {
        FarmProfileResponse response = service.update(ravi, request(8.0, List.of("tue", "SAT")));

        assertThat(response.lat()).isEqualTo(16.3);
        assertThat(response.lng()).isEqualTo(80.44);
        assertThat(response.deliveryRadiusKm()).isEqualTo(8.0);
        assertThat(response.deliveryDays()).containsExactly("TUE", "SAT");
        assertThat(response.effectiveRadiusKm()).isEqualTo(8.0);
        assertThat(raviRow.getDeliveryDays()).isEqualTo("TUE,SAT");
    }

    @Test
    void updateRejectsARadiusBeyondThePlatformMax() {
        assertThatThrownBy(() -> service.update(ravi, request(25.0, List.of("MON"))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("20 km");
    }

    @Test
    void updateRejectsAnInvalidDeliveryDay() {
        assertThatThrownBy(() -> service.update(ravi, request(5.0, List.of("MONDAY"))))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("not a valid day");
    }

    @Test
    void getFallsBackToThePlatformDefaultRadiusWhenNoneIsSet() {
        FarmProfileResponse response = service.get(ravi);

        assertThat(response.deliveryRadiusKm()).isNull();
        assertThat(response.effectiveRadiusKm()).isEqualTo(20.0);
        assertThat(response.deliveryDays()).isEmpty();
    }
}
