package com.payroll.backend.repository;

import com.payroll.backend.domain.CompanySetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanySettingRepository extends JpaRepository<CompanySetting, Long> {
    Optional<CompanySetting> findByOrgCode(String orgCode);
}
