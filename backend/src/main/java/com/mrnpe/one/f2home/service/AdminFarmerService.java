package com.mrnpe.one.f2home.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.PendingFarmerResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.F2HomeUser;
import com.mrnpe.one.f2home.entity.F2HomeUserStatus;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;

/**
 * The farmer approval gate: admins review a farmer's name, village and
 * self-taken photo before their listings can appear in the marketplace
 * (see {@code ProductService.approvedFarmerIds}).
 */
@Service
public class AdminFarmerService {

    private final F2HomeUserRepository userRepository;

    public AdminFarmerService(F2HomeUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PendingFarmerResponse> pending() {
        return userRepository.findByRoleAndStatusOrderByCreatedAtAsc(F2HomeRole.FARMER, F2HomeUserStatus.PENDING_APPROVAL)
                .stream()
                .map(PendingFarmerResponse::from)
                .toList();
    }

    @Transactional
    public PendingFarmerResponse approve(Long farmerId) {
        return setStatus(farmerId, F2HomeUserStatus.ACTIVE);
    }

    /** Also used to suspend an already-approved farmer (same INACTIVE status). */
    @Transactional
    public PendingFarmerResponse reject(Long farmerId) {
        return setStatus(farmerId, F2HomeUserStatus.INACTIVE);
    }

    @Transactional
    public PendingFarmerResponse reinstate(Long farmerId) {
        return setStatus(farmerId, F2HomeUserStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public F2HomeUser getFarmer(Long farmerId) {
        F2HomeUser user = userRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found."));
        if (user.getRole() != F2HomeRole.FARMER) {
            throw new ResourceNotFoundException("Farmer not found.");
        }
        return user;
    }

    private PendingFarmerResponse setStatus(Long farmerId, F2HomeUserStatus status) {
        F2HomeUser user = getFarmer(farmerId);
        if (user.getStatus() == status) {
            throw new BadRequestException("This farmer is already " + status.name().toLowerCase() + ".");
        }
        user.setStatus(status);
        return PendingFarmerResponse.from(userRepository.save(user));
    }
}
