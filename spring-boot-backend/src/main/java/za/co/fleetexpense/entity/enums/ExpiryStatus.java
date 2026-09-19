package za.co.fleetexpense.entity.enums;

/**
 * Status levels for expiry alerts.
 */
public enum ExpiryStatus {
    VALID,      // More than 90 days until expiry
    UPCOMING,   // 31-90 days until expiry
    WARNING,    // 8-30 days until expiry
    CRITICAL,   // 1-7 days until expiry
    EXPIRED     // Past expiry date
}
