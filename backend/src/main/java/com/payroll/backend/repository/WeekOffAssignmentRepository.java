package com.payroll.backend.repository;

import com.payroll.backend.domain.WeekOffAssignment;
import com.payroll.backend.domain.enums.WeekOffAssignmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeekOffAssignmentRepository extends JpaRepository<WeekOffAssignment, Long> {

    Optional<WeekOffAssignment> findByOrgCodeAndId(String orgCode, Long id);

    @Query("""
        select w from WeekOffAssignment w
        left join fetch w.branch
        left join fetch w.department
        left join fetch w.designation
        left join fetch w.employee e
        where w.orgCode = :orgCode
          and (:type is null or w.assignmentType = :type)
          and (:employeeId is null or e.id = :employeeId)
          and (:branchId is null or w.branch.id = :branchId or e.branch.id = :branchId)
          and (:restrictToEmployeeIds = false or e.id in :employeeIds)
        order by w.createdAt desc
        """)
    List<WeekOffAssignment> search(
            @Param("orgCode") String orgCode,
            @Param("type") WeekOffAssignmentType type,
            @Param("employeeId") Long employeeId,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrictToEmployeeIds") boolean restrictToEmployeeIds
    );

    @Query("""
        select w from WeekOffAssignment w
        left join fetch w.branch
        left join fetch w.department
        left join fetch w.designation
        left join fetch w.employee
        where w.orgCode = :orgCode
          and (
            w.assignmentType in :weeklyTypes
            or (w.assignmentType = :dateType and w.weekOffDate between :fromDate and :toDate)
          )
        """)
    List<WeekOffAssignment> findForCalendarReport(
            @Param("orgCode") String orgCode,
            @Param("weeklyTypes") List<WeekOffAssignmentType> weeklyTypes,
            @Param("dateType") WeekOffAssignmentType dateType,
            @Param("fromDate") LocalDate from,
            @Param("toDate") LocalDate to
    );

    Optional<WeekOffAssignment> findByOrgCodeAndAssignmentTypeAndBranchIdAndDepartmentIdAndDesignationIdAndDayOfWeek(
            String orgCode,
            WeekOffAssignmentType assignmentType,
            Long branchId,
            Long departmentId,
            Long designationId,
            DayOfWeek dayOfWeek
    );

    Optional<WeekOffAssignment> findByOrgCodeAndAssignmentTypeAndEmployeeIdAndDayOfWeek(
            String orgCode,
            WeekOffAssignmentType assignmentType,
            Long employeeId,
            DayOfWeek dayOfWeek
    );

    Optional<WeekOffAssignment> findByOrgCodeAndAssignmentTypeAndEmployeeIdAndWeekOffDate(
            String orgCode,
            WeekOffAssignmentType assignmentType,
            Long employeeId,
            LocalDate weekOffDate
    );

    boolean existsByOrgCodeAndAssignmentTypeAndEmployeeIdAndDayOfWeek(
            String orgCode, WeekOffAssignmentType assignmentType, Long employeeId, DayOfWeek dayOfWeek);

}
