package com.mrnpe.one.f2home.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mrnpe.one.f2home.entity.F2HomeUser;

@Repository
public interface F2HomeUserRepository extends JpaRepository<F2HomeUser, Long> {

    Optional<F2HomeUser> findByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumber(String phoneNumber);
}