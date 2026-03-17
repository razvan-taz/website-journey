package com.website.journey.backend.domain.navlayout;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NavLayoutRepository extends JpaRepository<NavLayout, String> {
    List<NavLayout> findAllByOrderBySortOrderAsc();
}
