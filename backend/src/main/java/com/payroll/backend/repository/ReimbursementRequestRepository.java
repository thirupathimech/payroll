package com.payroll.backend.repository;

import com.payroll.backend.domain.ReimbursementRequest;
import com.payroll.backend.domain.enums.ReimbursementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReimbursementRequestRepository extends JpaRepository<ReimbursementRequest, Long> {
    Optional<ReimbursementRequest> findByOrgCodeAndId(String orgCode, Long id);

    @Query("""
        select r from ReimbursementRequest r
        join fetch r.employee
        where r.orgCode = :orgCode
          and r.status = :status
          and r.payrollRun is null
          and r.expenseDate <= :periodEnd
          and r.reviewedAt <= :approvalCutoff
        order by r.expenseDate asc, r.id asc
        """)
    List<ReimbursementRequest> findApprovedReadyForPayroll(
            @Param("orgCode") String orgCode,
            @Param("status") ReimbursementStatus status,
            @Param("periodEnd") LocalDate periodEnd,
            @Param("approvalCutoff") Instant approvalCutoff
    );

    List<ReimbursementRequest> findByOrgCodeAndPayrollRunId(String orgCode, Long payrollRunId);

    @Modifying
    @Query("""
        update ReimbursementRequest r
        set r.payrollRun = null
        where r.orgCode = :orgCode and r.payrollRun.id = :payrollRunId and r.status = :status
        """)
    int releaseFromDraftPayroll(
            @Param("orgCode") String orgCode,
            @Param("payrollRunId") Long payrollRunId,
            @Param("status") ReimbursementStatus status
    );

    @Query("""
        select r from ReimbursementRequest r
        join r.employee e
        where r.orgCode = :orgCode
          and e.orgCode = :orgCode
          and (:employeeId is null or e.id = :employeeId)
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
          and (:status is null or r.status = :status)
          and (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%'))
            or lower(r.category) like lower(concat('%', :search, '%')))
        """)
    Page<ReimbursementRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") ReimbursementStatus status,
            Pageable pageable
    );
}
