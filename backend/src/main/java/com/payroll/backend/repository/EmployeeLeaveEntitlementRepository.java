package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeLeaveEntitlement;
import com.payroll.backend.domain.enums.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeLeaveEntitlementRepository extends JpaRepository<EmployeeLeaveEntitlement, Long> {

    List<EmployeeLeaveEntitlement> findByOrgCodeAndEmployeeIdAndLeaveYear(String orgCode, Long employeeId, Integer leaveYear);

    Optional<EmployeeLeaveEntitlement> findByOrgCodeAndEmployeeIdAndLeaveTypeAndLeaveYear(
            String orgCode,
            Long employeeId,
            LeaveType leaveType,
            Integer leaveYear
    );
}
