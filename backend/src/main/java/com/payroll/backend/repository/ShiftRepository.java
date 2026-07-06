package com.payroll.backend.repository;

import com.payroll.backend.domain.Shift;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByOrgCodeAndId(String orgCode, Long id);

    Optional<Shift> findByOrgCodeAndCodeIgnoreCase(String orgCode, String code);

    List<Shift> findByOrgCodeAndActiveTrueOrderByName(String orgCode);

    @Query("""
        select s from Shift s
        where s.orgCode = :orgCode
          and (:search is null
            or lower(s.name) like lower(concat('%', :search, '%'))
            or lower(s.code) like lower(concat('%', :search, '%')))
          and (:active is null or s.active = :active)
        """)
    Page<Shift> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
