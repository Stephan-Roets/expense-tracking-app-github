package za.co.fleetexpense.util;

import za.co.fleetexpense.entity.Organization;
import za.co.fleetexpense.entity.enums.OrganizationMode;
import za.co.fleetexpense.exception.ForbiddenException;

public final class FleetModeGuard {

    private FleetModeGuard() {}

    public static void requireFleetMode(Organization organization) {
        if (organization == null || organization.getMode() == OrganizationMode.SOLO) {
            throw new ForbiddenException("This feature is only available in FLEET mode");
        }
    }

    public static boolean isFleetMode(Organization organization) {
        return organization != null 
            && (organization.getMode() == OrganizationMode.BUSINESS_FLEET 
                || organization.getMode() == OrganizationMode.COMPANY);
    }
}
