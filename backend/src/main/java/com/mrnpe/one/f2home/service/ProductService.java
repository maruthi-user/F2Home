package com.mrnpe.one.f2home.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.ProductRequest;
import com.mrnpe.one.f2home.dto.ProductResponse;
import com.mrnpe.one.f2home.entity.F2HomeRole;
import com.mrnpe.one.f2home.entity.Product;
import com.mrnpe.one.f2home.entity.ProductMedia;
import com.mrnpe.one.f2home.entity.ProductMediaType;
import com.mrnpe.one.f2home.entity.ProductStatus;
import com.mrnpe.one.f2home.repository.F2HomeUserRepository;
import com.mrnpe.one.f2home.repository.ProductMediaRepository;
import com.mrnpe.one.f2home.repository.ProductMediaRepository.ProductMediaMeta;
import com.mrnpe.one.f2home.repository.ProductRepository;
import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

/**
 * Listings: farmers create/edit/delete their own; customers query what is
 * within the configured radius of their location. Media bytes are stored
 * with the listing (see ProductMedia) and validated for type/size/count.
 *
 * Every customer-facing read also hides listings from farmers who are not
 * yet approved (or have been suspended) - see {@link #approvedFarmerIds()}.
 * A farmer's own {@link #findMine} view is never filtered this way, so they
 * can still see and manage their listings while waiting for approval.
 */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductMediaRepository mediaRepository;
    private final F2HomeUserRepository userRepository;
    private final MarketplaceProperties props;

    public ProductService(ProductRepository productRepository,
                          ProductMediaRepository mediaRepository,
                          F2HomeUserRepository userRepository,
                          MarketplaceProperties props) {
        this.productRepository = productRepository;
        this.mediaRepository = mediaRepository;
        this.userRepository = userRepository;
        this.props = props;
    }

    // ================= QUERIES =================

    /**
     * Active listings within each farmer's own delivery radius of (lat, lng),
     * nearest first. The bounding box is sized to the platform-wide max
     * ({@link MarketplaceProperties#getNearbyRadiusKm()}), which every
     * farmer's own radius is capped at (see FarmProfileService), so it
     * always covers them; the exact per-farmer radius is applied below.
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> findNearby(double lat, double lng, String category) {
        double maxRadius = props.getNearbyRadiusKm();
        double[] box = GeoUtils.boundingBox(lat, lng, maxRadius);
        String cat = category == null || category.isBlank() ? null : category;

        record Hit(Product product, double distanceKm) {
        }

        Map<Long, Double> farmerRadii = approvedFarmerRadiiKm();
        List<Hit> hits = productRepository.findActiveInBox(box[0], box[1], box[2], box[3], cat).stream()
                .map(p -> new Hit(p, GeoUtils.haversineKm(lat, lng, p.getLat(), p.getLng())))
                .filter(h -> isLive(h.product()))
                .filter(h -> {
                    Double radiusKm = farmerRadii.get(h.product().getFarmerId());
                    return radiusKm != null && h.distanceKm() <= radiusKm;
                })
                .sorted(Comparator.comparingDouble(Hit::distanceKm))
                .toList();

        Map<Long, List<ProductMediaMeta>> media = mediaFor(hits.stream().map(h -> h.product().getId()).toList());
        return hits.stream()
                .map(h -> ProductResponse.from(h.product(), media.getOrDefault(h.product().getId(), List.of()),
                        round1(h.distanceKm())))
                .toList();
    }

    /** All active listings (farmer / admin view - no radius). */
    @Transactional(readOnly = true)
    public List<ProductResponse> findAll(String category) {
        List<Product> products = category == null || category.isBlank()
                ? productRepository.findByStatusOrderByCreatedAtDesc(ProductStatus.ACTIVE)
                : productRepository.findByStatusAndCategoryOrderByCreatedAtDesc(ProductStatus.ACTIVE, category);
        Set<Long> approvedFarmers = approvedFarmerIds();
        return withMedia(products.stream()
                .filter(this::isLive)
                .filter(p -> approvedFarmers.contains(p.getFarmerId()))
                .toList());
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        Set<Long> approvedFarmers = approvedFarmerIds();
        return withMedia(productRepository.findByIdInAndStatus(ids, ProductStatus.ACTIVE).stream()
                .filter(this::isLive)
                .filter(p -> approvedFarmers.contains(p.getFarmerId()))
                .toList());
    }

    /** The farmer's own listings - never filtered by approval, so they can
     *  manage produce while waiting for an admin to approve them. */
    @Transactional(readOnly = true)
    public List<ProductResponse> findMine(F2HomeUserPrincipal farmer) {
        return withMedia(productRepository.findByFarmerIdAndStatusOrderByCreatedAtDesc(
                farmer.id(), ProductStatus.ACTIVE).stream().filter(this::isLive).toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        Product p = productRepository.findByIdAndStatus(id, ProductStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found."));
        if (!isLive(p) || !approvedFarmerIds().contains(p.getFarmerId())) {
            throw new ResourceNotFoundException("Product not found.");
        }
        return ProductResponse.from(p, mediaRepository.findByProductIdOrderBySortOrderAsc(id), null);
    }

    /** Farmers whose listings may appear outside their own "my listings" view. */
    private Set<Long> approvedFarmerIds() {
        return userRepository.findActiveFarmerIds();
    }

    /** Each approved farmer's own delivery radius, defaulting unset ones to the platform-wide max. */
    private Map<Long, Double> approvedFarmerRadiiKm() {
        double defaultRadius = props.getNearbyRadiusKm();
        return userRepository.findActiveFarmerRadii().stream()
                .collect(Collectors.toMap(
                        F2HomeUserRepository.FarmerRadiusRow::getId,
                        r -> r.getDeliveryRadiusKm() != null ? r.getDeliveryRadiusKm() : defaultRadius));
    }

    @Transactional(readOnly = true)
    public ProductMedia getMedia(Long productId, UUID mediaId) {
        return mediaRepository.findByIdAndProductId(mediaId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found."));
    }

    // ================= COMMANDS =================

    @Transactional
    public ProductResponse create(F2HomeUserPrincipal farmer, ProductRequest request,
                                  List<MultipartFile> images, MultipartFile video) {
        validateMedia(images, video, 0, false);

        Product p = new Product();
        p.setFarmerId(farmer.id());
        p.setFarmerName(farmer.fullName());
        apply(p, request);
        p.setExpiresAt(p.isPerishable()
                ? LocalDateTime.now().plusHours(props.getPerishableExpiryHours())
                : null);
        p = productRepository.save(p);

        storeMedia(p.getId(), images, video, 0);
        return ProductResponse.from(p, mediaRepository.findByProductIdOrderBySortOrderAsc(p.getId()), null);
    }

    @Transactional
    public ProductResponse update(F2HomeUserPrincipal user, Long id, ProductRequest request,
                                  List<MultipartFile> images, MultipartFile video) {
        Product p = productRepository.findByIdAndStatus(id, ProductStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found."));
        if (!isLive(p)) throw new BadRequestException("This listing has expired and can no longer be edited.");
        assertOwner(user, p);

        // Media the farmer chose to keep; everything else on the listing goes.
        List<UUID> keep = request.keepMediaIds() == null ? List.of() : request.keepMediaIds();
        List<ProductMediaMeta> existing = mediaRepository.findByProductIdOrderBySortOrderAsc(id).stream()
                .filter(m -> keep.contains(m.getId()))
                .toList();
        long keptImages = existing.stream().filter(m -> m.getMediaType() == ProductMediaType.IMAGE).count();
        boolean keptVideo = existing.stream().anyMatch(m -> m.getMediaType() == ProductMediaType.VIDEO);
        validateMedia(images, video, (int) keptImages, keptVideo);

        if (keep.isEmpty()) {
            mediaRepository.deleteByProductId(id);
        } else {
            mediaRepository.deleteByProductIdAndIdNotIn(id, keep);
        }

        apply(p, request);
        p = productRepository.save(p);

        int nextSort = existing.stream().mapToInt(ProductMediaMeta::getSortOrder).max().orElse(-1) + 1;
        storeMedia(id, images, video, nextSort);
        return ProductResponse.from(p, mediaRepository.findByProductIdOrderBySortOrderAsc(id), null);
    }

    /** Soft delete: past order lines keep pointing at the row. */
    @Transactional
    public void delete(F2HomeUserPrincipal user, Long id) {
        Product p = productRepository.findByIdAndStatus(id, ProductStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found."));
        assertOwner(user, p);
        p.setStatus(ProductStatus.DELETED);
        p.setEndedAt(LocalDateTime.now());
        productRepository.save(p);
        // Bytes are only useful for live listings; order history keeps its
        // own snapshot text, not the media.
        mediaRepository.deleteByProductId(id);
    }

    /**
     * Sweeps perishable listings past their expiry: marks them EXPIRED (kept as
     * farm history) and drops the media bytes. Run by ProductExpiryScheduler;
     * reads also filter on isLive(), so nothing expired is served between sweeps.
     */
    @Transactional
    public int expireDue() {
        LocalDateTime now = LocalDateTime.now();
        List<Product> due = productRepository.findByStatusAndExpiresAtLessThanEqual(ProductStatus.ACTIVE, now);
        for (Product p : due) {
            p.setStatus(ProductStatus.EXPIRED);
            p.setEndedAt(now);
            mediaRepository.deleteByProductId(p.getId());
        }
        if (!due.isEmpty()) productRepository.saveAll(due);
        return due.size();
    }

    /** Active and not past its expiry time. */
    boolean isLive(Product p) {
        return p.getStatus() == ProductStatus.ACTIVE
                && (p.getExpiresAt() == null || p.getExpiresAt().isAfter(LocalDateTime.now()));
    }

    // ================= HELPERS =================

    private void assertOwner(F2HomeUserPrincipal user, Product p) {
        if (user.role() != F2HomeRole.ADMIN && !p.getFarmerId().equals(user.id())) {
            throw new AccessDeniedException("You can only manage your own listings.");
        }
    }

    private void apply(Product p, ProductRequest r) {
        p.setName(r.name().trim());
        p.setCategory(r.category().trim());
        p.setDescription(r.description() == null ? null : r.description().trim());
        p.setPrice(r.price());
        p.setUnit(r.unit().trim());
        p.setQuantity(r.quantity());
        p.setLocationLabel(r.location().label().trim());
        p.setLat(r.location().lat());
        p.setLng(r.location().lng());
        p.setHarvestDate(r.harvestDate());
        // Expiry is fixed from the listing time (set on create), so editing
        // cannot extend a perishable listing's life.
        p.setPerishable(props.isPerishableCategory(p.getCategory()));
    }

    private void validateMedia(List<MultipartFile> images, MultipartFile video, int alreadyImages, boolean alreadyVideo) {
        List<MultipartFile> imgs = nonEmpty(images);
        if (alreadyImages + imgs.size() > props.getMaxImagesPerProduct()) {
            throw new BadRequestException("You can add up to " + props.getMaxImagesPerProduct() + " images.");
        }
        for (MultipartFile f : imgs) {
            if (f.getContentType() == null || !f.getContentType().startsWith("image/")) {
                throw new BadRequestException("\"" + f.getOriginalFilename() + "\" is not an image.");
            }
            if (f.getSize() > props.getMaxImageBytes()) {
                throw new BadRequestException("\"" + f.getOriginalFilename() + "\" is over the "
                        + (props.getMaxImageBytes() / (1024 * 1024)) + "MB limit per image.");
            }
        }
        if (video != null && !video.isEmpty()) {
            if (alreadyVideo) {
                throw new BadRequestException("A listing can have one video - remove the existing one first.");
            }
            if (video.getContentType() == null || !video.getContentType().startsWith("video/")) {
                throw new BadRequestException("\"" + video.getOriginalFilename() + "\" is not a video.");
            }
            if (video.getSize() > props.getMaxVideoBytes()) {
                throw new BadRequestException("\"" + video.getOriginalFilename() + "\" is over the "
                        + (props.getMaxVideoBytes() / (1024 * 1024)) + "MB video limit.");
            }
        }
    }

    private void storeMedia(Long productId, List<MultipartFile> images, MultipartFile video, int startSort) {
        int sort = startSort;
        List<ProductMedia> rows = new ArrayList<>();
        for (MultipartFile f : nonEmpty(images)) {
            rows.add(toMedia(productId, f, ProductMediaType.IMAGE, sort++));
        }
        if (video != null && !video.isEmpty()) {
            rows.add(toMedia(productId, video, ProductMediaType.VIDEO, sort));
        }
        if (!rows.isEmpty()) mediaRepository.saveAll(rows);
    }

    private static ProductMedia toMedia(Long productId, MultipartFile f, ProductMediaType type, int sort) {
        ProductMedia m = new ProductMedia();
        m.setProductId(productId);
        m.setMediaType(type);
        m.setContentType(f.getContentType());
        m.setFileName(f.getOriginalFilename());
        m.setSizeBytes(f.getSize());
        m.setSortOrder(sort);
        try {
            m.setData(f.getBytes());
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded file \"" + f.getOriginalFilename() + "\".");
        }
        return m;
    }

    private static List<MultipartFile> nonEmpty(List<MultipartFile> files) {
        return files == null ? List.of() : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
    }

    private List<ProductResponse> withMedia(List<Product> products) {
        Map<Long, List<ProductMediaMeta>> media = mediaFor(products.stream().map(Product::getId).toList());
        return products.stream()
                .map(p -> ProductResponse.from(p, media.getOrDefault(p.getId(), List.of()), null))
                .toList();
    }

    private Map<Long, List<ProductMediaMeta>> mediaFor(List<Long> productIds) {
        if (productIds.isEmpty()) return Map.of();
        return mediaRepository.findByProductIdInOrderBySortOrderAsc(productIds).stream()
                .collect(Collectors.groupingBy(ProductMediaMeta::getProductId));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
