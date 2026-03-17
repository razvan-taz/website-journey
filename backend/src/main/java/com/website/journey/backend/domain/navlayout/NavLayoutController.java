package com.website.journey.backend.domain.navlayout;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class NavLayoutController {

    private final NavLayoutService navLayoutService;

    public NavLayoutController(NavLayoutService navLayoutService) {
        this.navLayoutService = navLayoutService;
    }

    @GetMapping("/api/site/nav-layout")
    public ResponseEntity<List<NavLayoutDto>> getPublic() {
        return ResponseEntity.ok(navLayoutService.getAll());
    }

    @GetMapping("/api/admin/nav-layout")
    public ResponseEntity<List<NavLayoutDto>> getAdmin() {
        return ResponseEntity.ok(navLayoutService.getAll());
    }

    @PutMapping("/api/admin/nav-layout")
    public ResponseEntity<List<NavLayoutDto>> save(@RequestBody List<NavLayoutDto> items) {
        return ResponseEntity.ok(navLayoutService.saveAll(items));
    }
}
