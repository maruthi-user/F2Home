package com.mrnpe.one.f2home.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.FarmProfileRequest;
import com.mrnpe.one.f2home.dto.FarmProfileResponse;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

/**
 * A farmer's own farm pin and delivery reach (days + radius). Each farmer
 * picks their own radius, capped at the platform-wide default
 * (f2home.marketplace.nearby-radius-km) so the nearby-search bounding box
 * (sized to that same default - see ProductService) always covers it.
 */
@Service
public class FarmProfileService {

    private static final Set<String> VALID_DAYS =
            Set.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");

    private final F2HomeUserRepository userRepository;
    private final MarketplaceProperties props;

    public FarmProfileService(F2HomeUserRepository userRepository, MarketplaceProperties props) {
        this.userRepository = userRepository;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public FarmProfileResponse get(F2HomeUserPrincipal farmer) {
        return FarmProfileResponse.from(findFarmer(farmer.id()), props.getNearbyRadiusKm());
    }

    @Transactional
    public FarmProfileResponse update(F2HomeUserPrincipal farmer, FarmProfileRequest request) {
        double maxRadius = props.getNearbyRadiusKm();
        if (request.deliveryRadiusKm() > maxRadius) {
            throw new BadRequestException("Delivery radius cannot exceed " + (long) maxRadius + " km.");
        }

        List<String> days = request.deliveryDays().stream().map(d -> d.trim().toUpperCase(Locale.ROOT)).toList();
        for (String day : days) {
            if (!VALID_DAYS.contains(day)) {
                throw new BadRequestException("\"" + day + "\" is not a valid day. Use MON, TUE, WED, THU, FRI, SAT or SUN.");
            }
        }

        F2HomeUser user = findFarmer(farmer.id());
        user.setFarmLat(request.lat());
        user.setFarmLng(request.lng());
        user.setFarmLocationLabel(request.locationLabel().trim());
        user.setDeliveryRadiusKm(request.deliveryRadiusKm());
        user.setDeliveryDays(days.stream().distinct().collect(Collectors.joining(",")));

        return FarmProfileResponse.from(userRepository.save(user), maxRadius);
    }

    private F2HomeUser findFarmer(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found."));
    }
}
