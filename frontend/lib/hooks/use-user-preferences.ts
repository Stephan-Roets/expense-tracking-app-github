"use client";

import { useCallback, useEffect, useState } from "react";

export interface NotificationPreferences {
  serviceReminders: boolean;
  fuelEfficiency: boolean;
  taxDeadlines: boolean;
}

export interface RegionalPreferences {
  currency: "ZAR";
  distanceUnit: "km";
  fuelEfficiencyDisplay: "km_l" | "l_100km";
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  regional: RegionalPreferences;
}

const STORAGE_KEY = "user_preferences";
const PREFERENCES_CHANGE_EVENT = "preferences-change";

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    serviceReminders: true,
    fuelEfficiency: true,
    taxDeadlines: true,
  },
  regional: {
    currency: "ZAR",
    distanceUnit: "km",
    fuelEfficiencyDisplay: "l_100km",
  },
};

function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...parsed.notifications,
      },
      regional: {
        ...DEFAULT_PREFERENCES.regional,
        ...parsed.regional,
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    setLoaded(true);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setPreferences(loadPreferences());
      }
    };

    // Listen for custom events from same-tab changes
    const handleCustomChange = () => {
      setPreferences(loadPreferences());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(PREFERENCES_CHANGE_EVENT, handleCustomChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(PREFERENCES_CHANGE_EVENT, handleCustomChange);
    };
  }, []);

  const save = useCallback((next: UserPreferences) => {
    setPreferences(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(new CustomEvent(PREFERENCES_CHANGE_EVENT));
  }, []);

  const setNotifications = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      const next = {
        ...preferences,
        notifications: { ...preferences.notifications, ...patch },
      };
      save(next);
    },
    [preferences, save]
  );

  const setRegional = useCallback(
    (patch: Partial<RegionalPreferences>) => {
      const next = {
        ...preferences,
        regional: { ...preferences.regional, ...patch },
      };
      save(next);
    },
    [preferences, save]
  );

  return {
    preferences,
    loaded,
    setNotifications,
    setRegional,
  };
}
