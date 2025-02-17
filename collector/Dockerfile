# Use the official OpenTelemetry Collector base image.
FROM otel/opentelemetry-collector:latest

# Copy your custom configuration file into the image.
COPY otel-collector-config.yaml /etc/otel-collector-config.yaml

# Set the entrypoint to load your configuration file.
ENTRYPOINT ["/otelcol", "--config=/etc/otel-collector-config.yaml"]
