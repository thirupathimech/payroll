package com.payroll.backend.repository;

import com.payroll.backend.domain.OvertimeRequest;
import com.payroll.backend.domain.enums.OvertimeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OvertimeRequestRepository extends JpaRepository<OvertimeRequest, Long> {

    Optional<OvertimeRequest> findByOrgCodeAndId(String orgCode, Long id);

    boolean existsByOrgCodeAndEmployeeIdAndOvertimeDateAndStatusIn(
            String orgCode, Long employeeId, LocalDate overtimeDate, Collection<OvertimeStatus> statuses
    );

    @Query("""
        select o from OvertimeRequest o
        join fetch o.employee
        where o.orgCode = :orgCode
          and o.status = :status
          and o.payrollRun is null
          and o.overtimeDate <= :periodEnd
          and o.reviewedAt <= :approvalCutoff
        order by o.overtimeDate asc, o.id asc
        """)
    List<OvertimeRequest> findApprovedReadyForPayroll(
            @Param("orgCode") String orgCode,
            @Param("status") OvertimeStatus status,
            @Param("periodEnd") LocalDate periodEnd,
            @Param("approvalCutoff") Instant approvalCutoff
    );

    List<OvertimeRequest> findByOrgCodeAndPayrollRunId(String orgCode, Long payrollRunId);

    @Modifying
    @Query("""
        update OvertimeRequest o
        set o.payrollRun = null
        where o.orgCode = :orgCode and o.payrollRun.id = :payrollRunId and o.status = :status
        """)
    int releaseFromDraftPayroll(
            @Param("orgCode") String orgCode,
            @Param("payrollRunId") Long payrollRunId,
            @Param("status") OvertimeStatus status
    );

    @Query("""
        select o from OvertimeRequest o
        join o.employee e
        where o.orgCode = :orgCode
          and e.orgCode = :orgCode
          and (:employeeId is null or e.id = :employeeId)
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
          and (:status is null or o.status = :status)
          and (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%')))
        """)
    Page<OvertimeRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") OvertimeStatus status,
            Pageable pageable
    );
}
