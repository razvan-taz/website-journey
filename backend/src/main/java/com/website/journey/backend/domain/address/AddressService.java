package com.website.journey.backend.domain.address;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AddressService {

    private final UserAddressRepository addressRepository;

    public AddressService(UserAddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> getAddresses(Long userId) {
        return addressRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(AddressResponse::from)
                .toList();
    }

    @Transactional
    public AddressResponse createAddress(Long userId, AddressRequest request) {
        if (Boolean.TRUE.equals(request.isDefault())) {
            addressRepository.unsetAllDefaultsForUser(userId);
        }

        UserAddress address = UserAddress.builder()
                .userId(userId)
                .label(request.label())
                .fullName(request.fullName())
                .line1(request.line1())
                .line2(request.line2())
                .city(request.city())
                .state(request.state())
                .postalCode(request.postalCode())
                .country(request.country())
                .isDefault(Boolean.TRUE.equals(request.isDefault()))
                .build();

        return AddressResponse.from(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(Long addressId, Long userId, AddressRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));

        if (Boolean.TRUE.equals(request.isDefault())) {
            addressRepository.unsetAllDefaultsForUser(userId);
        }

        address.setLabel(request.label());
        address.setFullName(request.fullName());
        address.setLine1(request.line1());
        address.setLine2(request.line2());
        address.setCity(request.city());
        address.setState(request.state());
        address.setPostalCode(request.postalCode());
        address.setCountry(request.country());
        address.setIsDefault(Boolean.TRUE.equals(request.isDefault()));

        return AddressResponse.from(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(Long addressId, Long userId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));
        addressRepository.delete(address);
    }

    @Transactional
    public AddressResponse setDefault(Long addressId, Long userId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));
        addressRepository.unsetAllDefaultsForUser(userId);
        address.setIsDefault(true);
        return AddressResponse.from(addressRepository.save(address));
    }
}
