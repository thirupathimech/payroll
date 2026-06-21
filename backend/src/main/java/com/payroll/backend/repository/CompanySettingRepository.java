package com.payroll.backend.repository;

import com.payroll.backend.domain.CompanySetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanySettingRepository extends JpaRepository<CompanySetting, Long> {
}
