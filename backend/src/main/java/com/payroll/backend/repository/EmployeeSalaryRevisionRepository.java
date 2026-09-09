package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeSalaryRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeSalaryRevisionRepository extends JpaRepository<EmployeeSalaryRevision, Long> {

    List<EmployeeSalaryRevision> findByOrgCodeAndEmployeeIdOrderByEffectiveDateDesc(String orgCode, Long employeeId);

    boolean existsByOrgCodeAndEmployeeId(String orgCode, Long employeeId);

    boolean existsByOrgCodeAndEmployeeIdAndEffectiveDate(String orgCode, Long employeeId, LocalDate effectiveDate);

    Optional<EmployeeSalaryRevision> findByOrgCodeAndEmployeeIdAndEffectiveDate(String orgCode, Long employeeId, LocalDate effectiveDate);

    @Query("""
        select revision from EmployeeSalaryRevision revision
        where revision.orgCode = :orgCode
          and revision.employee.id in :employeeIds
          and revision.effectiveDate <= :asOfDate
        order by revision.employee.id asc, revision.effectiveDate desc, revision.id desc
        """)
    List<EmployeeSalaryRevision> findEffectiveRevisions(
            @Param("orgCode") String orgCode,
            @Param("employeeIds") Collection<Long> employeeIds,
            @Param("asOfDate") LocalDate asOfDate
    );
}
