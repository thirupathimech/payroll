package com.payroll.backend.repository;

import com.payroll.backend.domain.SalaryComponent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SalaryComponentRepository extends JpaRepository<SalaryComponent, Long> {
    List<SalaryComponent> findByOrgCodeOrderByCategoryAscNameAsc(String orgCode);
    Optional<SalaryComponent> findByOrgCodeAndId(String orgCode, Long id);
    boolean existsByOrgCodeAndCodeIgnoreCase(String orgCode, String code);
    boolean existsByOrgCodeAndCodeIgnoreCaseAndIdNot(String orgCode, String code, Long id);
}
