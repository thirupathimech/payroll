package com.payroll.backend.repository;

import com.payroll.backend.domain.Designation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DesignationRepository extends JpaRepository<Designation, Long> {
    boolean existsByCodeIgnoreCase(String code);

    Optional<Designation> findByCodeIgnoreCase(String code);

    @Query("""
        select g from Designation g
        join g.department d
        where (:search is null
            or lower(g.title) like lower(concat('%', :search, '%'))
            or lower(g.code) like lower(concat('%', :search, '%')))
          and (:departmentId is null or d.id = :departmentId)
          and (:active is null or g.active = :active)
        """)
    Page<Designation> search(
            @Param("search") String search,
            @Param("departmentId") Long departmentId,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
