package com.payroll.backend.repository;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.enums.EmploymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByOrgCodeAndId(String orgCode, Long id);

    boolean existsByOrgCodeAndId(String orgCode, Long id);

    Optional<Employee> findByOrgCodeAndEmployeeCodeIgnoreCase(String orgCode, String employeeCode);

    List<Employee> findByOrgCodeAndManagerIdOrderByFirstNameAsc(String orgCode, Long managerId);

    @Query("""
        select e from Employee e
        join fetch e.department
        join fetch e.designation
        left join fetch e.branch
        where e.orgCode = :orgCode
          and e.status = :status
        order by e.firstName asc, e.lastName asc, e.id asc
        """)
    List<Employee> findSalaryReportEmployees(
            @Param("orgCode") String orgCode,
            @Param("status") EmploymentStatus status
    );

    @Query("""
        select e from Employee e
        join fetch e.department
        join fetch e.designation
        left join fetch e.branch
        where e.orgCode = :orgCode
          and e.joiningDate <= :periodEnd
          and (
            e.status in :currentStatuses
            or (e.status = com.payroll.backend.domain.enums.EmploymentStatus.TERMINATED
                and e.lastWorkingDate is not null and e.lastWorkingDate >= :periodStart)
          )
        order by e.firstName asc, e.lastName asc, e.id asc
        """)
    List<Employee> findPayrollEmployees(
            @Param("orgCode") String orgCode,
            @Param("currentStatuses") List<EmploymentStatus> currentStatuses,
            @Param("periodStart") java.time.LocalDate periodStart,
            @Param("periodEnd") java.time.LocalDate periodEnd
    );

    @Query("""
        select e from Employee e
        join fetch e.department
        join fetch e.designation
        left join fetch e.branch
        where e.orgCode = :orgCode
          and e.status = :status
          and (:branchId is null or e.branch.id = :branchId)
          and (:departmentId is null or e.department.id = :departmentId)
          and (:designationId is null or e.designation.id = :designationId)
          and (:employeeId is null or e.id = :employeeId)
          and (:accessibleBranchId is null or e.branch.id = :accessibleBranchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        order by e.firstName asc, e.lastName asc, e.id asc
        """)
    List<Employee> findCalendarReportEmployees(
            @Param("orgCode") String orgCode,
            @Param("status") EmploymentStatus status,
            @Param("branchId") Long branchId,
            @Param("departmentId") Long departmentId,
            @Param("designationId") Long designationId,
            @Param("employeeId") Long employeeId,
            @Param("accessibleBranchId") Long accessibleBranchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds
    );

    @Query("""
        select e from Employee e
        join fetch e.department
        join fetch e.designation
        left join fetch e.branch
        left join fetch e.manager
        where e.orgCode = :orgCode
          and e.status <> :excludedStatus
        order by e.firstName asc, e.lastName asc, e.id asc
        """)
    List<Employee> findOrganizationHierarchyEmployees(
            @Param("orgCode") String orgCode,
            @Param("excludedStatus") EmploymentStatus excludedStatus
    );

    Optional<Employee> findByOrgCodeAndEmailIgnoreCase(String orgCode, String email);

    @Query("select e.employeeCode from Employee e where e.orgCode = :orgCode")
    List<String> findEmployeeCodesByOrgCode(@Param("orgCode") String orgCode);

    long countByOrgCode(String orgCode);

    long countByOrgCodeAndStatus(String orgCode, EmploymentStatus status);

    @Query("""
        select e from Employee e
        join e.department d
        join e.designation g
        where e.orgCode = :orgCode
          and d.orgCode = :orgCode
          and g.orgCode = :orgCode
          and (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%'))
            or lower(e.email) like lower(concat('%', :search, '%')))
          and (:status is null or e.status = :status)
          and (:departmentId is null or d.id = :departmentId)
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        """)
    Page<Employee> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("status") EmploymentStatus status,
            @Param("departmentId") Long departmentId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            Pageable pageable
    );
}
