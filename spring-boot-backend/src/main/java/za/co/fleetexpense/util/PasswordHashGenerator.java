package za.co.fleetexpense.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "DARKSTAR420r.1";
        String hash = encoder.encode(password);
        System.out.println("BCrypt hash for '" + password + "': " + hash);
    }
}
