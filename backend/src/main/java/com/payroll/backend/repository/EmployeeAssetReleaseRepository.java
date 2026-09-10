package com.payroll.backend.repository;

import com.payroll.backend.domain.EmployeeAssetRelease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeAssetReleaseRepository extends JpaRepository<EmployeeAssetRelease, Long> {

    @Query("""
            select a from EmployeeAssetRelease a
            join fetch a.assetCatalogItem
            where a.orgCode = :orgCode and a.resignation.id = :resignationId
            order by a.createdAt asc, a.id asc
            """)
    List<EmployeeAssetRelease> findForResignation(@Param("orgCode") String orgCode, @Param("resignationId") Long resignationId);

    @Query("""
            select a from EmployeeAssetRelease a
            join fetch a.resignation r
            join fetch a.assetCatalogItem
            where a.orgCode = :orgCode and a.id = :id
            """)
    Optional<EmployeeAssetRelease> findForUpdate(@Param("orgCode") String orgCode, @Param("id") Long id);
}
