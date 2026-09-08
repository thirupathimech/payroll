package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeSalaryComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeSalaryComponentRepository extends JpaRepository<EmployeeSalaryComponent, Long> {
    List<EmployeeSalaryComponent> findByOrgCodeAndEmployeeId(String orgCode, Long employeeId);

    @Query("""
        select item from EmployeeSalaryComponent item
        join fetch item.component
        where item.orgCode = :orgCode
        order by item.employee.id asc, item.id asc
        """)
    List<EmployeeSalaryComponent> findSalaryReportComponents(@Param("orgCode") String orgCode);

    void deleteByOrgCodeAndEmployeeId(String orgCode, Long employeeId);
}
