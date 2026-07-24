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
        """)
    Page<Employee> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("status") EmploymentStatus status,
            @Param("departmentId") Long departmentId,
            @Param("branchId") Long branchId,
            Pageable pageable
    );
}
