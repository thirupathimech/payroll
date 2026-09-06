package com.payroll.backend.repository;

import com.payroll.backend.domain.Employee;
import com.payroll.backend.domain.EmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, Long> {
    List<EmployeeDocument> findByOrgCodeAndEmployeeIdAndProfilePhotoFalseOrderByUploadedAtDesc(String orgCode, Long employeeId);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndId(String orgCode, Long employeeId, Long id);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndDocumentCategoryIgnoreCaseAndProfilePhotoFalse(String orgCode, Long employeeId, String documentCategory);

    Optional<EmployeeDocument> findByOrgCodeAndEmployeeIdAndProfilePhotoTrue(String orgCode, Long employeeId);

    @Query("select distinct d.employee.id from EmployeeDocument d where d.orgCode = :orgCode and d.profilePhoto = true")
    List<Long> findProfilePhotoEmployeeIdsByOrgCode(@Param("orgCode") String orgCode);

    void deleteByOrgCodeAndEmployeeAndProfilePhotoTrue(String orgCode, Employee employee);
}
