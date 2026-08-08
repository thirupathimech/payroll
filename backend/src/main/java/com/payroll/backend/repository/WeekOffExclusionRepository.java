package com.payroll.backend.repository;

import com.payroll.backend.domain.WeekOffExclusion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeekOffExclusionRepository extends JpaRepository<WeekOffExclusion, Long> {
    Optional<WeekOffExclusion> findByOrgCodeAndId(String orgCode, Long id);
    Optional<WeekOffExclusion> findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndExcludedDate(String orgCode, Long branchId, Long departmentId, Long designationId, LocalDate date);
    boolean existsByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndExcludedDate(String orgCode, Long branchId, Long departmentId, Long designationId, LocalDate date);
    @Query("select e from WeekOffExclusion e join fetch e.branch join fetch e.department join fetch e.designation where e.orgCode = :orgCode and (:branchId is null or e.branch.id = :branchId) order by e.excludedDate desc")
    List<WeekOffExclusion> search(@Param("orgCode") String orgCode, @Param("branchId") Long branchId);
}
