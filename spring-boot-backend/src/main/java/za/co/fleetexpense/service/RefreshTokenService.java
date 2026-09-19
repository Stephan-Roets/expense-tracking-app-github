package za.co.fleetexpense.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import za.co.fleetexpense.entity.RefreshToken;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.exception.ResourceNotFoundException;
import za.co.fleetexpense.exception.TokenRefreshException;
import za.co.fleetexpense.repository.RefreshTokenRepository;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.JwtTokenProvider;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${jwt.refresh-token-expiration:604800000}")
    private long refreshTokenDurationMs;

    public RefreshToken findByToken(String token) {
        String tokenHash = hashToken(token);
        return refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new TokenRefreshException("Refresh token not found"));
    }

    public List<RefreshToken> getActiveTokensByUser(UUID userId) {
        return refreshTokenRepository.findActiveByUser(userId);
    }

    @Transactional
    public RefreshToken createRefreshToken(UUID userId, String ipAddress, String userAgent, String deviceInfo) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Generate random token
        String token = generateRandomToken();
        String tokenHash = hashToken(token);

        // Calculate expiry
        OffsetDateTime expiryDate = OffsetDateTime.ofInstant(
                Instant.now().plusMillis(refreshTokenDurationMs),
                ZoneOffset.UTC);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .deviceInfo(deviceInfo)
                .expiresAt(expiryDate)
                .build();

        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        log.info("Created refresh token for user {}", userId);

        // Return with the plain token (for one-time display to client)
        saved.setPlainToken(token);
        return saved;
    }

    @Transactional
    public RefreshToken rotateRefreshToken(String oldToken, String ipAddress, String userAgent) {
        RefreshToken existingToken = findByToken(oldToken);

        // Verify token is valid
        if (existingToken.getIsRevoked()) {
            throw new TokenRefreshException("Refresh token has been revoked");
        }

        if (existingToken.getIsUsed()) {
            throw new TokenRefreshException("Refresh token has already been used");
        }

        if (existingToken.getExpiryDate().isBefore(OffsetDateTime.now())) {
            throw new TokenRefreshException("Refresh token has expired");
        }

        // Mark old token as used
        existingToken.setIsUsed(true);
        refreshTokenRepository.save(existingToken);

        // Create new token
        return createRefreshToken(
                existingToken.getUser().getId(),
                ipAddress,
                userAgent,
                existingToken.getDeviceInfo()
        );
    }

    @Transactional
    public void revokeToken(String token) {
        RefreshToken refreshToken = findByToken(token);
        refreshToken.setIsRevoked(true);
        refreshToken.setRevokedAt(OffsetDateTime.now());
        refreshTokenRepository.save(refreshToken);
        log.info("Revoked refresh token for user {}", refreshToken.getUser().getId());
    }

    @Transactional
    public void revokeAllUserTokens(UUID userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserId(userId);
        OffsetDateTime now = OffsetDateTime.now();
        for (RefreshToken token : tokens) {
            if (!token.getIsRevoked()) {
                token.setIsRevoked(true);
                token.setRevokedAt(now);
            }
        }
        refreshTokenRepository.saveAll(tokens);
        log.info("Revoked all refresh tokens for user {}", userId);
    }

    @Transactional
    public String refreshAccessToken(String refreshToken, String ipAddress, String userAgent) {
        RefreshToken token = rotateRefreshToken(refreshToken, ipAddress, userAgent);
        User user = token.getUser();
        return jwtTokenProvider.generateToken(user.getId(), user.getEmail());
    }

    @Transactional
    public void deleteExpiredTokens() {
        OffsetDateTime now = OffsetDateTime.now();
        List<RefreshToken> expiredTokens = refreshTokenRepository.findAllExpired(now);
        refreshTokenRepository.deleteAll(expiredTokens);
        log.info("Deleted {} expired refresh tokens", expiredTokens.size());
    }

    private String generateRandomToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
