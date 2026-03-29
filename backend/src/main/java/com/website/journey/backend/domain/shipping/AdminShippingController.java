package com.website.journey.backend.domain.shipping;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/admin/shipping-config")
public class AdminShippingController {

    private final ShippingConfigService shippingConfigService;

    public AdminShippingController(ShippingConfigService shippingConfigService) {
        this.shippingConfigService = shippingConfigService;
    }

    @GetMapping
    public ShippingConfigDto getConfig() {
        return ShippingConfigDto.from(shippingConfigService.getConfig());
    }

    @PutMapping
    public ShippingConfigDto updateConfig(@Valid @RequestBody UpdateShippingConfigRequest request) {
        return ShippingConfigDto.from(shippingConfigService.updateConfig(request.price(), request.currency()));
    }

    public record UpdateShippingConfigRequest(
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @NotBlank @Size(min = 3, max = 3) String currency
    ) {}
}
