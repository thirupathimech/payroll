package com.payroll.backend.repository;

import com.payroll.backend.domain.MissingPunchRequest;
import com.payroll.backend.domain.enums.MissingPunchStatus;
import com.payroll.backend.domain.enums.MissingPunchType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MissingPunchRequestRepository extends JpaRepository<MissingPunchRequest, Long> {

    Optional<MissingPunchRequest> findByOrgCodeAndId(String orgCode, Long id);

    boolean existsByOrgCodeAndEmployeeIdAndPunchDateAndPunchTypeAndStatusIn(
            String orgCode,
            Long employeeId,
            LocalDate punchDate,
            MissingPunchType punchType,
            List<MissingPunchStatus> statuses
    );

    @Query("""
            select m from MissingPunchRequest m
            join m.employee e
            where m.orgCode = :orgCode
              and e.orgCode = :orgCode
              and (:employeeId is null or e.id = :employeeId)
              and (:branchId is null or e.branch.id = :branchId)
              and (:restrictToEmployeeIds = false or e.id in :employeeIds)
              and (:status is null or m.status = :status)
              and (:search is null
                or lower(e.employeeCode) like lower(concat('%', :search, '%'))
                or lower(e.firstName) like lower(concat('%', :search, '%'))
                or lower(e.lastName) like lower(concat('%', :search, '%')))
            """)
    Page<MissingPunchRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") MissingPunchStatus status,
            Pageable pageable
    );
}
