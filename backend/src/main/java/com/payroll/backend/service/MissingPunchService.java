package com.payroll.backend.service;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.MissingPunchRequest;
import com.payroll.backend.domain.enums.MissingPunchStatus;
import com.payroll.backend.domain.enums.MissingPunchType;
import com.payroll.backend.dto.attendance.MissingPunchCreateRequest;
import com.payroll.backend.dto.attendance.MissingPunchDecisionRequest;
import com.payroll.backend.dto.attendance.MissingPunchResponse;
import com.payroll.backend.dto.common.PageResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.repository.MissingPunchRequestRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MissingPunchService {

    private static final int OPEN_PUNCH_LOOKBACK_DAYS = 7;

    private final MissingPunchRequestRepository missingPunchRequestRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<MissingPunchResponse> search(
            String search,
            MissingPunchStatus status,
            boolean mine,
            int page,
            int size,
            UserPrincipal principal
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Long employeeId = mine || employeeAccessService.isEmployee(principal)
                ? employeeAccessService.findCurrentEmployee(principal).getId()
                : null;
        Long branchId = employeeAccessService.branchScopeId(principal);
        List<Long> managedEmployeeIds = employeeAccessService.managedEmployeeIds(principal);
        if (!mine && employeeAccessService.isLead(principal) && managedEmployeeIds.isEmpty()) {
            return PageResponse.from(new PageImpl<MissingPunchRequest>(List.of(), pageable, 0).map(this::toResponse));
        }
        return PageResponse.from(missingPunchRequestRepository.search(
                currentOrgService.orgCode(),
                blankToNull(search),
                employeeId,
                branchId,
                managedEmployeeIds.isEmpty() ? List.of(-1L) : managedEmployeeIds,
                !mine && !managedEmployeeIds.isEmpty(),
                status,
                pageable
        ).map(this::toResponse));
    }

    @Transactional
    public MissingPunchResponse create(MissingPunchCreateRequest request, UserPrincipal principal) {
        Employee employee = employeeAccessService.findCurrentEmployee(principal);
        validateRequestedPunchTime(request.punchDate(), request.punchTime());
        if (missingPunchRequestRepository.existsByOrgCodeAndEmployeeIdAndPunchDateAndPunchTypeAndStatusIn(
                currentOrgService.orgCode(),
                employee.getId(),
                request.punchDate(),
                request.punchType(),
                List.of(MissingPunchStatus.PENDING, MissingPunchStatus.APPROVED)
        )) {
            throw new BadRequestException("A pending or approved request already exists for this punch");
        }
        assertPunchCanBeApplied(employee, request.punchDate(), request.punchTime(), request.punchType());

        MissingPunchRequest missingPunchRequest = new MissingPunchRequest();
        missingPunchRequest.setOrgCode(currentOrgService.orgCode());
        missingPunchRequest.setEmployee(employee);
        missingPunchRequest.setPunchDate(request.punchDate());
        missingPunchRequest.setPunchTime(request.punchTime());
        missingPunchRequest.setPunchType(request.punchType());
        missingPunchRequest.setRemark(request.remark().trim());
        missingPunchRequest.setStatus(MissingPunchStatus.PENDING);

        MissingPunchRequest saved = missingPunchRequestRepository.save(missingPunchRequest);
        auditService.log("MISSING_PUNCH_REQUEST_CREATED", "MissingPunchRequest", saved.getId(), employee.getEmployeeCode());
        return toResponse(saved);
    }

    @Transactional
    public MissingPunchResponse decide(Long id, MissingPunchDecisionRequest request, UserPrincipal principal) {
        MissingPunchRequest missingPunchRequest = findRequest(id);
        employeeAccessService.assertCanAccessEmployee(principal, missingPunchRequest.getEmployee());
        if (missingPunchRequest.getStatus() != MissingPunchStatus.PENDING) {
            throw new BadRequestException("Only pending missing punch requests can be decided");
        }
        if (request.status() != MissingPunchStatus.APPROVED && request.status() != MissingPunchStatus.REJECTED) {
            throw new BadRequestException("Decision status must be APPROVED or REJECTED");
        }
        if (request.status() == MissingPunchStatus.APPROVED) {
            applyRequestedPunch(missingPunchRequest);
        }

        missingPunchRequest.setStatus(request.status());
        missingPunchRequest.setReviewerComment(blankToNull(request.reviewerComment()));
        missingPunchRequest.setReviewedBy(currentUser(principal));
        missingPunchRequest.setReviewedAt(Instant.now());
        MissingPunchRequest saved = missingPunchRequestRepository.save(missingPunchRequest);
        auditService.log("MISSING_PUNCH_REQUEST_DECIDED", "MissingPunchRequest", saved.getId(), request.status().name());
        return toResponse(saved);
    }

    private void applyRequestedPunch(MissingPunchRequest missingPunchRequest) {
        Employee employee = missingPunchRequest.getEmployee();
        if (missingPunchRequest.getPunchType() == MissingPunchType.IN) {
            AttendanceRecord attendance = attendanceRecordRepository
                    .findByOrgCodeAndEmployeeIdAndAttendanceDate(currentOrgService.orgCode(), employee.getId(), missingPunchRequest.getPunchDate())
                    .orElseGet(() -> newAttendanceRecord(employee, missingPunchRequest.getPunchDate()));
            if (attendance.getClockIn() != null) {
                throw new BadRequestException("The IN punch has already been recorded");
            }
            attendance.setClockInDate(missingPunchRequest.getPunchDate());
            attendance.setClockIn(missingPunchRequest.getPunchTime());
            attendance.setSource("MISSING_PUNCH");
            attendanceRecordRepository.save(attendance);
            return;
        }

        AttendanceRecord attendance = findOpenAttendance(employee, missingPunchRequest.getPunchDate());
        validateOutPunch(attendance, missingPunchRequest.getPunchDate(), missingPunchRequest.getPunchTime());
        attendance.setClockOutDate(missingPunchRequest.getPunchDate());
        attendance.setClockOut(missingPunchRequest.getPunchTime());
        attendance.setSource("MISSING_PUNCH");
        attendanceRecordRepository.save(attendance);
    }

    private void assertPunchCanBeApplied(Employee employee, LocalDate punchDate, LocalTime punchTime, MissingPunchType punchType) {
        if (punchType == MissingPunchType.IN) {
            AttendanceRecord attendance = attendanceRecordRepository
                    .findByOrgCodeAndEmployeeIdAndAttendanceDate(currentOrgService.orgCode(), employee.getId(), punchDate)
                    .orElse(null);
            if (attendance != null && attendance.getClockIn() != null) {
                throw new BadRequestException("An IN punch already exists for this date");
            }
            return;
        }

        AttendanceRecord attendance = findOpenAttendance(employee, punchDate);
        validateOutPunch(attendance, punchDate, punchTime);
    }

    private AttendanceRecord findOpenAttendance(Employee employee, LocalDate punchDate) {
        return attendanceRecordRepository
                .findFirstByOrgCodeAndEmployeeIdAndClockInIsNotNullAndClockOutIsNullAndAttendanceDateBetweenOrderByAttendanceDateDesc(
                        currentOrgService.orgCode(),
                        employee.getId(),
                        punchDate.minusDays(OPEN_PUNCH_LOOKBACK_DAYS),
                        punchDate
                )
                .orElseThrow(() -> new BadRequestException("No open IN punch was found for this employee"));
    }

    private void validateOutPunch(AttendanceRecord attendance, LocalDate punchDate, LocalTime punchTime) {
        LocalDate clockInDate = attendance.getClockInDate() == null ? attendance.getAttendanceDate() : attendance.getClockInDate();
        if (punchDate.isBefore(clockInDate)) {
            throw new BadRequestException("OUT date cannot be before the recorded IN date");
        }
        if (punchDate.equals(clockInDate) && !punchTime.isAfter(attendance.getClockIn())) {
            throw new BadRequestException("OUT time must be after the recorded IN time");
        }
    }

    private void validateRequestedPunchTime(LocalDate punchDate, LocalTime punchTime) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        if (punchDate.isAfter(today) || (punchDate.equals(today) && punchTime.isAfter(now))) {
            throw new BadRequestException("Future punches cannot be requested");
        }
    }

    private MissingPunchRequest findRequest(Long id) {
        return missingPunchRequestRepository.findByOrgCodeAndId(currentOrgService.orgCode(), id)
                .orElseThrow(() -> new ResourceNotFoundException("Missing punch request not found"));
    }

    private AttendanceRecord newAttendanceRecord(Employee employee, LocalDate attendanceDate) {
        AttendanceRecord attendance = new AttendanceRecord();
        attendance.setOrgCode(currentOrgService.orgCode());
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(attendanceDate);
        return attendance;
    }

    private AppUser currentUser(UserPrincipal principal) {
        return appUserRepository.findByOrgCodeAndEmailIgnoreCase(principal.orgCode(), principal.email())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found"));
    }

    private MissingPunchResponse toResponse(MissingPunchRequest missingPunchRequest) {
        Employee employee = missingPunchRequest.getEmployee();
        return new MissingPunchResponse(
                missingPunchRequest.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                missingPunchRequest.getPunchDate(),
                missingPunchRequest.getPunchTime(),
                missingPunchRequest.getPunchType(),
                missingPunchRequest.getRemark(),
                missingPunchRequest.getStatus(),
                missingPunchRequest.getReviewedBy() == null ? null : missingPunchRequest.getReviewedBy().getEmail(),
                missingPunchRequest.getReviewerComment(),
                missingPunchRequest.getReviewedAt(),
                missingPunchRequest.getCreatedAt(),
                missingPunchRequest.getUpdatedAt()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
