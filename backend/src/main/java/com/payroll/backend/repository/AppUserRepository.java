package com.payroll.backend.repository;

import com.payroll.backend.domain.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByOrgCodeAndId(String orgCode, Long id);

    Optional<AppUser> findByOrgCodeAndUsernameIgnoreCase(String orgCode, String username);

    Optional<AppUser> findByOrgCodeAndEmailIgnoreCase(String orgCode, String email);

    Optional<AppUser> findByOrgCodeAndEmployeeCodeIgnoreCase(String orgCode, String employeeCode);

    boolean existsByEmail(String email);

    boolean existsByOrgCodeAndUsernameIgnoreCase(String orgCode, String username);

    boolean existsByOrgCodeAndEmailIgnoreCase(String orgCode, String email);

    boolean existsByOrgCodeAndEmployeeCodeIgnoreCase(String orgCode, String employeeCode);

    boolean existsByOrgCode(String orgCode);

    @Query("""
        select u from AppUser u
        where u.orgCode = :orgCode
          and (:search is null
            or lower(u.username) like lower(concat('%', :search, '%'))
            or lower(u.fullName) like lower(concat('%', :search, '%'))
            or lower(u.employeeCode) like lower(concat('%', :search, '%')))
          and (:enabled is null or u.enabled = :enabled)
        """)
    Page<AppUser> search(
            @Param("orgCode") String orgCode,
            @Param("search") String search,
            @Param("enabled") Boolean enabled,
            Pageable pageable
    );
}
