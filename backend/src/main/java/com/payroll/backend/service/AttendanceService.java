package com.payroll.backend.service;

import com.payroll.backend.domain.*; import com.payroll.backend.dto.attendance.*; import com.payroll.backend.exception.ResourceNotFoundException; import com.payroll.backend.exception.BadRequestException; import com.payroll.backend.repository.*; import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import java.time.LocalDate; import java.time.LocalTime; import java.util.*;

@Service @RequiredArgsConstructor
public class AttendanceService {
 private final AttendanceSettingRepository settings; private final AttendanceRecordRepository records; private final EmployeeRepository employees; private final CurrentOrgService org; private final AuditService audit; private final EmployeeAccessService employeeAccessService;
 @Transactional(readOnly=true) public AttendanceSettingsResponse getSettings(){ return responseSettings(settings.findByOrgCode(org.orgCode()).orElseGet(()->{var s=new AttendanceSetting();s.setOrgCode(org.orgCode());return s;})); }
 @Transactional public AttendanceSettingsResponse updateSettings(AttendanceSettingsRequest r){var s=settings.findByOrgCode(org.orgCode()).orElseGet(()->{var x=new AttendanceSetting();x.setOrgCode(org.orgCode());return x;}); s.setAttendanceMode(r.attendanceMode());s.setBiometricEnabled(r.biometricEnabled());s.setBiometricName(r.biometricName());s.setBiometricUrl(r.biometricUrl());s.setBiometricApiKey(r.biometricApiKey()); var saved=settings.save(s); audit.log("ATTENDANCE_SETTINGS_UPDATED","AttendanceSetting",saved.getId(),saved.getAttendanceMode().name()); return responseSettings(saved);}
 @Transactional public AttendanceResponse save(AttendanceRequest r, com.payroll.backend.security.UserPrincipal principal){
  LocalDate attendanceDate = r.date();
  LocalDate clockInDate = r.clockInDate() == null ? attendanceDate : r.clockInDate();
  LocalDate clockOutDate = r.clockOutDate() == null ? attendanceDate : r.clockOutDate();
  LocalDate today = LocalDate.now();
  LocalTime now = LocalTime.now().withSecond(0).withNano(0);
  if (attendanceDate.isAfter(today)) throw new BadRequestException("Future attendance date is not allowed");
  if (r.clockIn() != null && !clockInDate.equals(attendanceDate)) throw new BadRequestException("In date must match attendance date");
  if (r.clockOut() != null && r.clockIn() == null) throw new BadRequestException("Clock in is required before clock out");
  if (r.clockOut() != null && clockOutDate.isBefore(clockInDate)) throw new BadRequestException("Out date cannot be before in date");
  if (r.clockIn() != null && r.clockOut() != null && clockOutDate.equals(clockInDate) && !r.clockOut().isAfter(r.clockIn())) {
   throw new BadRequestException("Out time must be after in time");
  }
  if (r.clockIn() != null && isFuture(clockInDate, r.clockIn(), today, now)) throw new BadRequestException("Future in punch is not allowed");
  if (r.clockOut() != null && isFuture(clockOutDate, r.clockOut(), today, now)) throw new BadRequestException("Future out punch is not allowed");
  var e=employees.findByOrgCodeAndId(org.orgCode(),r.employeeId()).orElseThrow(()->new ResourceNotFoundException("Employee not found")); employeeAccessService.assertCanAccessEmployee(principal,e); var a=records.findByOrgCodeAndEmployeeIdAndAttendanceDate(org.orgCode(),e.getId(),attendanceDate).orElseGet(()->{var x=new AttendanceRecord();x.setOrgCode(org.orgCode());x.setEmployee(e);x.setAttendanceDate(attendanceDate);return x;}); a.setClockInDate(r.clockIn() == null ? null : clockInDate);a.setClockOutDate(r.clockOut() == null ? null : clockOutDate);a.setClockIn(r.clockIn());a.setClockOut(r.clockOut());a.setSource(r.source());var saved=records.save(a);audit.log("ATTENDANCE_SAVED","AttendanceRecord",saved.getId(),e.getEmployeeCode()+" "+attendanceDate);return response(saved);}
 @Transactional(readOnly=true) public List<AttendanceResponse> list(LocalDate from, LocalDate to){return records.findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(org.orgCode(),from,to).stream().map(this::response).toList();}
 private AttendanceSettingsResponse responseSettings(AttendanceSetting s){return new AttendanceSettingsResponse(s.getId(),s.getAttendanceMode(),s.isBiometricEnabled(),s.getBiometricName(),s.getBiometricUrl(),s.getBiometricApiKey(),s.getUpdatedAt());}
 private boolean isFuture(LocalDate date, LocalTime time, LocalDate today, LocalTime now){return date.isAfter(today) || (date.isEqual(today) && time.isAfter(now));}
 private AttendanceResponse response(AttendanceRecord a){var e=a.getEmployee();return new AttendanceResponse(a.getId(),e.getId(),e.getEmployeeCode(),e.getFirstName()+" "+e.getLastName(),a.getAttendanceDate(),a.getClockInDate(),a.getClockIn(),a.getClockOutDate(),a.getClockOut(),a.getSource());}
}
