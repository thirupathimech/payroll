package com.payroll.backend.repository;

import com.payroll.backend.domain.OvertimePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OvertimePolicyRepository extends JpaRepository<OvertimePolicy, Long> {

    Optional<OvertimePolicy> findByOrgCodeAndId(String orgCode, Long id);

    Optional<OvertimePolicy> findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationId(
            String orgCode, Long branchId, Long departmentId, Long designationId
    );

    Optional<OvertimePolicy> findByOrgCodeAndBranchIdAndDepartmentIdAndDesignationIdAndActiveTrue(
            String orgCode, Long branchId, Long departmentId, Long designationId
    );

    @Query("""
        select p from OvertimePolicy p
        join fetch p.branch
        join fetch p.department
        join fetch p.designation
        where p.orgCode = :orgCode
        order by p.active desc, p.branch.name asc, p.department.name asc, p.designation.title asc
        """)
    List<OvertimePolicy> findAllForOrg(@Param("orgCode") String orgCode);
}
