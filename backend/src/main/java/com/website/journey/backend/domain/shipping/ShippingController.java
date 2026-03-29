package com.website.journey.backend.domain.shipping;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/shipping")
public class ShippingController {

    private final ShippingConfigService shippingConfigService;

    public ShippingController(ShippingConfigService shippingConfigService) {
        this.shippingConfigService = shippingConfigService;
    }

    @GetMapping("/rate")
    public Map<String, Object> getShippingRate() {
        ShippingConfig config = shippingConfigService.getConfig();
        return Map.of(
                "price", config.getPrice(),
                "currency", config.getCurrency()
        );
    }
}
