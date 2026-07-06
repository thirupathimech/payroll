package com.payroll.backend.repository;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {
    List<EmployeeDocument> findByOrgCodeAndEmployeeIdAndProfilePhotoFalseOrderByUploadedAtDesc(String orgCode, Long employeeId);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndId(String orgCode, Long employeeId, Long id);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndDocumentCategoryIgnoreCaseAndProfilePhotoFalse(String orgCode, Long employeeId, String documentCategory);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndProfilePhotoTrue(String orgCode, Long employeeId);

    void deleteByOrgCodeAndEmployeeAndProfilePhotoTrue(String orgCode, Employee employee);
}
