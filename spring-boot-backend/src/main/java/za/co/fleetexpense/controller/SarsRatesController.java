package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.entity.SarsCostScaleBracket;
import za.co.fleetexpense.entity.SarsPrescribedRate;
import za.co.fleetexpense.repository.SarsCostScaleBracketRepository;
import za.co.fleetexpense.repository.SarsPrescribedRateRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/sars")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class SarsRatesController {

    private final SarsPrescribedRateRepository prescribedRateRepository;
    private final SarsCostScaleBracketRepository costScaleBracketRepository;

    @GetMapping("/prescribed-rates")
    public ResponseEntity<List<SarsPrescribedRate>> getAllPrescribedRates() {
        return ResponseEntity.ok(prescribedRateRepository.findAll());
    }

    @GetMapping("/prescribed-rates/{taxYear}")
    public ResponseEntity<SarsPrescribedRate> getPrescribedRateByTaxYear(@PathVariable Integer taxYear) {
        return prescribedRateRepository.findByTaxYear(taxYear)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cost-scale-brackets")
    public ResponseEntity<List<SarsCostScaleBracket>> getAllCostScaleBrackets() {
        return ResponseEntity.ok(costScaleBracketRepository.findAll());
    }

    @GetMapping("/cost-scale-brackets/{taxYear}")
    public ResponseEntity<List<SarsCostScaleBracket>> getCostScaleBracketsByTaxYear(@PathVariable Integer taxYear) {
        return ResponseEntity.ok(costScaleBracketRepository.findByTaxYearOrderByBracketIndexAsc(taxYear));
    }
}
