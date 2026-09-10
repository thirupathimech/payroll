package com.payroll.backend.repository;

import com.payroll.backend.domain.AssetCatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetCatalogItemRepository extends JpaRepository<AssetCatalogItem, Long> {
    List<AssetCatalogItem> findByOrgCodeOrderByActiveDescNameAsc(String orgCode);
    Optional<AssetCatalogItem> findByOrgCodeAndId(String orgCode, Long id);
}
