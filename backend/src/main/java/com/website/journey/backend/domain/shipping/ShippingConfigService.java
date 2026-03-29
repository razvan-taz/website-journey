package com.website.journey.backend.domain.shipping;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
public class ShippingConfigService {

    private static final long CONFIG_ROW_ID = 1L;

    private final ShippingConfigRepository shippingConfigRepository;

    public ShippingConfigService(ShippingConfigRepository shippingConfigRepository) {
        this.shippingConfigRepository = shippingConfigRepository;
    }

    @Transactional(readOnly = true)
    public ShippingConfig getConfig() {
        return shippingConfigRepository.findById(CONFIG_ROW_ID)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR, "Shipping configuration not found"));
    }

    @Transactional
    public ShippingConfig updateConfig(BigDecimal price, String currency) {
        ShippingConfig config = getConfig();
        config.setPrice(price);
        config.setCurrency(currency);
        return shippingConfigRepository.save(config);
    }
}
