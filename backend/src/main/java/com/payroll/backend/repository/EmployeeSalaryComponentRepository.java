package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeSalaryComponent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeSalaryComponentRepository extends JpaRepository<EmployeeSalaryComponent, Long> {
    List<EmployeeSalaryComponent> findByOrgCodeAndEmployeeId(String orgCode, Long employeeId);
    void deleteByOrgCodeAndEmployeeId(String orgCode, Long employeeId);
}
