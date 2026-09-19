package com.mrnpe.one.f2home.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductMediaType;
import com.mrnpe.one.f2home.repository.ProductMediaRepository.ProductMediaMeta;

/**
 * Public shape of a listing. {@code distanceKm} is only present on
 * "nearby" queries (null otherwise). Media URLs are relative to the API
 * origin.
 */
public record ProductResponse(
        Long id,
        String name,
        String category,
        String description,
        BigDecimal price,
        String unit,
        int quantity,
        LocationResponse location,
        Long farmerId,
        String farmerName,
        List<MediaResponse> media,
        Double distanceKm,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record LocationResponse(double lat, double lng, String label) {
    }

    public record MediaResponse(UUID id, ProductMediaType type, String contentType, long sizeBytes, String url) {
        public static MediaResponse from(ProductMediaMeta m) {
            return new MediaResponse(
                    m.getId(),
                    m.getMediaType(),
                    m.getContentType(),
                    m.getSizeBytes(),
                    mediaUrl(m.getProductId(), m.getId()));
        }
    }

    public static String mediaUrl(Long productId, UUID mediaId) {
        return "/api/f2home/products/" + productId + "/media/" + mediaId;
    }

    public static ProductResponse from(Product p, List<ProductMediaMeta> media, Double distanceKm) {
        return new ProductResponse(
                p.getId(),
                p.getName(),
                p.getCategory(),
                p.getDescription(),
                p.getPrice(),
                p.getUnit(),
                p.getQuantity(),
                new LocationResponse(p.getLat(), p.getLng(), p.getLocationLabel()),
                p.getFarmerId(),
                p.getFarmerName(),
                media.stream().map(MediaResponse::from).toList(),
                distanceKm,
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
