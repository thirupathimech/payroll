package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeTransferRequest;
import com.payroll.backend.domain.enums.EmployeeTransferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeTransferRequestRepository extends JpaRepository<EmployeeTransferRequest, Long> {
    Optional<EmployeeTransferRequest> findByOrgCodeAndId(String orgCode, Long id);

    boolean existsByOrgCodeAndEmployeeIdAndStatus(String orgCode, Long employeeId, EmployeeTransferStatus status);

    boolean existsByOrgCodeAndEmployeeIdAndStatusAndAppliedAtIsNull(
            String orgCode, Long employeeId, EmployeeTransferStatus status
    );

    boolean existsByOrgCodeAndEmployeeIdAndEffectiveDateAndStatus(
            String orgCode, Long employeeId, LocalDate effectiveDate, EmployeeTransferStatus status
    );

    List<EmployeeTransferRequest> findByOrgCodeAndStatusAndEffectiveDateLessThanEqualOrderByEffectiveDateAsc(
            String orgCode, EmployeeTransferStatus status, LocalDate effectiveDate
    );

    List<EmployeeTransferRequest> findByStatusAndEffectiveDateLessThanEqualOrderByEffectiveDateAsc(
            EmployeeTransferStatus status, LocalDate effectiveDate
    );

    List<EmployeeTransferRequest> findByOrgCodeAndStatusOrderByEffectiveDateAsc(String orgCode, EmployeeTransferStatus status);

    @Query("""
        select t from EmployeeTransferRequest t
        join t.employee e
        where t.orgCode = :orgCode
          and e.orgCode = :orgCode
          and (:employeeId is null or e.id = :employeeId)
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
          and (:status is null or t.status = :status)
          and (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%')))
        """)
    Page<EmployeeTransferRequest> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("status") EmployeeTransferStatus status,
            Pageable pageable
    );
}
