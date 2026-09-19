package za.co.fleetexpense.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class EmailService {

    @Value("${brevo.api.key:}")
    private String brevoApiKey;

    @Value("${brevo.sender.email:noreply@fleetexpense.local}")
    private String senderEmail;

    @Value("${brevo.sender.name:Fleet Expense}")
    private String senderName;

    @Value("${brevo.enabled:false}")
    private boolean brevoEnabled;

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean sendConfirmationEmail(String recipientEmail, String confirmationLink, String username) {
        if (!brevoEnabled || brevoApiKey == null || brevoApiKey.isEmpty()) {
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  EMAIL CONFIRMATION (Console Log Only — Brevo disabled or not configured)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:        {}", recipientEmail);
            log.info("  From:      Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:   Confirm Your Account");
            log.info("  Username:  {}", username);
            log.info("  Link:      {}", confirmationLink);
            log.info("  Status:    QUEUED (Brevo integration disabled)");
            log.info("═══════════════════════════════════════════════════════════════");
            return false;
        }

        try {
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("sender", Map.of("name", senderName, "email", senderEmail));
            emailData.put("to", java.util.List.of(Map.of("email", recipientEmail)));
            emailData.put("subject", "Confirm Your Account");
            emailData.put("htmlContent", buildConfirmationEmailHtml(username, confirmationLink));
            emailData.put("textContent", buildConfirmationEmailText(username, confirmationLink));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(emailData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Confirmation email sent successfully to {}", recipientEmail);
                return true;
            } else {
                log.error("Failed to send confirmation email to {}: HTTP {}", recipientEmail, response.getStatusCode());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send confirmation email to {}: {}", recipientEmail, e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  EMAIL CONFIRMATION (Fallback to log due to API error)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:        {}", recipientEmail);
            log.info("  From:      Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:   Confirm Your Account");
            log.info("  Username:  {}", username);
            log.info("  Link:      {}", confirmationLink);
            log.info("  Status:    FAILED - {}", e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
            return false;
        }
    }

    public void sendSarsLogbook(String recipientEmail, byte[] attachment, String filename, String username, Integer taxYear) {
        if (!brevoEnabled || brevoApiKey == null || brevoApiKey.isEmpty()) {
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  EMAIL EXPORT (Console Log Only — Brevo disabled or not configured)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:        {}", recipientEmail);
            log.info("  From:      Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:   SARS Logbook Export {} - {}", taxYear, username);
            log.info("  Filename:  {}", filename);
            log.info("  Size:      {} bytes", attachment.length);
            log.info("  Status:    QUEUED (Brevo integration disabled)");
            log.info("═══════════════════════════════════════════════════════════════");
            return;
        }

        try {
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("sender", Map.of("name", senderName, "email", senderEmail));
            emailData.put("to", java.util.List.of(Map.of("email", recipientEmail)));
            emailData.put("subject", "SARS Logbook Export " + taxYear + " - " + username);
            emailData.put("htmlContent", buildLogbookEmailHtml(username, taxYear));
            emailData.put("textContent", buildLogbookEmailText(username, taxYear));
            
            // Add attachment
            Map<String, String> attachmentData = new HashMap<>();
            attachmentData.put("name", filename);
            attachmentData.put("content", Base64.getEncoder().encodeToString(attachment));
            emailData.put("attachment", java.util.List.of(attachmentData));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(emailData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("SARS logbook email sent successfully to {}", recipientEmail);
            } else {
                log.error("Failed to send logbook email to {}: HTTP {}", recipientEmail, response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send logbook email to {}: {}", recipientEmail, e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  EMAIL EXPORT (Fallback to log due to API error)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:        {}", recipientEmail);
            log.info("  From:      Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:   SARS Logbook Export {} - {}", taxYear, username);
            log.info("  Filename:  {}", filename);
            log.info("  Size:      {} bytes", attachment.length);
            log.info("  Status:    FAILED - {}", e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
        }
    }

    private String buildConfirmationEmailHtml(String username, String confirmationLink) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "  <meta charset='UTF-8'>" +
                "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "  <title>Confirm Your Account</title>" +
                "</head>" +
                "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;'>" +
                "  <table role='presentation' style='width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;'>" +
                "    <tr>" +
                "      <td style='padding: 40px 20px;'>" +
                "        <div style='background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 5px;'>" +
                "          <p style='color: #856404; margin: 0; font-size: 14px;'><strong>Important:</strong> If you see this email in spam or if links are disabled, please mark it as \"not spam\" and move it to your inbox to enable the confirmation button.</p>" +
                "        </div>" +
                "        <h2 style='color: #333; margin: 0 0 20px 0;'>Welcome to Fleet Expense, " + username + "!</h2>" +
                "        <p style='color: #666; margin: 0 0 30px 0;'>Thank you for registering. Please confirm your email address by clicking the link below:</p>" +
                "        <div style='margin: 30px 0; text-align: center;'>" +
                "          <a href='" + confirmationLink + "' style='background-color: #007bff; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; border: none;'>Confirm Email</a>" +
                "        </div>" +
                "        <p style='color: #666; margin: 20px 0 10px 0;'>If the button above doesn't work, click or copy this link:</p>" +
                "        <p style='color: #0066cc; margin: 0 0 20px 0;'><a href='" + confirmationLink + "' style='color: #0066cc; text-decoration: underline; word-break: break-all;'>" + confirmationLink + "</a></p>" +
                "        <p style='color: #999; font-size: 12px; margin: 0;'>This link will expire in 24 hours.</p>" +
                "      </td>" +
                "    </tr>" +
                "  </table>" +
                "</body>" +
                "</html>";
    }

    private String buildConfirmationEmailText(String username, String confirmationLink) {
        return "Welcome to Fleet Expense, " + username + "!\n\n" +
                "Thank you for registering. Please confirm your email address by clicking the link below:\n\n" +
                confirmationLink + "\n\n" +
                "This link will expire in 24 hours.";
    }

    private String buildLogbookEmailHtml(String username, Integer taxYear) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "  <meta charset='UTF-8'>" +
                "  <title>SARS Logbook Export</title>" +
                "</head>" +
                "<body style='font-family: Arial, sans-serif;'>" +
                "  <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>" +
                "    <h2 style='color: #333;'>SARS Logbook Export</h2>" +
                "    <p style='color: #666;'>Hello " + username + ",</p>" +
                "    <p style='color: #666;'>Your SARS logbook export for tax year " + taxYear + " is attached to this email.</p>" +
                "    <p style='color: #666;'>Please review the document and ensure all information is accurate before submitting to SARS.</p>" +
                "    <p style='color: #999; font-size: 12px;'>If you have any questions, please contact support.</p>" +
                "  </div>" +
                "</body>" +
                "</html>";
    }

    private String buildLogbookEmailText(String username, Integer taxYear) {
        return "SARS Logbook Export\n\n" +
                "Hello " + username + ",\n\n" +
                "Your SARS logbook export for tax year " + taxYear + " is attached to this email.\n\n" +
                "Please review the document and ensure all information is accurate before submitting to SARS.\n\n" +
                "If you have any questions, please contact support.";
    }

    public void sendTeamInvitationEmail(String recipientEmail, String organizationName, String tempPassword, String inviterName) {
        if (!brevoEnabled || brevoApiKey == null || brevoApiKey.isEmpty()) {
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  TEAM INVITATION (Console Log Only — Brevo disabled or not configured)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:              {}", recipientEmail);
            log.info("  From:            Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:         You've been invited to join {}", organizationName);
            log.info("  Organization:    {}", organizationName);
            log.info("  Temp Password:   {}", tempPassword);
            log.info("  Invited by:      {}", inviterName);
            log.info("  Status:          QUEUED (Brevo integration disabled)");
            log.info("═══════════════════════════════════════════════════════════════");
            return;
        }

        try {
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("sender", Map.of("name", senderName, "email", senderEmail));
            emailData.put("to", java.util.List.of(Map.of("email", recipientEmail)));
            emailData.put("subject", "You've been invited to join " + organizationName);
            emailData.put("htmlContent", buildTeamInvitationEmailHtml(organizationName, tempPassword, inviterName));
            emailData.put("textContent", buildTeamInvitationEmailText(organizationName, tempPassword, inviterName));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(emailData, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Team invitation email sent successfully to {}", recipientEmail);
            } else {
                log.error("Failed to send team invitation email to {}: HTTP {}", recipientEmail, response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send team invitation email to {}: {}", recipientEmail, e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  TEAM INVITATION (Fallback to log due to API error)");
            log.info("═══════════════════════════════════════════════════════════════");
            log.info("  To:              {}", recipientEmail);
            log.info("  From:            Vehicle Expense <{}>", senderEmail);
            log.info("  Subject:         You've been invited to join {}", organizationName);
            log.info("  Organization:    {}", organizationName);
            log.info("  Temp Password:   {}", tempPassword);
            log.info("  Invited by:      {}", inviterName);
            log.info("  Status:          FAILED - {}", e.getMessage());
            log.info("═══════════════════════════════════════════════════════════════");
        }
    }

    private String buildTeamInvitationEmailHtml(String organizationName, String tempPassword, String inviterName) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "  <meta charset='UTF-8'>" +
                "  <title>Team Invitation</title>" +
                "</head>" +
                "<body style='font-family: Arial, sans-serif;'>" +
                "  <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>" +
                "    <h2 style='color: #333;'>You've been invited to join " + organizationName + "</h2>" +
                "    <p style='color: #666;'>Hello,</p>" +
                "    <p style='color: #666;'>You have been invited to join the <strong>" + organizationName + "</strong> organization on Fleet Expense.</p>" +
                "    <p style='color: #666;'>Your temporary password is:</p>" +
                "    <div style='background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center;'>" +
                "      <strong style='font-size: 18px; color: #007bff;'>" + tempPassword + "</strong>" +
                "    </div>" +
                "    <p style='color: #666;'>Please log in using your email address and this temporary password. For security reasons, <strong>you must change your password immediately after logging in</strong>.</p>" +
                "    <div style='text-align: center; margin: 30px 0;'>" +
                "      <a href='https://vehicle-expense-and-sa-fleet-manage.vercel.app/login' style='background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Log In</a>" +
                "    </div>" +
                "    <p style='color: #999; font-size: 12px;'>Invited by: " + inviterName + "</p>" +
                "  </div>" +
                "</body>" +
                "</html>";
    }

    private String buildTeamInvitationEmailText(String organizationName, String tempPassword, String inviterName) {
        return "You've been invited to join " + organizationName + "\n\n" +
                "Hello,\n\n" +
                "You have been invited to join the " + organizationName + " organization on Fleet Expense.\n\n" +
                "Your temporary password is: " + tempPassword + "\n\n" +
                "Please log in using your email address and this temporary password. For security reasons, you must change your password immediately after logging in.\n\n" +
                "Log in at: https://vehicle-expense-and-sa-fleet-manage.vercel.app/login\n\n" +
                "Invited by: " + inviterName;
    }
}
