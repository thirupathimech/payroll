package com.payroll.backend.service;

import com.payroll.backend.domain.*; import com.payroll.backend.dto.attendance.*; import com.payroll.backend.exception.ResourceNotFoundException; import com.payroll.backend.exception.BadRequestException; import com.payroll.backend.repository.*; import lombok.RequiredArgsConstructor; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import java.time.LocalDate; import java.time.LocalTime; import java.util.*;

@Service @RequiredArgsConstructor
public class AttendanceService {
 private final AttendanceSettingRepository settings; private final AttendanceRecordRepository records; private final EmployeeRepository employees; private final CurrentOrgService org; private final AuditService audit;
 @Transactional(readOnly=true) public AttendanceSettingsResponse getSettings(){ return responseSettings(settings.findByOrgCode(org.orgCode()).orElseGet(()->{var s=new AttendanceSetting();s.setOrgCode(org.orgCode());return s;})); }
 @Transactional public AttendanceSettingsResponse updateSettings(AttendanceSettingsRequest r){var s=settings.findByOrgCode(org.orgCode()).orElseGet(()->{var x=new AttendanceSetting();x.setOrgCode(org.orgCode());return x;}); s.setAttendanceMode(r.attendanceMode());s.setBiometricEnabled(r.biometricEnabled());s.setBiometricName(r.biometricName());s.setBiometricUrl(r.biometricUrl());s.setBiometricApiKey(r.biometricApiKey()); var saved=settings.save(s); audit.log("ATTENDANCE_SETTINGS_UPDATED","AttendanceSetting",saved.getId(),saved.getAttendanceMode().name()); return responseSettings(saved);}
 @Transactional public AttendanceResponse save(AttendanceRequest r){
  LocalDate today=LocalDate.now(); LocalTime now=LocalTime.now().withSecond(0).withNano(0);
  if(r.date().isAfter(today)) throw new BadRequestException("Future attendance date is not allowed");
  if(r.date().isEqual(today) && ((r.clockIn()!=null && r.clockIn().isAfter(now)) || (r.clockOut()!=null && r.clockOut().isAfter(now)))) throw new BadRequestException("Future attendance time is not allowed");
  if(r.clockOut()!=null && r.clockIn()==null) throw new BadRequestException("Clock in is required before clock out");
  if(r.clockIn()!=null && r.clockOut()!=null && r.clockOut().isBefore(r.clockIn())) throw new BadRequestException("Clock out must be after clock in");
  var e=employees.findByOrgCodeAndId(org.orgCode(),r.employeeId()).orElseThrow(()->new ResourceNotFoundException("Employee not found")); var a=records.findByOrgCodeAndEmployeeIdAndAttendanceDate(org.orgCode(),e.getId(),r.date()).orElseGet(()->{var x=new AttendanceRecord();x.setOrgCode(org.orgCode());x.setEmployee(e);x.setAttendanceDate(r.date());return x;}); a.setClockIn(r.clockIn());a.setClockOut(r.clockOut());a.setSource(r.source());var saved=records.save(a);audit.log("ATTENDANCE_SAVED","AttendanceRecord",saved.getId(),e.getEmployeeCode()+" "+r.date());return response(saved);}
 @Transactional(readOnly=true) public List<AttendanceResponse> list(LocalDate from, LocalDate to){return records.findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(org.orgCode(),from,to).stream().map(this::response).toList();}
 private AttendanceSettingsResponse responseSettings(AttendanceSetting s){return new AttendanceSettingsResponse(s.getId(),s.getAttendanceMode(),s.isBiometricEnabled(),s.getBiometricName(),s.getBiometricUrl(),s.getBiometricApiKey(),s.getUpdatedAt());}
 private AttendanceResponse response(AttendanceRecord a){var e=a.getEmployee();return new AttendanceResponse(a.getId(),e.getId(),e.getEmployeeCode(),e.getFirstName()+" "+e.getLastName(),a.getAttendanceDate(),a.getClockIn(),a.getClockOut(),a.getSource());}
}
