package com.payroll.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeSalaryComponent;
import com.payroll.backend.domain.EmployeeSalaryRevision;
import com.payroll.backend.domain.SalaryComponent;
import com.payroll.backend.domain.enums.EmploymentStatus;
import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;
import com.payroll.backend.dto.salary.EmployeeSalaryComponentRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryComponentResponse;
import com.payroll.backend.dto.salary.EmployeeSalaryRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryResponse;
import com.payroll.backend.dto.salary.EmployeeSalaryRevisionResponse;
import com.payroll.backend.dto.salary.SalaryComponentRequest;
import com.payroll.backend.dto.salary.SalaryComponentResponse;
import com.payroll.backend.dto.salary.SalaryRevisionComponentSnapshot;
import com.payroll.backend.dto.salary.SalaryUpdateMode;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeSalaryComponentRepository;
import com.payroll.backend.repository.EmployeeSalaryRevisionRepository;
import com.payroll.backend.repository.SalaryComponentRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalaryService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final TypeReference<List<SalaryRevisionComponentSnapshot>> REVISION_COMPONENTS = new TypeReference<>() { };

    private final SalaryComponentRepository salaryComponentRepository;
    private final EmployeeSalaryComponentRepository employeeSalaryComponentRepository;
    private final EmployeeSalaryRevisionRepository employeeSalaryRevisionRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final PayrollLockService payrollLockService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public List<SalaryComponentResponse> components() {
        ensureDefaultComponents();
        return salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(currentOrgService.orgCode())
                .stream().map(this::toComponentResponse).toList();
    }

    @Transactional
    public SalaryComponentResponse createComponent(SalaryComponentRequest request) {
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();
        String code = normalizeCode(request.code());
        if (salaryComponentRepository.existsByOrgCodeAndCodeIgnoreCase(orgCode, code)) {
            throw new BadRequestException("Salary component code already exists");
        }
        validateValue(request.valueType(), request.defaultValue());
        SalaryComponent component = new SalaryComponent();
        component.setOrgCode(orgCode);
        applyComponent(request, component, code);
        SalaryComponent saved = salaryComponentRepository.save(component);
        auditService.log("SALARY_COMPONENT_CREATED", "SalaryComponent", saved.getId(), saved.getCode());
        return toComponentResponse(saved);
    }

    @Transactional
    public SalaryComponentResponse updateComponent(Long id, SalaryComponentRequest request) {
        String orgCode = currentOrgService.orgCode();
        SalaryComponent component = salaryComponentRepository.findByOrgCodeAndId(orgCode, id)
                .orElseThrow(() -> new ResourceNotFoundException("Salary component not found"));
        String code = normalizeCode(request.code());
        if (salaryComponentRepository.existsByOrgCodeAndCodeIgnoreCaseAndIdNot(orgCode, code, id)) {
            throw new BadRequestException("Salary component code already exists");
        }
        validateValue(request.valueType(), request.defaultValue());
        applyComponent(request, component, code);
        SalaryComponent saved = salaryComponentRepository.save(component);
        auditService.log("SALARY_COMPONENT_UPDATED", "SalaryComponent", saved.getId(), saved.getCode());
        return toComponentResponse(saved);
    }

    @Transactional
    public EmployeeSalaryResponse employeeSalary(Long employeeId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId, principal);
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();
        List<SalaryComponent> catalog = salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode);
        Map<Long, EmployeeSalaryComponent> configured = configuredForEmployee(orgCode, employeeId);
        List<EmployeeSalaryRevision> revisions = employeeSalaryRevisionRepository
                .findByOrgCodeAndEmployeeIdOrderByEffectiveDateDesc(orgCode, employeeId);
        EmployeeSalaryRevision active = revisions.stream()
                .filter(revision -> !revision.getEffectiveDate().isAfter(LocalDate.now()))
                .findFirst().orElse(null);
        return toEmployeeSalaryResponse(employee, catalog, configured, active, revisions);
    }

    @Transactional
    public List<EmployeeSalaryResponse> salaryReport(UserPrincipal principal) {
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();
        List<SalaryComponent> catalog = salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode);
        Map<Long, Map<Long, EmployeeSalaryComponent>> configuredByEmployee = employeeSalaryComponentRepository
                .findSalaryReportComponents(orgCode).stream().collect(Collectors.groupingBy(
                        item -> item.getEmployee().getId(),
                        Collectors.toMap(item -> item.getComponent().getId(), item -> item, (left, right) -> left)
                ));
        List<Employee> employees = employeeRepository.findSalaryReportEmployees(orgCode, EmploymentStatus.ACTIVE);
        Map<Long, EmployeeSalaryRevision> activeRevisions = effectiveRevisions(
                orgCode, employees.stream().map(Employee::getId).toList(), LocalDate.now());

        return employees.stream()
                .map(employee -> toEmployeeSalaryResponse(employee, catalog,
                        configuredByEmployee.getOrDefault(employee.getId(), Map.of()),
                        activeRevisions.get(employee.getId()), List.of()))
                .toList();
    }

    /**
     * Adjustments edit the active salary structure. A new immutable history row
     * is created only when the caller explicitly chooses CREATE_REVISION.
     */
    @Transactional
    public EmployeeSalaryResponse saveEmployeeSalary(Long employeeId, EmployeeSalaryRequest request, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId, principal);
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();
        LocalDate today = LocalDate.now();
        SalaryUpdateMode updateMode = request.updateMode() == null
                ? (request.effectiveDate() == null ? SalaryUpdateMode.ADJUST_CURRENT : SalaryUpdateMode.CREATE_REVISION)
                : request.updateMode();
        LocalDate effectiveDate;
        if (updateMode == SalaryUpdateMode.ADJUST_CURRENT) {
            effectiveDate = today;
        } else {
            if (request.effectiveDate() == null) {
                throw new BadRequestException("Effective from date is required when creating a salary revision");
            }
            effectiveDate = request.effectiveDate();
        }
        if (effectiveDate.isBefore(employee.getJoiningDate())) {
            throw new BadRequestException("Salary revision cannot be effective before the employee joining date");
        }
        if (effectiveDate.isBefore(today)) {
            throw new BadRequestException("Backdated salary revisions are not allowed because prior payroll may already be approved or locked");
        }
        if (updateMode == SalaryUpdateMode.CREATE_REVISION && !effectiveDate.isAfter(today)) {
            throw new BadRequestException("A salary revision must start on a future date. Use Adjust current package for a change effective today");
        }
        payrollLockService.assertNoPayrollRun(effectiveDate);

        EmployeeSalaryRevision currentRevision = updateMode == SalaryUpdateMode.ADJUST_CURRENT
                ? employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdOrderByEffectiveDateDesc(orgCode, employeeId)
                        .stream()
                        .filter(revision -> !revision.getEffectiveDate().isAfter(today))
                        .findFirst()
                        .orElse(null)
                : null;
        if (updateMode == SalaryUpdateMode.CREATE_REVISION
                && employeeSalaryRevisionRepository.existsByOrgCodeAndEmployeeIdAndEffectiveDate(orgCode, employeeId, effectiveDate)) {
            throw new BadRequestException("A salary revision is already scheduled for this effective date");
        }

        List<SalaryComponent> catalog = salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode);
        Map<Long, EmployeeSalaryComponent> configured = configuredForEmployee(orgCode, employeeId);
        List<EmployeeSalaryComponent> rows = salaryRows(employee, orgCode, request);

        EmployeeSalaryRevision affectedRevision = currentRevision;
        if (updateMode == SalaryUpdateMode.CREATE_REVISION) {
            createBaselineIfNeeded(employee, catalog, configured, effectiveDate, principal);
            EmployeeSalaryRevision revision = new EmployeeSalaryRevision();
            revision.setOrgCode(orgCode);
            revision.setEmployee(employee);
            revision.setEffectiveDate(effectiveDate);
            revision.setCreatedBy(principal.email());
            revision.setAnnualCtc(request.ctc());
            revision.setReason(normalizeReason(request.reason()));
            revision.setComponentsJson(writeRevisionComponents(snapshotRows(rows)));
            employeeSalaryRevisionRepository.save(revision);
            affectedRevision = revision;
        } else if (currentRevision != null) {
            // This can be the migrated/opening structure. Editing it keeps an
            // immediate correction out of the revision history.
            currentRevision.setAnnualCtc(request.ctc());
            currentRevision.setReason(normalizeReason(request.reason()));
            currentRevision.setComponentsJson(writeRevisionComponents(snapshotRows(rows)));
            employeeSalaryRevisionRepository.save(currentRevision);
        }

        // Current-state fields remain the source of truth until an explicitly
        // created future revision becomes effective.
        if (updateMode == SalaryUpdateMode.ADJUST_CURRENT) {
            employee.setBaseSalary(request.ctc());
            employeeRepository.save(employee);
            employeeSalaryComponentRepository.deleteByOrgCodeAndEmployeeId(orgCode, employeeId);
            employeeSalaryComponentRepository.flush();
            employeeSalaryComponentRepository.saveAll(rows);
        }

        String auditAction = updateMode == SalaryUpdateMode.ADJUST_CURRENT
                ? "EMPLOYEE_SALARY_CURRENT_ADJUSTED" : "EMPLOYEE_SALARY_REVISION_CREATED";
        String auditEntity = affectedRevision == null ? "Employee" : "EmployeeSalaryRevision";
        Long auditId = affectedRevision == null ? employee.getId() : affectedRevision.getId();
        auditService.log(auditAction, auditEntity, auditId,
                employee.getEmployeeCode() + " effective " + effectiveDate + "; CTC " + request.ctc().toPlainString());
        return employeeSalary(employeeId, principal);
    }

    @Transactional
    public EmployeeSalaryResponse updateScheduledRevision(Long employeeId, Long revisionId,
                                                           EmployeeSalaryRequest request, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId, principal);
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();
        LocalDate today = LocalDate.now();
        EmployeeSalaryRevision revision = findScheduledRevision(orgCode, employeeId, revisionId, today);
        LocalDate effectiveDate = requiredFutureRevisionDate(request, employee, today);
        if (!revision.getEffectiveDate().equals(effectiveDate)
                && employeeSalaryRevisionRepository.existsByOrgCodeAndEmployeeIdAndEffectiveDate(orgCode, employeeId, effectiveDate)) {
            throw new BadRequestException("A salary revision is already scheduled for this effective date");
        }
        payrollLockService.assertNoPayrollRun(effectiveDate);
        List<EmployeeSalaryComponent> rows = salaryRows(employee, orgCode, request);

        revision.setEffectiveDate(effectiveDate);
        revision.setAnnualCtc(request.ctc());
        revision.setReason(normalizeReason(request.reason()));
        revision.setComponentsJson(writeRevisionComponents(snapshotRows(rows)));
        employeeSalaryRevisionRepository.save(revision);
        auditService.log("EMPLOYEE_SALARY_REVISION_UPDATED", "EmployeeSalaryRevision", revision.getId(),
                employee.getEmployeeCode() + " effective " + effectiveDate + "; CTC " + request.ctc().toPlainString());
        return employeeSalary(employeeId, principal);
    }

    @Transactional
    public EmployeeSalaryResponse deleteScheduledRevision(Long employeeId, Long revisionId, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId, principal);
        String orgCode = currentOrgService.orgCode();
        EmployeeSalaryRevision revision = findScheduledRevision(orgCode, employeeId, revisionId, LocalDate.now());
        payrollLockService.assertNoPayrollRun(revision.getEffectiveDate());
        employeeSalaryRevisionRepository.delete(revision);
        auditService.log("EMPLOYEE_SALARY_REVISION_DELETED", "EmployeeSalaryRevision", revision.getId(),
                employee.getEmployeeCode() + " effective " + revision.getEffectiveDate());
        return employeeSalary(employeeId, principal);
    }

    /** Payroll applies the latest salary snapshot effective at its period start. */
    @Transactional(readOnly = true)
    public Map<Long, PayrollSalarySnapshot> payrollSalarySnapshots(Collection<Long> employeeIds, LocalDate asOfDate) {
        String orgCode = currentOrgService.orgCode();
        return effectiveRevisions(orgCode, employeeIds, asOfDate).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey,
                        entry -> new PayrollSalarySnapshot(entry.getValue().getAnnualCtc(), readRevisionComponents(entry.getValue())),
                        (left, right) -> left, LinkedHashMap::new));
    }

    public record PayrollSalarySnapshot(BigDecimal ctc, List<SalaryRevisionComponentSnapshot> components) { }

    private Map<Long, EmployeeSalaryRevision> effectiveRevisions(String orgCode, Collection<Long> employeeIds, LocalDate asOfDate) {
        if (employeeIds == null || employeeIds.isEmpty()) return Map.of();
        Map<Long, EmployeeSalaryRevision> result = new LinkedHashMap<>();
        for (EmployeeSalaryRevision revision : employeeSalaryRevisionRepository.findEffectiveRevisions(orgCode, employeeIds, asOfDate)) {
            result.putIfAbsent(revision.getEmployee().getId(), revision);
        }
        return result;
    }

    private void createBaselineIfNeeded(Employee employee, List<SalaryComponent> catalog,
                                         Map<Long, EmployeeSalaryComponent> configured,
                                         LocalDate requestedEffectiveDate, UserPrincipal principal) {
        String orgCode = currentOrgService.orgCode();
        if (employeeSalaryRevisionRepository.existsByOrgCodeAndEmployeeId(orgCode, employee.getId())
                || !employee.getJoiningDate().isBefore(requestedEffectiveDate)) return;
        EmployeeSalaryRevision baseline = new EmployeeSalaryRevision();
        baseline.setOrgCode(orgCode);
        baseline.setEmployee(employee);
        baseline.setEffectiveDate(employee.getJoiningDate());
        baseline.setAnnualCtc(employee.getBaseSalary());
        baseline.setReason("Opening salary structure (preserved from existing record)");
        baseline.setCreatedBy(principal.email());
        baseline.setComponentsJson(writeRevisionComponents(snapshotRows(rowsFromCatalog(catalog, configured))));
        employeeSalaryRevisionRepository.save(baseline);
        auditService.log("EMPLOYEE_SALARY_HISTORY_INITIALIZED", "EmployeeSalaryRevision", baseline.getId(), employee.getEmployeeCode());
    }

    private Map<Long, EmployeeSalaryComponent> configuredForEmployee(String orgCode, Long employeeId) {
        Map<Long, EmployeeSalaryComponent> configured = new HashMap<>();
        employeeSalaryComponentRepository.findByOrgCodeAndEmployeeId(orgCode, employeeId)
                .forEach(item -> configured.put(item.getComponent().getId(), item));
        return configured;
    }

    private EmployeeSalaryRevision findScheduledRevision(String orgCode, Long employeeId, Long revisionId, LocalDate today) {
        EmployeeSalaryRevision revision = employeeSalaryRevisionRepository.findByOrgCodeAndEmployeeIdAndId(orgCode, employeeId, revisionId)
                .orElseThrow(() -> new ResourceNotFoundException("Salary revision not found"));
        if (!revision.getEffectiveDate().isAfter(today)) {
            throw new BadRequestException("Only scheduled salary revisions can be changed or deleted");
        }
        return revision;
    }

    private LocalDate requiredFutureRevisionDate(EmployeeSalaryRequest request, Employee employee, LocalDate today) {
        if (request.effectiveDate() == null) {
            throw new BadRequestException("Effective from date is required when editing a salary revision");
        }
        LocalDate effectiveDate = request.effectiveDate();
        if (effectiveDate.isBefore(employee.getJoiningDate())) {
            throw new BadRequestException("Salary revision cannot be effective before the employee joining date");
        }
        if (!effectiveDate.isAfter(today)) {
            throw new BadRequestException("A salary revision must start on a future date");
        }
        return effectiveDate;
    }

    private List<EmployeeSalaryComponent> salaryRows(Employee employee, String orgCode, EmployeeSalaryRequest request) {
        List<EmployeeSalaryComponentRequest> requests = request.components() == null ? List.of() : request.components();
        Set<Long> ids = new HashSet<>();
        List<EmployeeSalaryComponent> rows = requests.stream().map(item -> {
            if (!ids.add(item.componentId())) throw new BadRequestException("Duplicate salary component selected");
            SalaryComponent component = salaryComponentRepository.findByOrgCodeAndId(orgCode, item.componentId())
                    .orElseThrow(() -> new BadRequestException("Salary component not found"));
            validateValue(item.valueType(), item.value());
            EmployeeSalaryComponent salary = new EmployeeSalaryComponent();
            salary.setOrgCode(orgCode);
            salary.setEmployee(employee);
            salary.setComponent(component);
            salary.setValueType(item.valueType());
            salary.setValue(item.value());
            salary.setEnabled(item.enabled() && component.isEnabled());
            return salary;
        }).toList();
        validateCompleteComponentSet(ids, orgCode);
        validateCtcAllocation(rows, request.ctc());
        return rows;
    }

    private Employee findEmployee(Long employeeId, UserPrincipal principal) {
        Employee employee = employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employee;
    }

    @Transactional
    public void ensureDefaultComponents() {
        String orgCode = currentOrgService.orgCode();
        if (!salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode).isEmpty()) {
            ensureEmployerContributionDefaults(orgCode);
            return;
        }
        createDefault(orgCode, "Basic Salary", "BASIC", SalaryComponentCategory.EARNING, SalaryValueType.PERCENTAGE, BigDecimal.valueOf(50));
        createDefault(orgCode, "House Rent Allowance", "HRA", SalaryComponentCategory.EARNING, SalaryValueType.PERCENTAGE, BigDecimal.valueOf(20));
        createDefault(orgCode, "Special Allowance", "SPECIAL_ALLOWANCE", SalaryComponentCategory.EARNING, SalaryValueType.PERCENTAGE, BigDecimal.valueOf(30));
        createDefault(orgCode, "Provident Fund", "PF", SalaryComponentCategory.DEDUCTION, SalaryValueType.PERCENTAGE, BigDecimal.valueOf(12));
        createDefault(orgCode, "Employee State Insurance", "ESI", SalaryComponentCategory.DEDUCTION, SalaryValueType.PERCENTAGE, BigDecimal.valueOf(0.75));
        createDefault(orgCode, "Professional Tax", "PT", SalaryComponentCategory.DEDUCTION, SalaryValueType.FIXED, BigDecimal.ZERO);
        ensureEmployerContributionDefaults(orgCode);
    }

    private void ensureEmployerContributionDefaults(String orgCode) {
        createDefaultIfMissing(orgCode, "Employer Provident Fund", "EMPLOYER_PF", SalaryComponentCategory.EMPLOYER_CONTRIBUTION, SalaryValueType.PERCENTAGE, BigDecimal.ZERO, true);
        createDefaultIfMissing(orgCode, "Employer State Insurance", "EMPLOYER_ESI", SalaryComponentCategory.EMPLOYER_CONTRIBUTION, SalaryValueType.PERCENTAGE, BigDecimal.ZERO, true);
    }

    private void createDefault(String orgCode, String name, String code, SalaryComponentCategory category, SalaryValueType valueType, BigDecimal value) {
        createDefaultIfMissing(orgCode, name, code, category, valueType, value, true);
    }

    private void createDefaultIfMissing(String orgCode, String name, String code, SalaryComponentCategory category,
                                        SalaryValueType valueType, BigDecimal value, boolean enabled) {
        if (salaryComponentRepository.existsByOrgCodeAndCodeIgnoreCase(orgCode, code)) return;
        SalaryComponent component = new SalaryComponent();
        component.setOrgCode(orgCode);
        component.setName(name);
        component.setCode(code);
        component.setCategory(category);
        component.setValueType(valueType);
        component.setDefaultValue(value);
        component.setEnabled(enabled);
        salaryComponentRepository.save(component);
    }

    private void applyComponent(SalaryComponentRequest request, SalaryComponent component, String code) {
        component.setName(request.name().trim());
        component.setCode(code);
        component.setCategory(request.category());
        component.setValueType(request.valueType());
        component.setDefaultValue(request.defaultValue());
        component.setEnabled(request.enabled());
    }

    private void validateValue(SalaryValueType type, BigDecimal value) {
        if (value == null || value.signum() < 0) throw new BadRequestException("Salary value cannot be negative");
        if (type == SalaryValueType.PERCENTAGE && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Percentage value must be between 0 and 100");
        }
    }

    private void validateCtcAllocation(List<EmployeeSalaryComponent> rows, BigDecimal ctc) {
        BigDecimal allocatedCtc = rows.stream().filter(item -> item.isEnabled() && contributesToCtc(item.getComponent().getCategory()))
                .map(item -> annualAmountFor(item, ctc)).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (allocatedCtc.compareTo(ctc) != 0) {
            throw new BadRequestException("Enabled earning and employer contribution components must total exactly 100% of annual CTC. Allocated "
                    + allocatedCtc.toPlainString() + " of " + ctc.toPlainString() + ".");
        }
    }

    private boolean contributesToCtc(SalaryComponentCategory category) {
        return category == SalaryComponentCategory.EARNING || category == SalaryComponentCategory.EMPLOYER_CONTRIBUTION;
    }

    private boolean defaultEmployeeComponentEnabled(SalaryComponent component) {
        return component.isEnabled() && component.getCategory() != SalaryComponentCategory.EMPLOYER_CONTRIBUTION;
    }

    private BigDecimal annualAmountFor(EmployeeSalaryComponent item, BigDecimal annualCtc) {
        return item.getValueType() == SalaryValueType.PERCENTAGE
                ? annualCtc.multiply(item.getValue()).divide(HUNDRED) : item.getValue();
    }

    private void validateCompleteComponentSet(Set<Long> submittedComponentIds, String orgCode) {
        Set<Long> catalogComponentIds = new HashSet<>();
        salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode).forEach(component -> catalogComponentIds.add(component.getId()));
        if (!submittedComponentIds.equals(catalogComponentIds)) {
            throw new BadRequestException("Submit every salary component, including disabled rows, before saving.");
        }
    }

    private String normalizeCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (normalized.isBlank()) throw new BadRequestException("Salary component code is required");
        return normalized;
    }

    private String normalizeReason(String reason) {
        return reason == null || reason.isBlank() ? null : reason.trim();
    }

    private SalaryComponentResponse toComponentResponse(SalaryComponent component) {
        return new SalaryComponentResponse(component.getId(), component.getName(), component.getCode(), component.getCategory(),
                component.getValueType(), component.getDefaultValue(), component.isEnabled(), component.getCreatedAt(), component.getUpdatedAt());
    }

    private EmployeeSalaryResponse toEmployeeSalaryResponse(Employee employee, List<SalaryComponent> catalog,
                                                             Map<Long, EmployeeSalaryComponent> configured,
                                                             EmployeeSalaryRevision activeRevision,
                                                             List<EmployeeSalaryRevision> revisions) {
        List<EmployeeSalaryComponentResponse> rows = activeRevision == null
                ? toComponentResponsesFromEntities(rowsFromCatalog(catalog, configured))
                : toComponentResponses(readRevisionComponents(activeRevision));
        List<EmployeeSalaryRevisionResponse> history = revisions.stream().map(this::toRevisionResponse).toList();
        BigDecimal ctc = activeRevision == null ? employee.getBaseSalary() : activeRevision.getAnnualCtc();
        return new EmployeeSalaryResponse(employee.getId(), employee.getEmployeeCode(), fullName(employee),
                employee.getBranch() == null ? null : employee.getBranch().getName(), employee.getDepartment().getName(),
                employee.getDesignation().getTitle(), ctc, rows,
                activeRevision == null ? null : activeRevision.getEffectiveDate(), history);
    }

    private List<EmployeeSalaryComponent> rowsFromCatalog(List<SalaryComponent> catalog, Map<Long, EmployeeSalaryComponent> configured) {
        return catalog.stream().map(component -> {
            EmployeeSalaryComponent item = configured.get(component.getId());
            if (item != null) return item;
            EmployeeSalaryComponent fallback = new EmployeeSalaryComponent();
            fallback.setComponent(component);
            fallback.setValueType(component.getValueType());
            fallback.setValue(component.getDefaultValue());
            fallback.setEnabled(defaultEmployeeComponentEnabled(component));
            return fallback;
        }).toList();
    }

    private List<SalaryRevisionComponentSnapshot> snapshotRows(List<EmployeeSalaryComponent> rows) {
        return rows.stream().map(item -> {
            SalaryComponent component = item.getComponent();
            return new SalaryRevisionComponentSnapshot(component.getId(), component.getName(), component.getCode(),
                    component.getCategory(), item.getValueType(), item.getValue(), item.isEnabled());
        }).toList();
    }

    private List<EmployeeSalaryComponentResponse> toComponentResponsesFromEntities(List<EmployeeSalaryComponent> rows) {
        return rows.stream().map(this::toEmployeeComponentResponse).toList();
    }

    private List<EmployeeSalaryComponentResponse> toComponentResponses(List<SalaryRevisionComponentSnapshot> rows) {
        return rows.stream().map(item -> new EmployeeSalaryComponentResponse(null, item.componentId(), item.name(), item.code(),
                item.category(), item.valueType(), item.value(), item.enabled())).toList();
    }

    private EmployeeSalaryComponentResponse toEmployeeComponentResponse(EmployeeSalaryComponent item) {
        SalaryComponent component = item.getComponent();
        return new EmployeeSalaryComponentResponse(item.getId(), component.getId(), component.getName(), component.getCode(),
                component.getCategory(), item.getValueType(), item.getValue(), item.isEnabled() && component.isEnabled());
    }

    private EmployeeSalaryRevisionResponse toRevisionResponse(EmployeeSalaryRevision revision) {
        return new EmployeeSalaryRevisionResponse(revision.getId(), revision.getEffectiveDate(), revision.getAnnualCtc(),
                revision.getReason(), revision.getCreatedBy(), revision.getCreatedAt(), toComponentResponses(readRevisionComponents(revision)));
    }

    private String writeRevisionComponents(List<SalaryRevisionComponentSnapshot> components) {
        try {
            return objectMapper.writeValueAsString(components);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not store the salary revision component snapshot", exception);
        }
    }

    private List<SalaryRevisionComponentSnapshot> readRevisionComponents(EmployeeSalaryRevision revision) {
        try {
            return objectMapper.readValue(revision.getComponentsJson(), REVISION_COMPONENTS);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Salary revision " + revision.getId() + " has an invalid component snapshot", exception);
        }
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank()).reduce((left, right) -> left + " " + right)
                .orElse(employee.getEmployeeCode());
    }
}
