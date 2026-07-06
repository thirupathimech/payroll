package com.payroll.backend.repository;

import com.payroll.backend.domain.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    long countByOrgCodeAndActiveTrue(String orgCode);

    Optional<Department> findByOrgCodeAndId(String orgCode, Long id);

    Optional<Department> findByOrgCodeAndNameIgnoreCase(String orgCode, String name);

    Optional<Department> findByOrgCodeAndCodeIgnoreCase(String orgCode, String code);

    @Query("""
        select d from Department d
        where d.orgCode = :orgCode
          and (:search is null
            or lower(d.name) like lower(concat('%', :search, '%'))
            or lower(d.code) like lower(concat('%', :search, '%')))
          and (:active is null or d.active = :active)
        """)
    Page<Department> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
