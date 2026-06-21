package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.dto.leave.LeaveCreateRequest;
import com.payroll.backend.dto.leave.LeaveDecisionRequest;
import com.payroll.backend.dto.leave.LeaveResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<LeaveResponse> search(String search, Long employeeId, LeaveStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(leaveRequestRepository
                .search(blankToNull(search), employeeId, status, pageable)
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> recent() {
        return leaveRequestRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveResponse get(Long id) {
        return toResponse(findLeave(id));
    }

    @Transactional
    public LeaveResponse create(LeaveCreateRequest request) {
        validateDates(request.startDate(), request.endDate());
        Employee employee = employeeRepository.findById(request.employeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(request.leaveType());
        leaveRequest.setStartDate(request.startDate());
        leaveRequest.setEndDate(request.endDate());
        leaveRequest.setReason(request.reason().trim());
        leaveRequest.setStatus(LeaveStatus.PENDING);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        auditService.log("LEAVE_REQUEST_CREATED", "LeaveRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public LeaveResponse decide(Long id, LeaveDecisionRequest request) {
        LeaveRequest leaveRequest = findLeave(id);
        if (request.status() == LeaveStatus.PENDING) {
            throw new BadRequestException("Decision status must be APPROVED, REJECTED, or CANCELLED");
        }

        AppUser reviewer = currentUser();
        leaveRequest.setStatus(request.status());
        leaveRequest.setReviewerComment(request.reviewerComment());
        leaveRequest.setReviewedBy(reviewer);
        leaveRequest.setReviewedAt(Instant.now());

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        auditService.log("LEAVE_REQUEST_DECIDED", "LeaveRequest", saved.getId(), request.status().name());
        return toResponse(saved);
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("Leave end date cannot be before start date");
        }
    }

    private AppUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new BadRequestException("Reviewer is not authenticated");
        }
        return appUserRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found"));
    }

    private LeaveRequest findLeave(Long id) {
        return leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found"));
    }

    public LeaveResponse toResponse(LeaveRequest leaveRequest) {
        Employee employee = leaveRequest.getEmployee();
        String employeeName = employee.getFirstName() + " " + employee.getLastName();
        long days = ChronoUnit.DAYS.between(leaveRequest.getStartDate(), leaveRequest.getEndDate()) + 1;
        return new LeaveResponse(
                leaveRequest.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employeeName,
                leaveRequest.getLeaveType(),
                leaveRequest.getStatus(),
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                days,
                leaveRequest.getReason(),
                leaveRequest.getReviewedBy() == null ? null : leaveRequest.getReviewedBy().getEmail(),
                leaveRequest.getReviewerComment(),
                leaveRequest.getReviewedAt(),
                leaveRequest.getCreatedAt(),
                leaveRequest.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
