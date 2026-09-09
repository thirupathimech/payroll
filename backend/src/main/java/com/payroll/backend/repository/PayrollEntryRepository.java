package com.payroll.backend.repository;

import com.payroll.backend.domain.PayrollEntry;
import com.payroll.backend.domain.enums.PayrollRunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PayrollEntryRepository extends JpaRepository<PayrollEntry, Long> {

    @Query("""
            select e from PayrollEntry e
            join fetch e.payrollRun
            where e.orgCode = :orgCode and e.payrollRun.id = :runId
            order by e.employeeName asc, e.employeeCode asc
            """)
    List<PayrollEntry> findRunEntries(@Param("orgCode") String orgCode, @Param("runId") Long runId);

    @Query("""
            select e from PayrollEntry e
            join fetch e.payrollRun
            join fetch e.employee
            where e.orgCode = :orgCode and e.id = :id
            """)
    Optional<PayrollEntry> findEntry(@Param("orgCode") String orgCode, @Param("id") Long id);

    @Query("""
            select e from PayrollEntry e
            join fetch e.payrollRun r
            where e.orgCode = :orgCode and e.employee.id = :employeeId and r.status in :statuses
            order by r.periodStart desc
            """)
    List<PayrollEntry> findEmployeePayslips(
            @Param("orgCode") String orgCode,
            @Param("employeeId") Long employeeId,
            @Param("statuses") List<PayrollRunStatus> statuses
    );

    void deleteByOrgCodeAndPayrollRunId(String orgCode, Long payrollRunId);
}
