# Use Eclipse Temurin JDK 21 (ARM64 for Oracle Cloud Ampere)
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install OCI CLI
RUN apk add --no-cache python3 py3-pip bash && \
    pip3 install --break-system-packages oci-cli && \
    rm -rf /var/cache/apk/*

COPY build/libs/*.jar app.jar

EXPOSE 8080

# Set JVM options for production
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
