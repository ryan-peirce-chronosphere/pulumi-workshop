# Use the official OpenTelemetry Collector base image.
FROM otel/opentelemetry-collector:latest

# Accept build arguments.
ARG CHRONOSPHERE_API_TOKEN
ARG CHRONOSPHERE_ORG

# Set the environment variables using the build argument.
ENV CHRONOSPHERE_API_TOKEN=${CHRONOSPHERE_API_TOKEN}
ENV CHRONOSPHERE_ORG=${CHRONOSPHERE_ORG}

# Copy your custom configuration file into the image.
COPY otel-collector-config.yaml /etc/otel-collector-config.yaml

# Set the entrypoint to load your configuration file.
ENTRYPOINT ["/otelcol", "--config=/etc/otel-collector-config.yaml"]
