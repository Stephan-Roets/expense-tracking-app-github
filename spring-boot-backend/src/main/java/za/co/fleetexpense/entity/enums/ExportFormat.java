package za.co.fleetexpense.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ExportFormat {
    EXCEL("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    PDF("pdf", "application/pdf"),
    HTML("html", "text/html"),
    CSV("csv", "text/csv");

    private final String extension;
    private final String mimeType;

    ExportFormat(String extension, String mimeType) {
        this.extension = extension;
        this.mimeType = mimeType;
    }

    @JsonValue
    public String getExtension() {
        return extension;
    }

    public String getMimeType() {
        return mimeType;
    }

    @JsonCreator
    public static ExportFormat fromString(String value) {
        if (value == null) {
            return null;
        }
        for (ExportFormat format : ExportFormat.values()) {
            if (format.extension.equalsIgnoreCase(value) || 
                format.name().equalsIgnoreCase(value)) {
                return format;
            }
        }
        throw new IllegalArgumentException("Unknown ExportFormat: " + value);
    }
}
