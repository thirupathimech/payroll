package com.payroll.backend.repository;

import com.payroll.backend.domain.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

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

    List<ShiftAssignment> findByOrgCodeAndEmployeeIdAndAssignmentDateIn(String orgCode, Long employeeId, List<LocalDate> dates);

    void deleteByOrgCodeAndEmployeeIdAndAssignmentDateIn(String orgCode, Long employeeId, List<LocalDate> dates);
}
