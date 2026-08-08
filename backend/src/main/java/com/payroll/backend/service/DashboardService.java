package com.payroll.backend.service;

import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.dashboard.DashboardSummaryResponse;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveService leaveService;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AttendanceRecordRepository attendanceRecordRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(UserPrincipal principal) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        String orgCode = currentOrgService.orgCode();
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = employeeAccessService.managedEmployeeIds(principal);
        if (employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return new DashboardSummaryResponse(0, 0, 0, 0, 0, 0, List.of());
        }
        List<Long> effectiveEmployeeIds = managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds;
        boolean restrictToEmployeeIds = !managedEmployeeIds.isEmpty();

        return new DashboardSummaryResponse(
                employeeRepository.search(orgCode, null, null, null, branchId, effectiveEmployeeIds, restrictToEmployeeIds, Pageable.unpaged()).getNumberOfElements(),
                employeeRepository.search(orgCode, null, EmploymentStatus.ACTIVE, null, branchId, effectiveEmployeeIds, restrictToEmployeeIds, Pageable.unpaged()).getNumberOfElements(),
                attendanceRecordRepository.countPresent(orgCode, LocalDate.now(), branchId, effectiveEmployeeIds, restrictToEmployeeIds),
                departmentRepository.countByOrgCodeAndActiveTrue(orgCode),
                leaveRequestRepository.countByOrgCodeAndStatusAndBranchId(orgCode, LeaveStatus.PENDING, branchId, effectiveEmployeeIds, restrictToEmployeeIds),
                leaveRequestRepository.countByOrgCodeAndStatusAndStartDateBetweenAndBranchId(
                        orgCode,
                        LeaveStatus.APPROVED,
                        monthStart,
                        monthEnd,
                        branchId,
                        effectiveEmployeeIds,
                        restrictToEmployeeIds
                ),
                leaveService.recent(principal)
        );
    }
}
