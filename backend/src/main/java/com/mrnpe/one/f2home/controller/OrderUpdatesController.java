package com.mrnpe.one.f2home.controller;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrnpe.one.f2home.security.F2HomeUserPrincipal;

@RestController
@RequestMapping("/api/f2home/orders/updates")
@PreAuthorize("hasRole('CUSTOMER')")
public class OrderUpdatesController {
    private final JdbcTemplate jdbc;

    private static final String CUSTOMER_EVENTS = """
            from f2home_order_events e join f2home_orders o on o.id = e.order_id
            where o.customer_id = ? and e.status in ('CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED')
            """;

    public OrderUpdatesController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Update(long id, long orderId, String status, Instant occurredAt, boolean read) {}
    public record Inbox(List<Update> updates, long unread) {}

    @GetMapping
    public Inbox list(@AuthenticationPrincipal F2HomeUserPrincipal customer) {
        var updates = jdbc.query("select e.id, e.order_id, e.status, e.occurred_at, e.customer_read " + CUSTOMER_EVENTS
                + "order by e.id desc limit 30", (row, index) -> new Update(row.getLong("id"), row.getLong("order_id"),
                row.getString("status"), row.getObject("occurred_at", OffsetDateTime.class).toInstant(),
                row.getBoolean("customer_read")), customer.id());
        Long unread = jdbc.queryForObject("select count(*) " + CUSTOMER_EVENTS + "and not e.customer_read",
                Long.class, customer.id());
        return new Inbox(updates, unread);
    }

    @PostMapping("/{id}/read")
    public void read(@AuthenticationPrincipal F2HomeUserPrincipal customer, @PathVariable long id) {
        jdbc.update("update f2home_order_events set customer_read = true where id in (select e.id "
                + CUSTOMER_EVENTS + " and e.id = ? and not e.customer_read)", customer.id(), id);
    }

    @PostMapping("/read")
    public void readAll(@AuthenticationPrincipal F2HomeUserPrincipal customer) {
        jdbc.update("update f2home_order_events set customer_read = true where id in (select e.id "
                + CUSTOMER_EVENTS + " and not e.customer_read)", customer.id());
    }
}
