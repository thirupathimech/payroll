package com.payroll.backend.repository;

import com.payroll.backend.domain.ResignationRequest;
import com.payroll.backend.domain.enums.ResignationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ResignationRequestRepository extends JpaRepository<ResignationRequest, Long> {
    Optional<ResignationRequest> findByOrgCodeAndId(String orgCode, Long id);

    boolean existsByOrgCodeAndEmployeeIdAndStatusIn(String orgCode, Long employeeId, List<ResignationStatus> statuses);

    List<ResignationRequest> findByOrgCodeAndStatusAndApprovedLastWorkingDateLessThanEqual(
            String orgCode, ResignationStatus status, LocalDate lastWorkingDate
    );

    List<ResignationRequest> findByStatusAndApprovedLastWorkingDateLessThanEqual(
            ResignationStatus status, LocalDate lastWorkingDate
    );

    @Query("""
        select r from ResignationRequest r
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
            or lower(e.lastName) like lower(concat('%', :search, '%')))
        """)
    Page<ResignationRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") ResignationStatus status,
            Pageable pageable
    );
}
