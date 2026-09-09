package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeLeaveEntitlement;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;
import com.payroll.backend.dto.leave.LeaveBalanceAllocationRequest;
import com.payroll.backend.dto.leave.LeaveBalanceResponse;
import com.payroll.backend.dto.leave.LeaveBalanceUpdateRequest;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeLeaveEntitlementRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Year;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    private static final Set<LeaveType> TRACKED_LEAVE_TYPES = EnumSet.complementOf(EnumSet.of(LeaveType.UNPAID));

    private final EmployeeLeaveEntitlementRepository entitlementRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<LeaveBalanceResponse> getBalances(Long employeeId, Integer year, UserPrincipal principal) {
        int balanceYear = requireYear(year);
        Employee employee = findAccessibleEmployee(employeeId, principal);
        return calculateBalances(employee, balanceYear);
    }

    @Transactional
    public List<LeaveBalanceResponse> updateBalances(
            Long employeeId,
            LeaveBalanceUpdateRequest request,
            UserPrincipal principal
    ) {
        int balanceYear = requireYear(request.year());
        Employee employee = findAccessibleEmployee(employeeId, principal);
        Set<LeaveType> updatedTypes = new HashSet<>();

        for (LeaveBalanceAllocationRequest balance : request.balances()) {
            if (!TRACKED_LEAVE_TYPES.contains(balance.leaveType())) {
                throw new BadRequestException("Unpaid leave does not have a leave balance");
            }
            if (!updatedTypes.add(balance.leaveType())) {
                throw new BadRequestException("Each leave type can be updated only once");
            }

            EmployeeLeaveEntitlement entitlement = entitlementRepository
                    .findByOrgCodeAndEmployeeIdAndLeaveTypeAndLeaveYear(
                            currentOrgService.orgCode(), employee.getId(), balance.leaveType(), balanceYear
                    )
                    .orElseGet(EmployeeLeaveEntitlement::new);
            if (entitlement.getId() == null) {
                entitlement.setOrgCode(currentOrgService.orgCode());
                entitlement.setEmployee(employee);
                entitlement.setLeaveType(balance.leaveType());
                entitlement.setLeaveYear(balanceYear);
            }
            entitlement.setAllocatedMinutes(balance.allocatedMinutes());
            entitlement.setCarriedForwardMinutes(balance.carriedForwardMinutes());
            entitlementRepository.save(entitlement);
        }

        auditService.log("LEAVE_BALANCES_UPDATED", "Employee", employee.getId(), "Year " + balanceYear);
        return calculateBalances(employee, balanceYear);
    }

    private List<LeaveBalanceResponse> calculateBalances(Employee employee, int year) {
        String orgCode = currentOrgService.orgCode();
        Map<LeaveType, EmployeeLeaveEntitlement> entitlements = new EnumMap<>(LeaveType.class);
        entitlementRepository.findByOrgCodeAndEmployeeIdAndLeaveYear(orgCode, employee.getId(), year)
                .forEach(entitlement -> entitlements.put(entitlement.getLeaveType(), entitlement));

        Map<LeaveType, Integer> approvedMinutes = new EnumMap<>(LeaveType.class);
        Map<LeaveType, Integer> pendingMinutes = new EnumMap<>(LeaveType.class);
        LocalDate firstDay = LocalDate.of(year, 1, 1);
        LocalDate lastDay = LocalDate.of(year, 12, 31);
        List<LeaveRequest> requests = leaveRequestRepository
                .findByOrgCodeAndEmployeeIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        orgCode, employee.getId(), lastDay, firstDay
                );

        for (LeaveRequest request : requests) {
            if (!TRACKED_LEAVE_TYPES.contains(request.getLeaveType()) || request.getLeaveMinutes() == null) {
                continue;
            }
            if (request.getStatus() == LeaveStatus.APPROVED) {
                approvedMinutes.merge(request.getLeaveType(), request.getLeaveMinutes(), Integer::sum);
            } else if (request.getStatus() == LeaveStatus.PENDING) {
                pendingMinutes.merge(request.getLeaveType(), request.getLeaveMinutes(), Integer::sum);
            }
        }

        return TRACKED_LEAVE_TYPES.stream()
                .sorted()
                .map(leaveType -> toResponse(
                        employee,
                        year,
                        leaveType,
                        entitlements.get(leaveType),
                        approvedMinutes.getOrDefault(leaveType, 0),
                        pendingMinutes.getOrDefault(leaveType, 0)
                ))
                .toList();
    }

    private LeaveBalanceResponse toResponse(
            Employee employee,
            int year,
            LeaveType leaveType,
            EmployeeLeaveEntitlement entitlement,
            int approvedMinutes,
            int pendingMinutes
    ) {
        int allocatedMinutes = entitlement == null ? 0 : entitlement.getAllocatedMinutes();
        int carriedForwardMinutes = entitlement == null ? 0 : entitlement.getCarriedForwardMinutes();
        int creditedMinutes = allocatedMinutes + carriedForwardMinutes;
        return new LeaveBalanceResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                year,
                leaveType,
                allocatedMinutes,
                carriedForwardMinutes,
                creditedMinutes,
                approvedMinutes,
                pendingMinutes,
                creditedMinutes - approvedMinutes - pendingMinutes
        );
    }

    private Employee findAccessibleEmployee(Long employeeId, UserPrincipal principal) {
        String orgCode = currentOrgService.orgCode();
        Employee employee;
        if (employeeAccessService.isEmployee(principal)) {
            employee = employeeAccessService.findCurrentEmployee(principal);
        } else {
            if (employeeId == null) {
                throw new BadRequestException("Employee is required");
            }
            employee = employeeRepository.findByOrgCodeAndId(orgCode, employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        }
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employee;
    }

    private int requireYear(Integer year) {
        int resolvedYear = year == null ? Year.now().getValue() : year;
        if (resolvedYear < 2000 || resolvedYear > 2100) {
            throw new BadRequestException("Leave balance year must be between 2000 and 2100");
        }
        return resolvedYear;
    }
}
