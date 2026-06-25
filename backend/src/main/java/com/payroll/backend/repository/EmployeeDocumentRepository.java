package com.payroll.backend.repository;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {
    List<EmployeeDocument> findByEmployeeIdAndProfilePhotoFalseOrderByUploadedAtDesc(Long employeeId);

    Optional<EmployeeDocument> findByEmployeeIdAndId(Long employeeId, Long id);

    Optional<EmployeeDocument> findByEmployeeIdAndDocumentCategoryIgnoreCaseAndProfilePhotoFalse(Long employeeId, String documentCategory);

    Optional<EmployeeDocument> findByEmployeeIdAndProfilePhotoTrue(Long employeeId);

    void deleteByEmployeeAndProfilePhotoTrue(Employee employee);
}
