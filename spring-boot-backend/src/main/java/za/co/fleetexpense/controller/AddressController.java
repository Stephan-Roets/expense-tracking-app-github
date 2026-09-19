package za.co.fleetexpense.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import za.co.fleetexpense.dto.AddressDTO;
import za.co.fleetexpense.dto.SimpleAddressRequest;
import za.co.fleetexpense.entity.User;
import za.co.fleetexpense.repository.UserRepository;
import za.co.fleetexpense.security.UserPrincipal;
import za.co.fleetexpense.service.AddressService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<AddressDTO> getMyAddress(
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        AddressDTO address = addressService.getAddress(currentUser.getId(), currentUser);
        if (address == null) {
            address = new AddressDTO(null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        }
        return ResponseEntity.ok(address);
    }

    @PostMapping
    public ResponseEntity<AddressDTO> createAddress(
            @RequestBody SimpleAddressRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(addressService.createSimpleAddress(request, currentUser));
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<AddressDTO> updateAddress(
            @PathVariable UUID addressId,
            @RequestBody SimpleAddressRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User currentUser = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(addressService.updateSimpleAddress(addressId, request, currentUser));
    }
}
