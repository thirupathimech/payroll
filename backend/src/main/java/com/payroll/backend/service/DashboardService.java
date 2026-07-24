package com.payroll.backend.service;

import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.dashboard.DashboardSummaryResponse;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
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
    private final EmployeeAccessService employeeAccessService;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(UserPrincipal principal) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        String orgCode = currentOrgService.orgCode();
        Long branchId = employeeAccessService.branchScopeId(principal);

        return new DashboardSummaryResponse(
                employeeRepository.search(orgCode, null, null, null, branchId, Pageable.unpaged()).getNumberOfElements(),
                employeeRepository.search(orgCode, null, EmploymentStatus.ACTIVE, null, branchId, Pageable.unpaged()).getNumberOfElements(),
                departmentRepository.countByOrgCodeAndActiveTrue(orgCode),
                leaveRequestRepository.countByOrgCodeAndStatusAndBranchId(orgCode, LeaveStatus.PENDING, branchId),
                leaveRequestRepository.countByOrgCodeAndStatusAndStartDateBetweenAndBranchId(orgCode, LeaveStatus.APPROVED, monthStart, monthEnd, branchId),
                leaveService.recent(principal)
        );
    }
}
