package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user;
        
        // Try to parse as UUID (userId from JWT)
        try {
            UUID userId = UUID.fromString(identifier);
            user = userRepository.findById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + identifier));
        } catch (IllegalArgumentException e) {
            // Not a UUID, treat as email
            user = userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + identifier));
        }
        
        return new UserPrincipal(user);
    }
}
