package com.payroll.backend.config;

import com.payroll.backend.domain.AppUser;
import com.payroll.backend.domain.CompanySetting;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.LeaveRequest;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.LeaveStatus;
import com.payroll.backend.domain.enums.LeaveType;
import com.payroll.backend.domain.enums.RoleName;
import com.payroll.backend.repository.AppUserRepository;
import com.payroll.backend.repository.CompanySettingRepository;
import com.payroll.backend.repository.DepartmentRepository;
import com.payroll.backend.repository.DesignationRepository;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final AppUserRepository appUserRepository;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CompanySettingRepository companySettingRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Bean
    CommandLineRunner seedData() {
        return args -> {
            seedAdmin();
            seedCompanySettings();
            seedOrganizationData();
        };
    }

    private void seedAdmin() {
        if (appUserRepository.existsByEmail(adminEmail)) {
            return;
        }

        AppUser admin = new AppUser();
        admin.setEmail(adminEmail);
        admin.setFullName("Payroll Admin");
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setRole(RoleName.ADMIN);
        admin.setEnabled(true);
        appUserRepository.save(admin);
    }

    private void seedCompanySettings() {
        if (companySettingRepository.count() > 0) {
            return;
        }

        CompanySetting setting = new CompanySetting();
        setting.setCompanyName("Northstar Payroll");
        setting.setLegalName("Northstar Payroll Inc.");
        setting.setTaxId("TAX-2026-001");
        setting.setEmail("people@northstar.local");
        setting.setPhone("+1 555 0199");
        setting.setAddress("400 Enterprise Avenue, San Francisco, CA");
        setting.setCurrency("USD");
        setting.setTimezone("America/Los_Angeles");
        setting.setPayrollCutoffDay(25);
        companySettingRepository.save(setting);
    }

    private void seedOrganizationData() {
        if (departmentRepository.count() > 0) {
            return;
        }

        Department engineering = createDepartment("Engineering", "ENG", "Product engineering and platform operations");
        Department people = createDepartment("People Operations", "POP", "HR, payroll, and employee experience");
        Department finance = createDepartment("Finance", "FIN", "Accounting, payroll controls, and compliance");

        Designation softwareEngineer = createDesignation("Software Engineer", "SWE", engineering);
        Designation platformLead = createDesignation("Platform Lead", "PLEAD", engineering);
        Designation hrManager = createDesignation("HR Manager", "HRM", people);
        Designation payrollAnalyst = createDesignation("Payroll Analyst", "PAYA", finance);

        Employee maya = createEmployee("EMP-1001", "Maya", "Raman", "maya.raman@northstar.local", engineering, softwareEngineer, "95000.00");
        createEmployee("EMP-1002", "Arjun", "Mehta", "arjun.mehta@northstar.local", engineering, platformLead, "125000.00");
        createEmployee("EMP-1003", "Leah", "Carter", "leah.carter@northstar.local", people, hrManager, "88000.00");
        Employee noah = createEmployee("EMP-1004", "Noah", "Brooks", "noah.brooks@northstar.local", finance, payrollAnalyst, "82000.00");

        createLeave(maya, LeaveType.ANNUAL, LeaveStatus.PENDING, LocalDate.now().plusDays(8), LocalDate.now().plusDays(10));
        createLeave(noah, LeaveType.SICK, LeaveStatus.APPROVED, LocalDate.now().minusDays(2), LocalDate.now().minusDays(1));
    }

    private Department createDepartment(String name, String code, String description) {
        Department department = new Department();
        department.setName(name);
        department.setCode(code);
        department.setDescription(description);
        department.setActive(true);
        return departmentRepository.save(department);
    }

    private Designation createDesignation(String title, String code, Department department) {
        Designation designation = new Designation();
        designation.setTitle(title);
        designation.setCode(code);
        designation.setDepartment(department);
        designation.setDescription(title + " role");
        designation.setActive(true);
        return designationRepository.save(designation);
    }

    private Employee createEmployee(
            String code,
            String firstName,
            String lastName,
            String email,
            Department department,
            Designation designation,
            String salary
    ) {
        Employee employee = new Employee();
        employee.setEmployeeCode(code);
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        employee.setEmail(email);
        employee.setPhone("+1 555 01" + code.substring(code.length() - 2));
        employee.setDateOfBirth(LocalDate.of(1992, 4, 15));
        employee.setJoiningDate(LocalDate.now().minusMonths(14));
        employee.setBaseSalary(new BigDecimal(salary));
        employee.setBankAccountNumber("****" + code.substring(code.length() - 4));
        employee.setTaxIdentificationNumber("TIN-" + code.substring(code.length() - 4));
        employee.setAddress("Employee residential address");
        employee.setStatus(EmploymentStatus.ACTIVE);
        employee.setDepartment(department);
        employee.setDesignation(designation);
        return employeeRepository.save(employee);
    }

    private void createLeave(Employee employee, LeaveType leaveType, LeaveStatus status, LocalDate startDate, LocalDate endDate) {
        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(leaveType);
        leaveRequest.setStatus(status);
        leaveRequest.setStartDate(startDate);
        leaveRequest.setEndDate(endDate);
        leaveRequest.setReason("Seeded leave request for demo workflow");
        leaveRequestRepository.save(leaveRequest);
    }
}
