package za.co.fleetexpense.security;

import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.entity.enums.UserRole;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
public class UserPrincipal implements UserDetails {
    private UUID id;
    private UUID userId;
    private UUID organizationId;
    private String email;
    private String password;
    private UserRole role;
    private OrganizationMode organizationMode;
    private Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.userId = user.getId();
        this.organizationId = user.getOrganization() != null ? user.getOrganization().getId() : null;
        this.organizationMode = user.getOrganization() != null ? user.getOrganization().getMode() : OrganizationMode.SOLO;
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.role = user.getRole();

        // For SOLO mode users, grant all privileges since they own the app
        if (this.organizationMode == OrganizationMode.SOLO) {
            this.authorities = List.of(
                new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"),
                new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("ROLE_MANAGER"),
                new SimpleGrantedAuthority("ROLE_DRIVER")
            );
        } else {
            this.authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
            );
        }
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
