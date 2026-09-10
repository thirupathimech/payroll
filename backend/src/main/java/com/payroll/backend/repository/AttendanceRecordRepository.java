package com.payroll.backend.repository;

import com.payroll.backend.domain.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {

    Optional<AttendanceRecord> findByOrgCodeAndEmployeeIdAndAttendanceDate(
            String orgCode,
            Long employeeId,
            LocalDate date
    );

    List<AttendanceRecord> findByOrgCodeAndAttendanceDateBetweenOrderByAttendanceDateDesc(
            String orgCode,
            LocalDate from,
            LocalDate to
    );

    Optional<AttendanceRecord> findFirstByOrgCodeAndEmployeeIdAndClockInIsNotNullAndClockOutIsNullAndAttendanceDateBetweenOrderByAttendanceDateDesc(
            String orgCode,
            Long employeeId,
            LocalDate fromDate,
            LocalDate toDate
    );

    @Query("""
            select count(a)
            from AttendanceRecord a
            join a.employee e
            where a.orgCode = :orgCode
              and a.attendanceDate = :date
              and a.clockIn is not null
              and e.status not in (
                com.payroll.backend.domain.enums.EmploymentStatus.TERMINATED,
                com.payroll.backend.domain.enums.EmploymentStatus.RESIGNED
              )
              and (:branchId is null or e.branch.id = :branchId)
              and (:restrict = false or e.id in :employeeIds)
            """)
    long countPresent(
            @Param("orgCode") String orgCode,
            @Param("date") LocalDate date,
            @Param("branchId") Long branchId,
            @Param("employeeIds") List<Long> employeeIds,
            @Param("restrict") boolean restrict
    );
}
