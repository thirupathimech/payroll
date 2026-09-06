package com.payroll.backend.service;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeSalaryComponent;
import com.payroll.backend.domain.SalaryComponent;
import com.payroll.backend.domain.enums.SalaryComponentCategory;
import com.payroll.backend.domain.enums.SalaryValueType;
import com.payroll.backend.dto.salary.EmployeeSalaryComponentRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryComponentResponse;
import com.payroll.backend.dto.salary.EmployeeSalaryRequest;
import com.payroll.backend.dto.salary.EmployeeSalaryResponse;
import com.payroll.backend.dto.salary.SalaryComponentRequest;
import com.payroll.backend.dto.salary.SalaryComponentResponse;
import com.payroll.backend.exception.BadRequestException;
import com.payroll.backend.exception.ResourceNotFoundException;
import com.payroll.backend.repository.EmployeeRepository;
import com.payroll.backend.repository.EmployeeSalaryComponentRepository;
import com.payroll.backend.repository.SalaryComponentRepository;
import com.payroll.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalaryService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SalaryComponentRepository salaryComponentRepository;
    private final EmployeeSalaryComponentRepository employeeSalaryComponentRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentOrgService currentOrgService;
    private final EmployeeAccessService employeeAccessService;
    private final AuditService auditService;

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
        Map<Long, EmployeeSalaryComponent> configured = new HashMap<>();
        employeeSalaryComponentRepository.findByOrgCodeAndEmployeeId(orgCode, employeeId)
                .forEach(item -> configured.put(item.getComponent().getId(), item));
        List<EmployeeSalaryComponentResponse> rows = salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode)
                .stream().map(component -> {
                    EmployeeSalaryComponent item = configured.get(component.getId());
                    return item == null
                            ? new EmployeeSalaryComponentResponse(null, component.getId(), component.getName(), component.getCode(), component.getCategory(), component.getValueType(), component.getDefaultValue(), defaultEmployeeComponentEnabled(component))
                            : toEmployeeComponentResponse(item);
                }).toList();
        return new EmployeeSalaryResponse(employee.getId(), employee.getEmployeeCode(), fullName(employee),
                employee.getBranch() == null ? null : employee.getBranch().getName(),
                employee.getDepartment().getName(), employee.getDesignation().getTitle(), employee.getBaseSalary(), rows);
    }

    @Transactional
    public EmployeeSalaryResponse saveEmployeeSalary(Long employeeId, EmployeeSalaryRequest request, UserPrincipal principal) {
        Employee employee = findEmployee(employeeId, principal);
        String orgCode = currentOrgService.orgCode();
        ensureDefaultComponents();

        List<EmployeeSalaryComponentRequest> requests = request.components() == null ? List.of() : request.components();
        Set<Long> ids = new HashSet<>();
        List<EmployeeSalaryComponent> rows = requests.stream().map(item -> {
            if (!ids.add(item.componentId())) {
                throw new BadRequestException("Duplicate salary component selected");
            }
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

        employee.setBaseSalary(request.ctc());
        employeeRepository.save(employee);
        employeeSalaryComponentRepository.deleteByOrgCodeAndEmployeeId(orgCode, employeeId);
        employeeSalaryComponentRepository.flush();
        employeeSalaryComponentRepository.saveAll(rows);
        auditService.log("EMPLOYEE_SALARY_UPDATED", "Employee", employee.getId(), employee.getEmployeeCode());
        return employeeSalary(employeeId, principal);
    }

    private Employee findEmployee(Long employeeId, UserPrincipal principal) {
        Employee employee = employeeRepository.findByOrgCodeAndId(currentOrgService.orgCode(), employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        employeeAccessService.assertCanAccessEmployee(principal, employee);
        return employee;
    }

    private void ensureDefaultComponents() {
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

    /**
     * Adds the CTC-cost components without changing existing salary structures. They remain
     * master-enabled so HR can opt an employee into them. Unconfigured employee
     * rows for this category are deliberately disabled because legacy earning templates already
     * allocate 100% of CTC. Templates start at zero so they do not imply a statutory rate. The
     * configured percentage remains a percentage of annual CTC (the current salary-model
     * contract), not a statutory percentage of Basic or another calculation base.
     */
    private void ensureEmployerContributionDefaults(String orgCode) {
        createDefaultIfMissing(orgCode, "Employer Provident Fund", "EMPLOYER_PF",
                SalaryComponentCategory.EMPLOYER_CONTRIBUTION, SalaryValueType.PERCENTAGE,
                BigDecimal.ZERO, true);
        createDefaultIfMissing(orgCode, "Employer State Insurance", "EMPLOYER_ESI",
                SalaryComponentCategory.EMPLOYER_CONTRIBUTION, SalaryValueType.PERCENTAGE,
                BigDecimal.ZERO, true);
    }

    private void createDefault(String orgCode, String name, String code, SalaryComponentCategory category,
                               SalaryValueType valueType, BigDecimal value) {
        createDefaultIfMissing(orgCode, name, code, category, valueType, value, true);
    }

    private void createDefaultIfMissing(String orgCode, String name, String code, SalaryComponentCategory category,
                                        SalaryValueType valueType, BigDecimal value, boolean enabled) {
        if (salaryComponentRepository.existsByOrgCodeAndCodeIgnoreCase(orgCode, code)) {
            return;
        }
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
        if (value == null || value.signum() < 0) {
            throw new BadRequestException("Salary value cannot be negative");
        }
        if (type == SalaryValueType.PERCENTAGE && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Percentage value must be between 0 and 100");
        }
    }

    private void validateCtcAllocation(List<EmployeeSalaryComponent> rows, BigDecimal ctc) {
        BigDecimal allocatedCtc = rows.stream()
                .filter(item -> item.isEnabled() && contributesToCtc(item.getComponent().getCategory()))
                .map(item -> annualAmountFor(item, ctc))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (allocatedCtc.compareTo(ctc) != 0) {
            throw new BadRequestException("Enabled earning and employer contribution components must total exactly 100% of annual CTC. Allocated "
                    + allocatedCtc.toPlainString() + " of " + ctc.toPlainString() + ".");
        }
    }

    private boolean contributesToCtc(SalaryComponentCategory category) {
        return category == SalaryComponentCategory.EARNING
                || category == SalaryComponentCategory.EMPLOYER_CONTRIBUTION;
    }

    private boolean defaultEmployeeComponentEnabled(SalaryComponent component) {
        return component.isEnabled()
                && component.getCategory() != SalaryComponentCategory.EMPLOYER_CONTRIBUTION;
    }

    private BigDecimal annualAmountFor(EmployeeSalaryComponent item, BigDecimal annualCtc) {
        if (item.getValueType() == SalaryValueType.PERCENTAGE) {
            return annualCtc.multiply(item.getValue()).divide(HUNDRED);
        }
        return item.getValue();
    }

    private void validateCompleteComponentSet(Set<Long> submittedComponentIds, String orgCode) {
        Set<Long> catalogComponentIds = new HashSet<>();
        salaryComponentRepository.findByOrgCodeOrderByCategoryAscNameAsc(orgCode)
                .forEach(component -> catalogComponentIds.add(component.getId()));
        if (!submittedComponentIds.equals(catalogComponentIds)) {
            throw new BadRequestException("Submit every salary component, including disabled rows, before saving.");
        }
    }

    private String normalizeCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (normalized.isBlank()) {
            throw new BadRequestException("Salary component code is required");
        }
        return normalized;
    }

    private SalaryComponentResponse toComponentResponse(SalaryComponent component) {
        return new SalaryComponentResponse(component.getId(), component.getName(), component.getCode(), component.getCategory(), component.getValueType(), component.getDefaultValue(), component.isEnabled(), component.getCreatedAt(), component.getUpdatedAt());
    }

    private EmployeeSalaryComponentResponse toEmployeeComponentResponse(EmployeeSalaryComponent item) {
        SalaryComponent component = item.getComponent();
        return new EmployeeSalaryComponentResponse(item.getId(), component.getId(), component.getName(), component.getCode(), component.getCategory(), item.getValueType(), item.getValue(), item.isEnabled() && component.isEnabled());
    }

    private String fullName(Employee employee) {
        return java.util.stream.Stream.of(employee.getFirstName(), employee.getMiddleName(), employee.getLastName())
                .filter(value -> value != null && !value.isBlank())
                .reduce((left, right) -> left + " " + right)
                .orElse(employee.getEmployeeCode());
    }
}
