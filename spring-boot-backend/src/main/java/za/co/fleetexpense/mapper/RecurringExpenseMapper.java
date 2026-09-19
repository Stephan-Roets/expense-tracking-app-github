package za.co.fleetexpense.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;
import za.co.fleetexpense.dto.RecurringExpenseCreateRequest;
import za.co.fleetexpense.dto.RecurringExpenseDTO;
import za.co.fleetexpense.entity.RecurringExpense;

import java.math.BigDecimal;

@Mapper(componentModel = "spring", nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
public interface RecurringExpenseMapper {

    RecurringExpenseDTO toDTO(RecurringExpense entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "organization", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "vatAmountZar", defaultValue = "0")
    @Mapping(target = "isTaxDeductible", defaultValue = "true")
    @Mapping(target = "isRecurring", defaultValue = "false")
    RecurringExpense toEntity(RecurringExpenseCreateRequest request);
}
