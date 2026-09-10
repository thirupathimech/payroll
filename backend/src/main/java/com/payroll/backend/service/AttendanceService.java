package com.payroll.backend.service;

import com.payroll.backend.domain.AttendanceRecord;
import com.payroll.backend.domain.AttendanceSetting;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.attendance.AttendanceRequest;
import com.payroll.backend.dto.attendance.AttendanceResponse;
import com.payroll.backend.dto.attendance.AttendanceSettingsRequest;
import com.payroll.backend.dto.attendance.AttendanceSettingsResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.AttendanceRecordRepository;
import com.payroll.backend.repository.AttendanceSettingRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceSettingRepository attendanceSettingRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final AuditService auditService;
    private final EmployeeAccessService employeeAccessService;
    private final PayrollLockService payrollLockService;

    @Transactional(readOnly = true)
    public AttendanceSettingsResponse getSettings() {
        AttendanceSetting settings = attendanceSettingRepository.findByOrgCode(currentOrgService.orgCode())
                .orElseGet(() -> newAttendanceSettings(currentOrgService.orgCode()));
        return toSettingsResponse(settings);
    }

    @Transactional
    public AttendanceSettingsResponse updateSettings(AttendanceSettingsRequest request) {
        AttendanceSetting settings = attendanceSettingRepository.findByOrgCode(currentOrgService.orgCode())
                .orElseGet(() -> newAttendanceSettings(currentOrgService.orgCode()));

        settings.setAttendanceMode(request.attendanceMode());
        settings.setBiometricEnabled(request.biometricEnabled());
        settings.setBiometricName(request.biometricName());
        settings.setBiometricUrl(request.biometricUrl());
        settings.setBiometricApiKey(request.biometricApiKey());

        AttendanceSetting savedSettings = attendanceSettingRepository.save(settings);
        auditService.log(
                "ATTENDANCE_SETTINGS_UPDATED",
                "AttendanceSetting",
                savedSettings.getId(),
                savedSettings.getAttendanceMode().name()
        );
        return toSettingsResponse(savedSettings);
    }

    @Transactional
    public AttendanceResponse save(AttendanceRequest request, UserPrincipal principal) {
        LocalDate attendanceDate = request.date();
        LocalDate clockInDate = request.clockInDate() == null ? attendanceDate : request.clockInDate();
        LocalDate clockOutDate = request.clockOutDate() == null ? attendanceDate : request.clockOutDate();
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);

        validatePunchTimes(request, attendanceDate, clockInDate, clockOutDate, today, now);
        payrollLockService.assertUnlocked(
                attendanceDate.isBefore(clockInDate) ? attendanceDate : clockInDate,
                attendanceDate.isAfter(clockOutDate) ? attendanceDate : clockOutDate
        );

        Employee employee = findEmployee(request.employeeId());
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        if (employee.getStatus() == EmploymentStatus.TERMINATED || employee.getStatus() == EmploymentStatus.RESIGNED
                || (employee.getLastWorkingDate() != null && attendanceDate.isAfter(employee.getLastWorkingDate()))) {
            throw new BadRequestException("Attendance cannot be recorded after an employee's last working date");
        }

        AttendanceRecord attendance = attendanceRecordRepository
                .findByOrgCodeAndEmployeeIdAndAttendanceDate(currentOrgService.orgCode(), employee.getId(), attendanceDate)
                .orElseGet(() -> newAttendanceRecord(employee, attendanceDate));

        attendance.setClockInDate(request.clockIn() == null ? null : clockInDate);
        attendance.setClockOutDate(request.clockOut() == null ? null : clockOutDate);
        attendance.setClockIn(request.clockIn());
        attendance.setClockOut(request.clockOut());
        attendance.setSource(request.source());

        AttendanceRecord savedAttendance = attendanceRecordRepository.save(attendance);
        auditService.log(
                "ATTENDANCE_SAVED",
                "AttendanceRecord",
                savedAttendance.getId(),
                employee.getEmployeeCode() + " " + attendanceDate
        );
        return toResponse(savedAttendance);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> list(LocalDate from, LocalDate to, UserPrincipal principal) {
        return attendanceRecordRepository
                .findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(currentOrgService.orgCode(), from, to)
                .stream()
                .filter(attendance -> canAccessEmployee(principal, attendance.getEmployee()))
                .map(this::toResponse)
                .toList();
    }

    private AttendanceSetting newAttendanceSettings(String orgCode) {
        AttendanceSetting settings = new AttendanceSetting();
        settings.setOrgCode(orgCode);
        return settings;
    }

    private AttendanceRecord newAttendanceRecord(Employee employee, LocalDate attendanceDate) {
        AttendanceRecord attendance = new AttendanceRecord();
        attendance.setOrgCode(currentOrgService.orgCode());
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(attendanceDate);
        return attendance;
    }

    private void validatePunchTimes(
            AttendanceRequest request,
            LocalDate attendanceDate,
            LocalDate clockInDate,
            LocalDate clockOutDate,
            LocalDate today,
            LocalTime now
    ) {
        if (attendanceDate.isAfter(today)) {
            throw new BadRequestException("Future attendance date is not allowed");
        }
        if (request.clockIn() != null && !clockInDate.equals(attendanceDate)) {
            throw new BadRequestException("In date must match attendance date");
        }
        if (request.clockOut() != null && request.clockIn() == null) {
            throw new BadRequestException("Clock in is required before clock out");
        }
        if (request.clockOut() != null && clockOutDate.isBefore(clockInDate)) {
            throw new BadRequestException("Out date cannot be before in date");
        }
        if (request.clockIn() != null && request.clockOut() != null
                && clockOutDate.equals(clockInDate) && !request.clockOut().isAfter(request.clockIn())) {
            throw new BadRequestException("Out time must be after in time");
        }
        if (request.clockIn() != null && isFuture(clockInDate, request.clockIn(), today, now)) {
            throw new BadRequestException("Future in punch is not allowed");
        }
        if (request.clockOut() != null && isFuture(clockOutDate, request.clockOut(), today, now)) {
            throw new BadRequestException("Future out punch is not allowed");
        }
    }

    private Employee findEmployee(Long employeeId) {
        return employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }

    private AttendanceSettingsResponse toSettingsResponse(AttendanceSetting settings) {
        return new AttendanceSettingsResponse(
                settings.getId(),
                settings.getAttendanceMode(),
                settings.isBiometricEnabled(),
                settings.getBiometricName(),
                settings.getBiometricUrl(),
                settings.getBiometricApiKey(),
                settings.getUpdatedAt()
        );
    }

    private boolean isFuture(LocalDate date, LocalTime time, LocalDate today, LocalTime now) {
        return date.isAfter(today) || (date.isEqual(today) && time.isAfter(now));
    }

    private boolean canAccessEmployee(UserPrincipal principal, Employee employee) {
        try {
            employeeAccessService.assertCanAccessEmployee(principal, employee);
            return true;
        } catch (ResourceNotFoundException ignored) {
            return false;
        }
    }

    private AttendanceResponse toResponse(AttendanceRecord attendance) {
        Employee employee = attendance.getEmployee();
        return new AttendanceResponse(
                attendance.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFirstName() + " " + employee.getLastName(),
                attendance.getAttendanceDate(),
                attendance.getClockInDate(),
                attendance.getClockIn(),
                attendance.getClockOutDate(),
                attendance.getClockOut(),
                attendance.getSource()
        );
    }
}
