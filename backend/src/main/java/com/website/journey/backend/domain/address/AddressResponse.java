package com.website.journey.backend.domain.address;

public record AddressResponse(
        Long id,
        String label,
        String fullName,
        String line1,
        String line2,
        String city,
        String state,
        String postalCode,
        String country,
        Boolean isDefault
) {
    public static AddressResponse from(UserAddress a) {
        return new AddressResponse(
                a.getId(),
                a.getLabel(),
                a.getFullName(),
                a.getLine1(),
                a.getLine2(),
                a.getCity(),
                a.getState(),
                a.getPostalCode(),
                a.getCountry(),
                a.getIsDefault()
        );
    }
}
