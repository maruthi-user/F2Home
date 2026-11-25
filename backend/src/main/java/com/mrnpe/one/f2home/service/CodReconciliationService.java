package com.mrnpe.one.f2home.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrnpe.one.exception.BadRequestException;

@Service
public class CodReconciliationService {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private final NamedParameterJdbcTemplate jdbc;

    public CodReconciliationService(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Farm(Long farmerId, String farmName, long deliveredOrders, BigDecimal deliveredValue,
                       BigDecimal cashCollected, BigDecimal outstanding, long resolvedDiscrepancies) {}
    public record Pilot(BigDecimal averageAcceptanceMinutes, long acceptedOrders, long failedAttempts,
                        long ordersWithFailedAttempts, long placedOrders, long repeatOrders) {}
    public record Totals(BigDecimal deliveredValue, BigDecimal cashCollected, BigDecimal outstanding, long resolvedDiscrepancies) {
        Totals add(Farm farm) {
            return new Totals(deliveredValue.add(farm.deliveredValue()), cashCollected.add(farm.cashCollected()),
                    outstanding.add(farm.outstanding()), resolvedDiscrepancies + farm.resolvedDiscrepancies());
        }
    }
    public record Report(LocalDate from, LocalDate through, List<Farm> farms, Totals totals, Pilot pilot) {}

    @Transactional(readOnly = true)
    public Report report(LocalDate from, LocalDate through) {
        LocalDate today = LocalDate.now(REPORT_ZONE);
        LocalDate end = through == null ? today : through;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end) || end.isAfter(today) || start.isBefore(end.minusDays(365))) {
            throw new BadRequestException("Choose a valid date range of up to 366 days ending today or earlier.");
        }
        Map<String, OffsetDateTime> range = Map.of(
                "from", start.atStartOfDay(REPORT_ZONE).toOffsetDateTime(),
                "until", end.plusDays(1).atStartOfDay(REPORT_ZONE).toOffsetDateTime());
        List<Farm> farms = jdbc.query(FARMS, range, (row, index) -> new Farm(row.getObject("farmer_id", Long.class),
                row.getString("farm_name"), row.getLong("delivered_orders"), row.getBigDecimal("delivered_value"),
                row.getBigDecimal("cash_collected"), row.getBigDecimal("outstanding"), row.getLong("resolved")));
        Pilot pilot = jdbc.queryForObject(PILOT, range, (row, index) -> new Pilot(
                row.getBigDecimal("average_minutes"), row.getLong("accepted"), row.getLong("failed_attempts"),
                row.getLong("failed_orders"), row.getLong("placed"), row.getLong("repeat_orders")));
        Totals totals = new Totals(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0);
        for (Farm farm : farms) totals = totals.add(farm);
        return new Report(start, end, farms, totals, pilot);
    }

    private static final String FARMS = """
            with delivered as (
                select distinct e.order_id
                from f2home_order_events e
                where e.status = 'DELIVERED' and e.occurred_at >= :from and e.occurred_at < :until
            ), resolved as (
                select r.order_id, count(*) as resolutions
                from f2home_order_resolutions r
                where r.action in ('CONFIRM_FULL_CASH', 'KEEP_RECORDED_CASH')
                  and r.resolved_at >= :from and r.resolved_at < :until
                group by r.order_id
            ), scoped as (
                select o.id, o.total, coalesce(o.cash_collected, 0) as cash,
                       d.order_id is not null as delivered, coalesce(r.resolutions, 0) as resolutions
                from f2home_orders o left join delivered d on d.order_id = o.id
                left join resolved r on r.order_id = o.id
                where o.payment_method = 'COD' and o.status = 'DELIVERED'
                  and (d.order_id is not null or r.order_id is not null)
            ), attributed as (
                select s.*, farm.farmer_id, farm.farmer_name
                from scoped s
                left join lateral (
                    select case when count(distinct i.farmer_id) = 1 then min(i.farmer_id) end as farmer_id,
                           case when count(distinct i.farmer_id) = 1 then max(i.farmer_name) end as farmer_name
                    from f2home_order_items i where i.order_id = s.id and i.status <> 'REJECTED'
                ) farm on true
            )
            select a.farmer_id, coalesce(max(u.full_name), max(a.farmer_name), 'Unallocated orders') as farm_name,
                   count(*) filter (where a.delivered) as delivered_orders,
                   coalesce(sum(a.total) filter (where a.delivered), 0) as delivered_value,
                   coalesce(sum(a.cash) filter (where a.delivered), 0) as cash_collected,
                   coalesce(sum(greatest(a.total - a.cash, 0)) filter (where a.delivered), 0) as outstanding,
                   sum(a.resolutions) as resolved
            from attributed a left join f2home_users u on u.id = a.farmer_id
            group by a.farmer_id
            order by outstanding desc, farm_name, a.farmer_id
            """;

    private static final String PILOT = """
            with placed as (
                select e.order_id, o.customer_id, min(e.occurred_at) as placed_at
                from f2home_order_events e join f2home_orders o on o.id = e.order_id
                where e.status = 'PLACED' and o.payment_method = 'COD'
                  and e.occurred_at >= :from and e.occurred_at < :until
                group by e.order_id, o.customer_id
            ), accepted as (
                select e.order_id, min(e.occurred_at) as accepted_at
                from f2home_order_events e join f2home_orders o on o.id = e.order_id
                where e.status = 'CONFIRMED' and o.payment_method = 'COD'
                  and e.occurred_at >= :from and e.occurred_at < :until
                group by e.order_id
            ), acceptance as (
                select round(avg(extract(epoch from a.accepted_at - p.placed_at) / 60), 1) as average_minutes,
                       count(*) as accepted
                from accepted a join lateral (
                    select min(e.occurred_at) as placed_at from f2home_order_events e
                    where e.order_id = a.order_id and e.status = 'PLACED'
                ) p on p.placed_at <= a.accepted_at
            ), failures as (
                select count(*) as failed_attempts, count(distinct e.order_id) as failed_orders
                from f2home_order_events e join f2home_orders o on o.id = e.order_id
                where e.status = 'DELIVERY_FAILED' and o.payment_method = 'COD'
                  and e.occurred_at >= :from and e.occurred_at < :until
            ), repeats as (
                select count(*) as placed, count(*) filter (where exists (
                    select 1 from f2home_orders previous_order
                    join f2home_order_events delivery on delivery.order_id = previous_order.id
                    where previous_order.customer_id = p.customer_id and previous_order.id <> p.order_id
                      and delivery.status = 'DELIVERED' and delivery.occurred_at < p.placed_at
                )) as repeat_orders
                from placed p
            )
            select * from acceptance cross join failures cross join repeats
            """;
}
