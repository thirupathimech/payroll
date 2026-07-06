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
            @Param("status") LeaveStatus status,
            Pageable pageable
    );
}
