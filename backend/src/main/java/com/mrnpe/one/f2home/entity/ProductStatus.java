package com.mrnpe.one.f2home.entity;

/**
 * Listings are never hard-deleted, so past order lines and the farmer's
 * history keep their reference. EXPIRED = perishable listing that passed its
 * expiry window; DELETED = removed by the farmer.
 */
public enum ProductStatus {
    ACTIVE,
    EXPIRED,
    DELETED
}
