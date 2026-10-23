package com.mrnpe.one.f2home.entity;

public enum F2HomeUserStatus {
    /** Farmer accounts land here after registration; hidden from the
     *  marketplace until an admin approves them. Customers skip this. */
    PENDING_APPROVAL,
    ACTIVE,
    INACTIVE
}