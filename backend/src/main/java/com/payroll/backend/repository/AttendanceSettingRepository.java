package com.payroll.backend.repository;

import com.payroll.backend.domain.AttendanceSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AttendanceSettingRepository extends JpaRepository<AttendanceSetting, Long> {

    Optional<AttendanceSetting> findByOrgCode(String orgCode);
}
