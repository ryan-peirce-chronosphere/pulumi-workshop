import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as chronosphere from "@pulumi-chronosphere/pulumi-chronosphere";










// ---------------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------------
const config = new pulumi.Config();
const region = config.get("region") || "us-central1";
const project = "pulumi-workshop-448917";
const repository = "pulumi-workshop-app";

// App container image path 
const appImage = pulumi.interpolate`${region}-docker.pkg.dev/${project}/pulumi-workshop-app/hello-world:latest`;

// Collector image path
const collectorImage = `us-central1-docker.pkg.dev/${project}/${repository}/my-custom-otel-collector:latest`;



















// ---------------------------------------------------------------------------------
// 2. Create the OTEL Collector Cloud Run Service
// ---------------------------------------------------------------------------------
const collectorService = new gcp.cloudrun.Service("otel-collector-service", {
    location: region,
    template: {
      spec: {
        containers: [
          {
            name: "collector",
            image: collectorImage,
            ports: [{
              containerPort: 4318,
            }],
            envs: [
              { name: "OTEL_LOG_LEVEL", value: "debug" },
            ],
          } as any, 
        ],
      },
    },
  });

new gcp.cloudrun.IamMember("otel-collector-service-invoker", {
    service: collectorService.name,
    location: collectorService.location,
    role: "roles/run.invoker",
    member: "allUsers",
});

// Export collector service URL
export const collectorServiceUrl = collectorService.statuses.apply(statuses => statuses[0].url);









// ---------------------------------------------------------------------------------
// 3. Create the Application Cloud Run Service
// ---------------------------------------------------------------------------------
const appService = new gcp.cloudrun.Service("app-service", {
    location: region,
    template: {
        spec: {
            containers: [
                {
                    image: appImage,
                    ports: [{
                        containerPort: 8080,
                    }],
                    envs: [
                        // Set the OTEL endpoint to the collector service URL.
                        { name: "OTEL_EXPORTER_OTLP_ENDPOINT", value: collectorService.statuses.apply(statuses => statuses[0].url) },
                        { name: "OTEL_SERVICE_NAME", value: "pulumi-workshop" },
                        { name: "OTEL_TRACES_EXPORTER", value: "otlp" },
                        { name: "OTEL_LOG_LEVEL", value: "info" },
                        { name: "OTEL_TRACES_SAMPLER", value: "always_on" },
                    ],
                },
            ],
        },
    },
});

new gcp.cloudrun.IamMember("app-service-invoker", {
    service: appService.name,
    location: appService.location,
    role: "roles/run.invoker",
    member: "allUsers",
});

// Export app service URL
export const appServiceUrl = appService.statuses.apply(statuses => statuses[0].url);

















// ---------------------------------------------------------------------------------
// 4. Create a Chronosphere Dashboard
// ---------------------------------------------------------------------------------
const dashboardJson = "{\"kind\":\"Dashboard\",\"spec\":{\"datasource\":null,\"duration\":\"1h\",\"layouts\":[{\"kind\":\"Grid\",\"spec\":{\"items\":[{\"content\":{\"$ref\":\"#/spec/panels/requestsS-4\"},\"height\":7,\"width\":6,\"x\":0,\"y\":0},{\"content\":{\"$ref\":\"#/spec/panels/errorsS-9\"},\"height\":7,\"width\":6,\"x\":6,\"y\":0},{\"content\":{\"$ref\":\"#/spec/panels/durationP50-11\"},\"height\":7,\"width\":6,\"x\":12,\"y\":0},{\"content\":{\"$ref\":\"#/spec/panels/durationP99-10\"},\"height\":7,\"width\":6,\"x\":18,\"y\":0},{\"content\":{\"$ref\":\"#/spec/panels/topology-12\"},\"height\":15,\"width\":24,\"x\":0,\"y\":7}]}}],\"panels\":{\"durationP50-11\":{\"kind\":\"Panel\",\"spec\":{\"display\":{\"name\":\"Duration P50\"},\"plugin\":{\"kind\":\"TimeSeriesChart\",\"spec\":{\"legend\":{\"mode\":\"List\",\"position\":\"Bottom\",\"values\":[]},\"tooltip\":{\"mode\":\"nearby\"},\"visual\":{},\"y_axis\":{\"min\":0,\"unit\":{\"abbreviate\":true,\"decimal_places\":0,\"kind\":\"Seconds\"}}}},\"queries\":[{\"kind\":\"DataQuery\",\"spec\":{\"plugin\":{\"kind\":\"PrometheusTimeSeriesQuery\",\"spec\":{\"query\":\"histogram_quantile(0.5, sum(rate({__name__=\\\"${metric}_duration_bucket\\\"}[$Interval])) by (chronosphere_trace_metric_name,le)) \\u003e 0\",\"series_name_format\":\"{{chronosphere_trace_metric_name}}\"}}}}]}},\"durationP99-10\":{\"kind\":\"Panel\",\"spec\":{\"display\":{\"name\":\"Duration P99\"},\"plugin\":{\"kind\":\"TimeSeriesChart\",\"spec\":{\"legend\":{\"mode\":\"List\",\"position\":\"Bottom\",\"values\":[]},\"tooltip\":{\"mode\":\"nearby\"},\"visual\":{},\"y_axis\":{\"min\":0,\"unit\":{\"abbreviate\":true,\"decimal_places\":0,\"kind\":\"Seconds\"}}}},\"queries\":[{\"kind\":\"DataQuery\",\"spec\":{\"plugin\":{\"kind\":\"PrometheusTimeSeriesQuery\",\"spec\":{\"query\":\"histogram_quantile(0.99, sum(rate({__name__=\\\"${metric}_duration_bucket\\\"}[$Interval])) by (chronosphere_trace_metric_name,le)) \\u003e 0\",\"series_name_format\":\"{{chronosphere_trace_metric_name}}\"}}}}]}},\"errorsS-9\":{\"kind\":\"Panel\",\"spec\":{\"display\":{\"name\":\"Errors/s\"},\"plugin\":{\"kind\":\"TimeSeriesChart\",\"spec\":{\"legend\":{\"mode\":\"List\",\"position\":\"Bottom\",\"values\":[]},\"tooltip\":{\"mode\":\"nearby\"},\"visual\":{},\"y_axis\":{\"min\":0,\"unit\":{\"abbreviate\":true,\"kind\":\"Decimal\"}}}},\"queries\":[{\"kind\":\"DataQuery\",\"spec\":{\"plugin\":{\"kind\":\"PrometheusTimeSeriesQuery\",\"spec\":{\"query\":\"sum(rate({__name__=\\\"$metric\\\",error=\\\"true\\\"}[$Interval])) by (chronosphere_trace_metric_name) \\u003e 0\",\"series_name_format\":\"{{chronosphere_trace_metric_name}}\"}}}}]}},\"requestsS-4\":{\"kind\":\"Panel\",\"spec\":{\"display\":{\"name\":\"Requests/s\"},\"plugin\":{\"kind\":\"TimeSeriesChart\",\"spec\":{\"legend\":{\"mode\":\"List\",\"position\":\"Bottom\",\"values\":[]},\"tooltip\":{\"mode\":\"nearby\"},\"visual\":{},\"y_axis\":{\"min\":0,\"unit\":{\"abbreviate\":true,\"kind\":\"Decimal\"}}}},\"queries\":[{\"kind\":\"DataQuery\",\"spec\":{\"plugin\":{\"kind\":\"PrometheusTimeSeriesQuery\",\"spec\":{\"query\":\"sum(rate({__name__=\\\"$metric\\\"}[$Interval])) by (chronosphere_trace_metric_name) \\u003e 0\",\"series_name_format\":\"{{chronosphere_trace_metric_name}}\"}}}}]}},\"topology-12\":{\"kind\":\"Panel\",\"spec\":{\"display\":{\"name\":\"Topology\"},\"plugin\":{\"kind\":\"ChronoServiceTopology\",\"spec\":{\"spanFilters\":[{\"operation\":{\"type\":\"Variable\"},\"service\":{\"type\":\"Variable\"}}]}},\"queries\":[]}}},\"variables\":[{\"kind\":\"ListVariable\",\"spec\":{\"allow_all_value\":false,\"allow_multiple\":false,\"default_value\":\"\",\"name\":\"metric\",\"plugin\":{\"kind\":\"PrometheusLabelValuesVariable\",\"spec\":{\"label_name\":\"chronosphere_trace_metric_name\",\"matchers\":[\"{trace_metrics=\\\"custom\\\"}\"]}}}},{\"kind\":\"ListVariable\",\"spec\":{\"default_value\":\"2m\",\"name\":\"Interval\",\"plugin\":{\"kind\":\"StaticListVariable\",\"spec\":{\"values\":[\"1m\",\"2m\",\"5m\",\"1h\",\"6h\",\"1d\"]}}}}],\"events\":[]}}"

const dashboard = new chronosphere.Dashboard("pulumiWorkshopDashboard", {
  dashboardJson: dashboardJson, 
  collectionId: "SERVICE:pulumi-workshop",
  name: "Pulumi Workshop Dashboard"
});

export const dashboardId = dashboard.id;






















// ---------------------------------------------------------------------------------
// 5. Create a Chronosphere Monitor
// ---------------------------------------------------------------------------------
const pulumiWorkshopMonitor = new chronosphere.Monitor("pulumiWorkshopMonitor", {
  name: "pulumi-workshop-monitor",
  collectionId: "SERVICE:pulumi-workshop",
  notificationPolicyId: "pulumi-workshop-notification-policy",
  query: {
      prometheusExpr: "sum(rate({__name__=\"pulumi_workshop_requests\",error=\"true\"}[1h])) > 0",
  },
  seriesConditions: {
      conditions: [
          {
              op: "GT",
              severity: "critical",
              sustain: "1m",
              value: 10,
          },
      ],
  },
  interval: "1m",
  signalGrouping: {},
});

export const monitorName = pulumiWorkshopMonitor.name;