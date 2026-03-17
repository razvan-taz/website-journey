package com.website.journey.backend.domain.navlayout;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class NavLayoutService {

    private final NavLayoutRepository repository;

    public NavLayoutService(NavLayoutRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<NavLayoutDto> getAll() {
        return repository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<NavLayoutDto> saveAll(List<NavLayoutDto> items) {
        for (NavLayoutDto dto : items) {
            NavLayout entity = repository.findById(dto.itemKey())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Unknown nav item key: " + dto.itemKey()));
            entity.setZone(dto.zone());
            entity.setSortOrder(dto.sortOrder());
            entity.setHeightPx(dto.heightPx());
            entity.setWidthPx(dto.widthPx());
            entity.setOffsetX(dto.offsetX());
            entity.setOffsetY(dto.offsetY());
            repository.save(entity);
        }
        return getAll();
    }

    private NavLayoutDto toDto(NavLayout e) {
        return new NavLayoutDto(e.getItemKey(), e.getZone(), e.getSortOrder(), e.getHeightPx(), e.getWidthPx(), e.getOffsetX(), e.getOffsetY());
    }
}
