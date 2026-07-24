package com.payroll.backend.repository;

import com.payroll.backend.domain.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {
    Optional<ShiftAssignment> findByOrgCodeAndId(String orgCode, Long id);

    List<ShiftAssignment> findByOrgCodeAndEmployeeIdAndAssignmentDateBetweenOrderByAssignmentDate(
            String orgCode,
            Long employeeId,
            LocalDate startDate,
            LocalDate endDate
    );

    List<ShiftAssignment> findByOrgCodeAndAssignmentDateBetweenOrderByAssignmentDate(
            String orgCode,
            LocalDate startDate,
            LocalDate endDate
    );

    @Query("""
        select a from ShiftAssignment a
        join a.employee e
        where a.orgCode = :orgCode
          and a.assignmentDate between :startDate and :endDate
          and (:branchId is null or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        order by a.assignmentDate
        """)
    List<ShiftAssignment> findByOrgCodeAndBranchIdAndAssignmentDateBetweenOrderByAssignmentDate(
            @Param("orgCode") String orgCode,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
        select a from ShiftAssignment a
        join a.employee e
        where a.orgCode = :orgCode
          and a.assignmentDate between :startDate and :endDate
          and e.id in :employeeIds
        order by a.assignmentDate
        """)
    List<ShiftAssignment> findByOrgCodeAndEmployeeIdInAndAssignmentDateBetweenOrderByAssignmentDate(
            @Param("orgCode") String orgCode,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    List<ShiftAssignment> findByOrgCodeAndEmployeeIdAndAssignmentDateIn(String orgCode, Long employeeId, List<LocalDate> dates);

    void deleteByOrgCodeAndEmployeeIdAndAssignmentDateIn(String orgCode, Long employeeId, List<LocalDate> dates);
}
