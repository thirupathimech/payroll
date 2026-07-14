package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeExperience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeExperienceRepository extends JpaRepository<EmployeeExperience, Long> {
    List<EmployeeExperience> findByOrgCodeAndEmployeeIdOrderByIdAsc(String orgCode, Long employeeId);

    void deleteByOrgCodeAndEmployeeId(String orgCode, Long employeeId);
}
