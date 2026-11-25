package com.mrnpe.one.f2home.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CheckoutQuote(String version, LocalDate deliveryDate, BigDecimal subtotal,
                            BigDecimal deliveryFee, BigDecimal total, List<Line> items) {
    public record Line(Long productId, String name, String unit, int quantity, int availableStock,
                       BigDecimal unitPrice, BigDecimal lineTotal) {}
}
