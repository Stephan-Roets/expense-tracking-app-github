package za.co.fleetexpense.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OtherFixedExpenseDTO {
    private String expenseDescription;
    private String categoryLabel;
    private String providerName;
    private BigDecimal costZar;
    private String expenseDate;
    private String referenceNumber;
    private Boolean isRecurring;
    private String recurrenceFrequency;
    private List<String> recurrenceDaysOfWeek;
    private List<Integer> recurrenceDaysOfMonth;
    private String periodStartDate;
    private String periodEndDate;
    private String notes;
}
