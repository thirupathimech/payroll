package com.payroll.backend.repository;

import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.enums.LeaveStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    long countByOrgCodeAndStatus(String orgCode, LeaveStatus status);

    long countByOrgCodeAndStatusAndStartDateBetween(String orgCode, LeaveStatus status, LocalDate startDate, LocalDate endDate);

    List<LeaveRequest> findTop5ByOrgCodeOrderByCreatedAtDesc(String orgCode);

    Optional<LeaveRequest> findByOrgCodeAndId(String orgCode, Long id);

    @Query("""
        select l from LeaveRequest l
        join l.employee e
        where l.orgCode = :orgCode
          and e.orgCode = :orgCode
          and (:employeeId is null or e.id = :employeeId)
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
          and (:status is null or l.status = :status)
          and (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%')))
        """)
    Page<LeaveRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") LeaveStatus status,
            Pageable pageable
    );

    @Query("""
        select count(l) from LeaveRequest l
        join l.employee e
        where l.orgCode = :orgCode
          and l.status = :status
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        """)
    long countByOrgCodeAndStatusAndBranchId(
            @Param("orgCode") String orgCode,
            @Param("status") LeaveStatus status,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds
    );

    @Query("""
        select count(l) from LeaveRequest l
        join l.employee e
        where l.orgCode = :orgCode
          and l.status = :status
          and l.startDate between :startDate and :endDate
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        """)
    long countByOrgCodeAndStatusAndStartDateBetweenAndBranchId(
            @Param("orgCode") String orgCode,
            @Param("status") LeaveStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds
    );

    @Query("""
        select l from LeaveRequest l
        join l.employee e
        where l.orgCode = :orgCode
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        order by l.createdAt desc
        """)
    List<LeaveRequest> findRecentByOrgCodeAndBranchId(
            @Param("orgCode") String orgCode,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            Pageable pageable
    );
}
