package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeEducation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeEducationRepository extends JpaRepository<EmployeeEducation, Long> {
    List<EmployeeEducation> findByOrgCodeAndEmployeeIdOrderByIdAsc(String orgCode, Long employeeId);

    void deleteByOrgCodeAndEmployeeId(String orgCode, Long employeeId);
}
