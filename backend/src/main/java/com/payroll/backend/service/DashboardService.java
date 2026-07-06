package com.payroll.backend.service;

import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.dashboard.DashboardSummaryResponse;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveService leaveService;
    private final CurrentOrgService currentOrgService;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        String orgCode = currentOrgService.orgCode();

        return new DashboardSummaryResponse(
                employeeRepository.countByOrgCode(orgCode),
                employeeRepository.countByOrgCodeAndStatus(orgCode, EmploymentStatus.ACTIVE),
                departmentRepository.countByOrgCodeAndActiveTrue(orgCode),
                leaveRequestRepository.countByOrgCodeAndStatus(orgCode, LeaveStatus.PENDING),
                leaveRequestRepository.countByOrgCodeAndStatusAndStartDateBetween(orgCode, LeaveStatus.APPROVED, monthStart, monthEnd),
                leaveService.recent()
        );
    }
}
