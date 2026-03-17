package com.website.journey.backend.domain.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StreamScheduleRepository extends JpaRepository<StreamScheduleEntry, Long> {

    List<StreamScheduleEntry> findAllByOrderByDayOfWeekAsc();

    Optional<StreamScheduleEntry> findByDayOfWeek(int dayOfWeek);
}
