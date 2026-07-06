package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeSettingRepository extends JpaRepository<EmployeeSetting, Long> {
    Optional<EmployeeSetting> findByOrgCode(String orgCode);
}
