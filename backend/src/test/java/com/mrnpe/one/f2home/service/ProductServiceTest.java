package com.mrnpe.one.f2home.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.f2home.dto.ProductRequest;
import com.mrnpe.one.f2home.dto.ProductResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository.FarmerRadiusRow;
import com.mrnpe.one.f2home.repository.ProductMediaRepository;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductMediaRepository mediaRepository;
    @Mock private F2HomeUserRepository userRepository;

    private ProductService service;

    private final F2HomeUserPrincipal ravi =
            new F2HomeUserPrincipal(1L, "+919000000001", "Ravi Kumar", F2HomeRole.FARMER);
    private final F2HomeUserPrincipal lakshmi =
            new F2HomeUserPrincipal(2L, "+919000000002", "Lakshmi Devi", F2HomeRole.FARMER);

    @BeforeEach
    void setUp() {
        MarketplaceProperties props = new MarketplaceProperties(
                20, 5, new BigDecimal("500"), 4_194_304, 5, 26_214_400);
        service = new ProductService(productRepository, mediaRepository, userRepository, props);
        lenient().when(mediaRepository.findByProductIdInOrderBySortOrderAsc(anyCollection())).thenReturn(List.of());
        lenient().when(mediaRepository.findByProductIdOrderBySortOrderAsc(anyLong())).thenReturn(List.of());
        lenient().when(productRepository.save(any(Product.class))).thenAnswer(inv -> {
            Product p = inv.getArgument(0);
            if (p.getId() == null) p.setId(99L);
            return p;
        });
        // Ravi and Lakshmi are approved farmers by default, both using the
        // configured default radius (20 km - neither has set their own);
        // tests that care about the approval gate itself override this.
        lenient().when(userRepository.findActiveFarmerIds()).thenReturn(Set.of(1L, 2L));
        lenient().when(userRepository.findActiveFarmerRadii())
                .thenReturn(List.of(radiusRow(1L, null), radiusRow(2L, null)));
    }

    private static FarmerRadiusRow radiusRow(long farmerId, Double radiusKm) {
        return new FarmerRadiusRow() {
            @Override public Long getId() { return farmerId; }
            @Override public Double getDeliveryRadiusKm() { return radiusKm; }
        };
    }

    private static Product at(long id, String name, double lat, double lng, long farmerId) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(farmerId);
        p.setFarmerName("Farmer " + farmerId);
        p.setName(name);
        p.setCategory("vegetables");
        p.setPrice(new BigDecimal("40"));
        p.setUnit("kg");
        p.setQuantity(10);
        p.setLocationLabel(name + " place");
        p.setLat(lat);
        p.setLng(lng);
        p.setStatus(ProductStatus.ACTIVE);
        return p;
    }

    private static ProductRequest request() {
        return new ProductRequest("Fresh Tomatoes", "vegetables", "Vine ripened", new BigDecimal("40"),
                "kg", 100, new ProductRequest.LocationDto(16.3, 80.44, "Guntur"), null, null);
    }

    @Test
    void nearbyAppliesExactRadiusAfterBoundingBoxAndSortsByDistance() {
        // Guntur customer; Tadikonda ~17 km, Vijayawada ~30 km (inside the
        // bounding box corner but outside the circle), Guntur itself < 1 km.
        Product guntur = at(1L, "Tomatoes", 16.2915, 80.4541, 1L);
        Product tadikonda = at(2L, "Chillies", 16.44, 80.46, 2L);
        Product vijayawada = at(3L, "Toor Dal", 16.5062, 80.6480, 2L);
        when(productRepository.findActiveInBox(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(List.of(vijayawada, tadikonda, guntur));

        List<ProductResponse> result = service.findNearby(16.2915, 80.4541, null);

        assertThat(result).extracting(ProductResponse::name).containsExactly("Tomatoes", "Chillies");
        assertThat(result.get(0).distanceKm()).isLessThan(1.0);
        assertThat(result.get(1).distanceKm()).isBetween(15.0, 20.0);
    }

    @Test
    void nearbyHidesListingsFromFarmersPendingOrNotApproved() {
        Product guntur = at(1L, "Tomatoes", 16.2915, 80.4541, 1L); // Ravi: approved
        Product pending = at(2L, "Chillies", 16.30, 80.45, 2L); // Lakshmi: not approved yet
        when(productRepository.findActiveInBox(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(List.of(guntur, pending));
        // only Ravi approved
        when(userRepository.findActiveFarmerRadii()).thenReturn(List.of(radiusRow(1L, null)));

        List<ProductResponse> result = service.findNearby(16.2915, 80.4541, null);

        assertThat(result).extracting(ProductResponse::name).containsExactly("Tomatoes");
    }

    @Test
    void nearbyRespectsEachFarmersOwnDeliveryRadius() {
        // Both ~9 km away; Ravi delivers only 5 km, Lakshmi delivers 15 km.
        Product tooFar = at(1L, "Tomatoes", 16.38, 80.44, 1L);
        Product withinReach = at(2L, "Chillies", 16.38, 80.44, 2L);
        when(productRepository.findActiveInBox(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(List.of(tooFar, withinReach));
        when(userRepository.findActiveFarmerRadii())
                .thenReturn(List.of(radiusRow(1L, 5.0), radiusRow(2L, 15.0)));

        List<ProductResponse> result = service.findNearby(16.3, 80.44, null);

        assertThat(result).extracting(ProductResponse::name).containsExactly("Chillies");
    }

    @Test
    void getHidesAListingFromAFarmerWhoIsNotApproved() {
        Product pending = at(8L, "Okra", 16.3, 80.44, 2L); // Lakshmi: not approved yet
        when(productRepository.findByIdAndStatus(8L, ProductStatus.ACTIVE)).thenReturn(Optional.of(pending));
        when(userRepository.findActiveFarmerIds()).thenReturn(Set.of(1L));

        assertThatThrownBy(() -> service.get(8L))
                .isInstanceOf(com.mrnpe.one.exception.ResourceNotFoundException.class);
    }

    @Test
    void createStampsTheFarmerFromThePrincipal() {
        ProductResponse created = service.create(ravi, request(), List.of(), null);

        assertThat(created.farmerId()).isEqualTo(1L);
        assertThat(created.farmerName()).isEqualTo("Ravi Kumar");
        assertThat(created.location().label()).isEqualTo("Guntur");
        assertThat(created.quantity()).isEqualTo(100);
    }

    @Test
    void createRejectsNonImageFilesAndTooManyImages() {
        MockMultipartFile pdf = new MockMultipartFile("images", "x.pdf", "application/pdf", new byte[] {1});
        assertThatThrownBy(() -> service.create(ravi, request(), List.of(pdf), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("is not an image");

        List<MockMultipartFile> six = java.util.stream.IntStream.range(0, 6)
                .mapToObj(i -> new MockMultipartFile("images", i + ".png", "image/png", new byte[] {1}))
                .toList();
        assertThatThrownBy(() -> service.create(ravi, request(), List.copyOf(six), null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("up to 5 images");

        verify(productRepository, never()).save(any());
    }

    @Test
    void onlyTheOwnerOrAdminCanDelete() {
        Product ravis = at(7L, "Bananas", 16.3, 80.44, 1L);
        when(productRepository.findByIdAndStatus(7L, ProductStatus.ACTIVE)).thenReturn(Optional.of(ravis));

        assertThatThrownBy(() -> service.delete(lakshmi, 7L)).isInstanceOf(AccessDeniedException.class);
        assertThat(ravis.getStatus()).isEqualTo(ProductStatus.ACTIVE);

        service.delete(ravi, 7L);
        assertThat(ravis.getStatus()).isEqualTo(ProductStatus.DELETED);
        verify(mediaRepository).deleteByProductId(7L);
    }

    @Test
    void perishableCategoriesGet48HourExpiryAndOthersNone() {
        ProductResponse veg = service.create(ravi, request(), List.of(), null);
        assertThat(veg.perishable()).isTrue();
        assertThat(veg.expiresAt()).isBetween(
                java.time.LocalDateTime.now().plusHours(47).plusMinutes(59),
                java.time.LocalDateTime.now().plusHours(48).plusMinutes(1));

        ProductRequest rice = new ProductRequest("Sona Masoori", "rice-grains", null, new BigDecimal("60"),
                "kg", 50, new ProductRequest.LocationDto(16.3, 80.44, "Guntur"), null, null);
        ProductResponse grain = service.create(ravi, rice, List.of(), null);
        assertThat(grain.perishable()).isFalse();
        assertThat(grain.expiresAt()).isNull();
    }

    @Test
    void expireDueMarksListingsExpiredAndDropsMedia() {
        Product old = at(5L, "Spinach", 16.3, 80.44, 1L);
        old.setPerishable(true);
        old.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        when(productRepository.findByStatusAndExpiresAtLessThanEqual(
                org.mockito.ArgumentMatchers.eq(ProductStatus.ACTIVE), any())).thenReturn(List.of(old));

        assertThat(service.expireDue()).isEqualTo(1);
        assertThat(old.getStatus()).isEqualTo(ProductStatus.EXPIRED);
        assertThat(old.getEndedAt()).isNotNull();
        verify(mediaRepository).deleteByProductId(5L);
    }

    @Test
    void expiredButUnsweptListingsAreNotServedOrEditable() {
        Product stale = at(6L, "Spinach", 16.3, 80.44, 1L);
        stale.setPerishable(true);
        stale.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        when(productRepository.findByIdAndStatus(6L, ProductStatus.ACTIVE)).thenReturn(Optional.of(stale));

        assertThatThrownBy(() -> service.get(6L)).isInstanceOf(com.mrnpe.one.exception.ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.update(ravi, 6L, request(), List.of(), null))
                .isInstanceOf(BadRequestException.class);
    }
}
