package com.mrnpe.one.f2home.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.F2HomeRegistrationDraft;

@Repository
public interface F2HomeRegistrationDraftRepository extends JpaRepository<F2HomeRegistrationDraft, String> {

    Optional<F2HomeRegistrationDraft> findByPhoneNumber(String phoneNumber);

    long deleteByPhoneNumber(String phoneNumber);

    /** Housekeeping: drops drafts nobody ever verified, so no photo is kept forever. */
    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
