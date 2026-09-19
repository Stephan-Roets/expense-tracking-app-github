package za.co.fleetexpense.entity.enums;

/**
 * Expiry item types for the alert system.
 */
public enum ExpiryItemType {
    VEHICLE_LICENSE,
    DRIVERS_LICENSE,
    PDP,
    PERSONAL_ID_CARD,
    INSURANCE,
    TRACKING_CONTRACT,
    ROADWORTHY,
    OPERATING_LICENSE,
    MECHANIC_SERVICE,  // Service intervals (km/date based)
    TYRE_PURCHASE,  // Tyre replacement (odometer based)
    TYRE_ROTATION  // Tyre rotation (odometer based)
}
