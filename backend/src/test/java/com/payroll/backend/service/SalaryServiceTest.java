package com.payroll.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.Department;
import com.payroll.backend.domain.Designation;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeSalaryRevision;
import com.payroll.backend.domain.SalaryComponent;
import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.dto.salary.EmployeeSalaryComponentRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryRequest;
import com.payroll.backend.dto.salary.SalaryUpdateMode;
import com.payroll.backend.dto.salary.EmployeeSalaryResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeSalaryComponentRepository;
import com.payroll.backend.repository.EmployeeSalaryRevisionRepository;
import com.payroll.backend.repository.SalaryComponentRepository;
import com.payroll.backend.security.UserPrincipal;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;

class SalaryServiceTest {

    private static final String ORG_CODE = "ORG";
    private static final BigDecimal CTC = new BigDecimal("120000.00");

    @Test
    void acceptsCtcAllocationWhenEarningsAndEmployerContributionsTotalCtc() {
        Fixture fixture = new Fixture();

        EmployeeSalaryResponse saved = fixture.service.saveEmployeeSalary(
                fixture.employee.getId(),
                fixture.request("84.75", "12", "3.25"),
                fixture.principal
        );

        assertThat(saved.ctc()).isEqualByComparingTo(CTC);
        verify(fixture.employeeRepository).save(fixture.employee);
        verify(fixture.employeeSalaryComponentRepository).saveAll(any());
    }

    @Test
    void rejectsCtcAllocationWhenEarningsAndEmployerContributionsDoNotTotalCtc() {
        Fixture fixture = new Fixture();

        assertThatThrownBy(() -> fixture.service.saveEmployeeSalary(
                fixture.employee.getId(),
                fixture.request("84.75", "12", "2.25"),
                fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("earning and employer contribution components");

        verify(fixture.employeeRepository, never()).save(any());
        verify(fixture.employeeSalaryComponentRepository, never()).saveAll(any());
    }

    @Test
    void requiresAnEffectiveDateForAScheduledSalaryRevision() {
        Fixture fixture = new Fixture();

        assertThatThrownBy(() -> fixture.service.saveEmployeeSalary(
                fixture.employee.getId(), fixture.revisionRequest(null), fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Effective from date is required");
    }

    @Test
    void directsTodaysChangeToCurrentPackageAdjustment() {
        Fixture fixture = new Fixture();

        assertThatThrownBy(() -> fixture.service.saveEmployeeSalary(
                fixture.employee.getId(), fixture.revisionRequest(LocalDate.now()), fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Use Adjust current package");
    }

    @Test
    void adjustsTheActiveOpeningStructureWithoutCreatingAnotherRevision() {
        Fixture fixture = new Fixture();
        EmployeeSalaryRevision opening = new EmployeeSalaryRevision();
        opening.setId(99L);
        opening.setEffectiveDate(fixture.employee.getJoiningDate());
        opening.setAnnualCtc(new BigDecimal("100000.00"));
        when(fixture.employeeSalaryRevisionRepository
                .findByOrgCodeAndEmployeeIdOrderByEffectiveDateDesc(ORG_CODE, fixture.employee.getId()))
                .thenReturn(List.of(opening));

        fixture.service.saveEmployeeSalary(fixture.employee.getId(), fixture.request("84.75", "12", "3.25"), fixture.principal);

        assertThat(opening.getAnnualCtc()).isEqualByComparingTo(CTC);
        verify(fixture.employeeSalaryRevisionRepository).save(opening);
        verify(fixture.employeeSalaryRevisionRepository, never())
                .existsByOrgCodeAndEmployeeId(ORG_CODE, fixture.employee.getId());
    }

    @Test
    void doesNotCreateASalaryRevisionForAnInitialCurrentAdjustment() {
        Fixture fixture = new Fixture();

        fixture.service.saveEmployeeSalary(fixture.employee.getId(), fixture.request("84.75", "12", "3.25"), fixture.principal);

        verify(fixture.employeeSalaryRevisionRepository, never()).save(any());
        verify(fixture.employeeRepository).save(fixture.employee);
    }

    @Test
    void rejectsSalaryChangesForAPeriodWhosePayrollHasRun() {
        Fixture fixture = new Fixture();
        doThrow(new BadRequestException("Payroll has already been run for this date."))
                .when(fixture.payrollLockService).assertNoPayrollRun(LocalDate.now());

        assertThatThrownBy(() -> fixture.service.saveEmployeeSalary(
                fixture.employee.getId(), fixture.request("84.75", "12", "3.25"), fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Payroll has already been run");

        verify(fixture.employeeSalaryRevisionRepository, never()).save(any());
        verify(fixture.employeeRepository, never()).save(any());
    }

    @Test
    void rejectsNewRevisionsForAPeriodWhosePayrollHasRun() {
        Fixture fixture = new Fixture();
        LocalDate effectiveDate = LocalDate.now().plusDays(1);
        doThrow(new BadRequestException("Payroll has already been run for this date."))
                .when(fixture.payrollLockService).assertNoPayrollRun(effectiveDate);

        assertThatThrownBy(() -> fixture.service.saveEmployeeSalary(
                fixture.employee.getId(), fixture.revisionRequest(effectiveDate), fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Payroll has already been run");

        verify(fixture.employeeSalaryRevisionRepository, never()).save(any());
    }

    @Test
    void updatesAScheduledRevisionWithoutChangingTheCurrentPackage() {
        Fixture fixture = new Fixture();
        LocalDate effectiveDate = LocalDate.now().plusDays(1);
        EmployeeSalaryRevision scheduled = Fixture.scheduledRevision(42L, effectiveDate);
        when(fixture.employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdAndId(
                ORG_CODE, fixture.employee.getId(), scheduled.getId()
        )).thenReturn(Optional.of(scheduled));

        fixture.service.updateScheduledRevision(
                fixture.employee.getId(), scheduled.getId(), fixture.revisionRequest(effectiveDate), fixture.principal
        );

        assertThat(scheduled.getAnnualCtc()).isEqualByComparingTo(CTC);
        verify(fixture.employeeSalaryRevisionRepository).save(scheduled);
        verify(fixture.employeeRepository, never()).save(any());
        verify(fixture.employeeSalaryComponentRepository, never()).saveAll(any());
    }

    @Test
    void deletesAScheduledRevision() {
        Fixture fixture = new Fixture();
        EmployeeSalaryRevision scheduled = Fixture.scheduledRevision(43L, LocalDate.now().plusDays(1));
        when(fixture.employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdAndId(
                ORG_CODE, fixture.employee.getId(), scheduled.getId()
        )).thenReturn(Optional.of(scheduled));

        fixture.service.deleteScheduledRevision(fixture.employee.getId(), scheduled.getId(), fixture.principal);

        verify(fixture.employeeSalaryRevisionRepository).delete(scheduled);
    }

    @Test
    void rejectsEditingOrDeletingARevisionThatIsNoLongerScheduled() {
        Fixture fixture = new Fixture();
        EmployeeSalaryRevision current = Fixture.scheduledRevision(44L, LocalDate.now());
        when(fixture.employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdAndId(
                ORG_CODE, fixture.employee.getId(), current.getId()
        )).thenReturn(Optional.of(current));

        assertThatThrownBy(() -> fixture.service.deleteScheduledRevision(
                fixture.employee.getId(), current.getId(), fixture.principal
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only scheduled salary revisions");

        verify(fixture.employeeSalaryRevisionRepository, never()).delete(any());
    }

    @Test
    void defaultsAnAbsentEmployerContributionRowToDisabled() {
        Fixture fixture = new Fixture();

        EmployeeSalaryResponse salary = fixture.service.employeeSalary(fixture.employee.getId(), fixture.principal);

        assertThat(salary.components())
                .filteredOn(component -> component.category() == SalaryComponentCategory.EMPLOYER_CONTRIBUTION)
                .allMatch(component -> !component.enabled());
    }

    @Test
    void buildsReportRowsForActiveEmployeesFromTheSalaryCatalog() {
        Fixture fixture = new Fixture();
        when(fixture.employeeRepository.findSalaryReportEmployees(ORG_CODE, EmploymentStatus.ACTIVE))
                .thenReturn(List.of(fixture.employee));
        when(fixture.employeeSalaryComponentRepository.findSalaryReportComponents(ORG_CODE))
                .thenReturn(List.of());

        List<EmployeeSalaryResponse> report = fixture.service.salaryReport(fixture.principal);

        assertThat(report).singleElement().satisfies(row -> {
            assertThat(row.employeeCode()).isEqualTo("EMP-10");
            assertThat(row.employeeName()).isEqualTo("Ada Lovelace");
            assertThat(row.ctc()).isEqualByComparingTo(CTC);
            assertThat(row.components()).hasSize(4);
        });
    }

    private static final class Fixture {

        private final SalaryComponentRepository salaryComponentRepository = mock(SalaryComponentRepository.class);
        private final EmployeeSalaryComponentRepository employeeSalaryComponentRepository = mock(EmployeeSalaryComponentRepository.class);
        private final EmployeeSalaryRevisionRepository employeeSalaryRevisionRepository = mock(EmployeeSalaryRevisionRepository.class);
        private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
        private final CurrentOrgService currentOrgService = mock(CurrentOrgService.class);
        private final EmployeeAccessService employeeAccessService = mock(EmployeeAccessService.class);
        private final PayrollLockService payrollLockService = mock(PayrollLockService.class);
        private final AuditService auditService = mock(AuditService.class);
        private final SalaryService service = new SalaryService(
                salaryComponentRepository,
                employeeSalaryComponentRepository,
                employeeSalaryRevisionRepository,
                employeeRepository,
                currentOrgService,
                employeeAccessService,
                payrollLockService,
                auditService,
                new ObjectMapper()
        );
        private final Employee employee = employee();
        private final UserPrincipal principal = new UserPrincipal(
                1L, ORG_CODE, "hr", "hr@example.test", "HR User", null, "", List.of(), true
        );
        private final SalaryComponent earning = component(1L, "Basic Salary", "BASIC", SalaryComponentCategory.EARNING);
        private final SalaryComponent employerPf = component(
                2L, "Employer Provident Fund", "EMPLOYER_PF", SalaryComponentCategory.EMPLOYER_CONTRIBUTION
        );
        private final SalaryComponent employerEsi = component(
                3L, "Employer State Insurance", "EMPLOYER_ESI", SalaryComponentCategory.EMPLOYER_CONTRIBUTION
        );
        private final SalaryComponent deduction = component(4L, "Provident Fund", "PF", SalaryComponentCategory.DEDUCTION);
        private final Map<Long, SalaryComponent> componentsById = Map.of(
                earning.getId(), earning,
                employerPf.getId(), employerPf,
                employerEsi.getId(), employerEsi,
                deduction.getId(), deduction
        );

        private Fixture() {
            List<SalaryComponent> catalog = List.of(earning, employerPf, employerEsi, deduction);
            when(currentOrgService.orgCode()).thenReturn(ORG_CODE);
            when(employeeRepository.findByOrgCodeAndId(ORG_CODE, employee.getId())).thenReturn(Optional.of(employee));
            when(salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(ORG_CODE)).thenReturn(catalog);
            when(salaryComponentRepository.existsByOrgCodeAndCodeIgnoreCase(eq(ORG_CODE), anyString())).thenReturn(true);
            when(salaryComponentRepository.findByOrgCodeAndId(eq(ORG_CODE), anyLong()))
                    .thenAnswer(invocation -> Optional.ofNullable(componentsById.get(invocation.getArgument(1))));
            when(employeeSalaryComponentRepository.findByOrgCodeAndEmployeeId(ORG_CODE, employee.getId())).thenReturn(List.of());
            when(employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdOrderByEffectiveDateDesc(ORG_CODE, employee.getId()))
                    .thenReturn(List.of());
            when(employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdAndEffectiveDate(eq(ORG_CODE), eq(employee.getId()), any()))
                    .thenReturn(Optional.empty());
            when(employeeSalaryRevisionRepository.findEffectiveRevisions(eq(ORG_CODE), any(), any()))
                    .thenReturn(List.of());
        }

        private EmployeeSalaryRequest request(String earningPercentage, String employerPfPercentage, String employerEsiPercentage) {
            return new EmployeeSalaryRequest(CTC, List.of(
                new EmployeeSalaryComponentRequest(earning.getId(), SalaryValueType.PERCENTAGE, new BigDecimal(earningPercentage), true),
                new EmployeeSalaryComponentRequest(employerPf.getId(), SalaryValueType.PERCENTAGE, new BigDecimal(employerPfPercentage), true),
                new EmployeeSalaryComponentRequest(employerEsi.getId(), SalaryValueType.PERCENTAGE, new BigDecimal(employerEsiPercentage), true),
                new EmployeeSalaryComponentRequest(deduction.getId(), SalaryValueType.PERCENTAGE, new BigDecimal("5"), true)
            ), SalaryUpdateMode.ADJUST_CURRENT, null, null);
        }

        private EmployeeSalaryRequest revisionRequest(LocalDate effectiveDate) {
            EmployeeSalaryRequest currentAdjustment = request("84.75", "12", "3.25");
            return new EmployeeSalaryRequest(currentAdjustment.ctc(), currentAdjustment.components(),
                    SalaryUpdateMode.CREATE_REVISION, effectiveDate, null);
        }

        private static EmployeeSalaryRevision scheduledRevision(Long id, LocalDate effectiveDate) {
            EmployeeSalaryRevision revision = new EmployeeSalaryRevision();
            revision.setId(id);
            revision.setEffectiveDate(effectiveDate);
            revision.setAnnualCtc(new BigDecimal("100000.00"));
            revision.setComponentsJson("[]");
            return revision;
        }

        private static Employee employee() {
            Department department = new Department();
            department.setName("Engineering");
            Designation designation = new Designation();
            designation.setTitle("Developer");

            Employee employee = new Employee();
            employee.setId(10L);
            employee.setEmployeeCode("EMP-10");
            employee.setFirstName("Ada");
            employee.setLastName("Lovelace");
            employee.setBaseSalary(CTC);
            employee.setJoiningDate(LocalDate.of(2020, 1, 1));
            employee.setDepartment(department);
            employee.setDesignation(designation);
            return employee;
        }

        private static SalaryComponent component(Long id, String name, String code, SalaryComponentCategory category) {
            SalaryComponent component = new SalaryComponent();
            component.setId(id);
            component.setName(name);
            component.setCode(code);
            component.setCategory(category);
            component.setValueType(SalaryValueType.PERCENTAGE);
            component.setDefaultValue(BigDecimal.ZERO);
            component.setEnabled(true);
            return component;
        }
    }
}
