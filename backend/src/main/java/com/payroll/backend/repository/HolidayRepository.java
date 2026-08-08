package com.payroll.backend.repository;

import com.payroll.backend.domain.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    Optional<Holiday> findByOrgCodeAndId(String orgCode, Long id);

    @Query("""
        select h from Holiday h
        join fetch h.branch join fetch h.department join fetch h.designation
        where h.orgCode = :orgCode
          and (:branchId is null or h.branch.id = :branchId)
        order by h.holidayDate desc, h.createdAt desc
        """)
    List<Holiday> search(@Param("orgCode") String orgCode, @Param("branchId") Long branchId);

    Optional<Holiday> findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndHolidayDate(
            String orgCode, Long branchId, Long departmentId, Long designationId, LocalDate holidayDate);
}
