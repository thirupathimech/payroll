package com.payroll.backend.repository;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.enums.EmploymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    boolean existsByEmailIgnoreCase(String email);

    Optional<Employee> findByEmployeeCodeIgnoreCase(String employeeCode);

    Optional<Employee> findByEmailIgnoreCase(String email);

    long countByStatus(EmploymentStatus status);

    @Query("""
        select e from Employee e
        join e.department d
        join e.designation g
        where (:search is null
            or lower(e.employeeCode) like lower(concat('%', :search, '%'))
            or lower(e.firstName) like lower(concat('%', :search, '%'))
            or lower(e.lastName) like lower(concat('%', :search, '%'))
            or lower(e.email) like lower(concat('%', :search, '%')))
          and (:status is null or e.status = :status)
          and (:departmentId is null or d.id = :departmentId)
        """)
    Page<Employee> search(
            @Param("search") String search,
            @Param("status") EmploymentStatus status,
            @Param("departmentId") Long departmentId,
            Pageable pageable
    );
}
