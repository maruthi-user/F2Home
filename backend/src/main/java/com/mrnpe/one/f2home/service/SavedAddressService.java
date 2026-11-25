package com.mrnpe.one.f2home.service;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mrnpe.one.exception.BadRequestException;
import com.mrnpe.one.exception.ResourceNotFoundException;
import com.mrnpe.one.f2home.dto.PlaceOrderRequest.Address;
import com.mrnpe.one.f2home.entity.AddressMode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SavedAddressService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public record SavedAddress(long id, String name, Address address, boolean defaultAddress) {}

    public SavedAddressService(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public List<SavedAddress> list(Long customerId) {
        return jdbc.query("""
                select a.id, a.name, a.address, a.id = u.default_address_id as is_default
                from f2home_saved_addresses a join f2home_users u on u.id = a.customer_id
                where a.customer_id = ? order by a.id desc
                """, (row, index) -> new SavedAddress(row.getLong("id"), row.getString("name"),
                decode(row.getString("address")), row.getBoolean("is_default")), customerId);
    }

    public SavedAddress save(Long customerId, String name, Address address) {
        if (address.mode() == AddressMode.MANUAL && (blank(address.line1()) || blank(address.city()) || blank(address.pincode()))) {
            throw new BadRequestException("Enter the street, town or city, and PIN code.");
        }
        if (!hasCoordinates(address)) throw new BadRequestException("Locate this address before saving it.");
        // Delivery notes belong to the checkout, not the saved address.
        Address saved = new Address(address.mode(), address.label(), address.line1(), address.landmark(),
                address.city(), address.pincode(), address.lat(), address.lng(), address.contactName(), address.contactPhone(), null);
        Long id = jdbc.queryForObject("""
                insert into f2home_saved_addresses (customer_id, name, address)
                values (?, ?, cast(? as jsonb)) returning id
                """, Long.class, customerId, name.strip(), encode(saved));
        return new SavedAddress(id, name.strip(), saved, false);
    }

    public void update(Long customerId, Long id, Address address) {
        if (jdbc.update("""
                update f2home_saved_addresses set address = cast(? as jsonb) where customer_id = ? and id = ?
                """, encode(address), customerId, id) == 0) {
            throw new ResourceNotFoundException("Saved address not found.");
        }
    }

    public Address find(Long customerId, Long id) {
        return jdbc.query("""
                select address from f2home_saved_addresses where customer_id = ? and id = ?
                """, (row, index) -> decode(row.getString("address")), customerId, id).stream()
                .findFirst().orElseThrow(() -> new ResourceNotFoundException("Saved address not found."));
    }

    public void delete(Long customerId, Long id) {
        if (jdbc.update("delete from f2home_saved_addresses where customer_id = ? and id = ?", customerId, id) == 0) {
            throw new ResourceNotFoundException("Saved address not found.");
        }
    }

    static boolean hasCoordinates(Address address) {
        return address.lat() != null && address.lng() != null
                && Math.abs(address.lat()) <= 90 && Math.abs(address.lng()) <= 180;
    }

    private static boolean blank(String value) { return value == null || value.isBlank(); }

    private String encode(Address address) {
        try {
            return json.writeValueAsString(address);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not save the delivery address.");
        }
    }

    private Address decode(String address) {
        try {
            return json.readValue(address, Address.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not read the delivery address.");
        }
    }
}
