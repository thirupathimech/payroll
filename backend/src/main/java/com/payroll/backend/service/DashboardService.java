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

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);

        return new DashboardSummaryResponse(
                employeeRepository.count(),
                employeeRepository.countByStatus(EmploymentStatus.ACTIVE),
                departmentRepository.countByActiveTrue(),
                leaveRequestRepository.countByStatus(LeaveStatus.PENDING),
                leaveRequestRepository.countByStatusAndStartDateBetween(LeaveStatus.APPROVED, monthStart, monthEnd),
                leaveService.recent()
        );
    }
}
