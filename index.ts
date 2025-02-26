import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as chronosphere from "@pulumi-chronosphere/pulumi-chronosphere";
import * as checkly from '@checkly/pulumi'
import * as command from "@pulumi/command";
import * as fs from "fs";


// ---------------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------------


// Get Pulumi configs
const config = new pulumi.Config();
const region = config.get("region");
const project = config.get("project");
const repository = config.get("repository") || "pulumi-workshop";


// ---------------------------------------------------------------------------------
// 2. Create artifact registry and images
// ---------------------------------------------------------------------------------


// Define image paths
const collectorImage = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${repository}/my-custom-otel-collector:latest`;
const appImage = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${repository}/hello-world:latest`;

// Create the Artifact Registry repository resource
const imageRepository = new gcp.artifactregistry.Repository("imageRepository", {
  repositoryId: repository,
  format: "DOCKER",
  location: region,
  description: "Repository for container images",
});

// Build and push images
const buildAndPush = new command.local.Command("buildAndPush", {
  create: pulumi.interpolate`docker build --build-arg CHRONOSPHERE_API_TOKEN=${process.env.CHRONOSPHERE_API_TOKEN} --build-arg CHRONOSPHERE_ORG=${process.env.CHRONOSPHERE_ORG} -t ${collectorImage} -f collector/Dockerfile collector && docker push ${collectorImage} && docker build -t ${appImage} -f app/Dockerfile app && docker push ${appImage}`,
}, { dependsOn: imageRepository });


// ---------------------------------------------------------------------------------
// 3. Create the OTEL Collector Cloud Run Service
// ---------------------------------------------------------------------------------


// Create collector service 
const collectorService = new gcp.cloudrun.Service("otel-collector-service", {
  location: `${region}`,
  template: {
    metadata: {
      annotations: {
        "autoscaling.knative.dev/minScale": "1",
      },
    },
    spec: {
      containers: [
        {
          name: "collector",
          image: collectorImage,
          ports: [{
            containerPort: 4318,
          }],
          envs: [
            { name: "OTEL_LOG_LEVEL", value: "info" },
          ],
        } as any,
      ],
    },
  },
}, { dependsOn: buildAndPush });

// Create iam member
new gcp.cloudrun.IamMember("otel-collector-service-invoker", {
  service: collectorService.name,
  location: collectorService.location,
  role: "roles/run.invoker",
  member: "allUsers",
});

// Export collector service URL
export const collectorServiceUrl = collectorService.statuses.apply(statuses => statuses[0].url);


// ---------------------------------------------------------------------------------
// 4. Create the application Cloud Run Service
// ---------------------------------------------------------------------------------


// Create app service 
const appService = new gcp.cloudrun.Service("app-service", {
  location: `${region}`,
  template: {
      metadata: {
          annotations: {
              "autoscaling.knative.dev/minScale": "1",
          },
      },
      spec: {
          containers: [
              {
                  image: appImage,
                  ports: [{
                      containerPort: 8080,
                  }],
                  envs: [
                      // Set the OTEL endpoint to the collector service URL, and configure otel settings
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
}, { dependsOn: buildAndPush });

// Create iam member
new gcp.cloudrun.IamMember("app-service-invoker", {
  service: appService.name,
  location: appService.location,
  role: "roles/run.invoker",
  member: "allUsers",
});

// Export app service URL
export const appServiceUrl = appService.statuses.apply(statuses => statuses[0].url);


// ---------------------------------------------------------------------------------
// 5. Create a Checkly synthetic test
// ---------------------------------------------------------------------------------


// Create browser check with service url
const browserCheck = pulumi.all([appServiceUrl]).apply(([url]) => {
  return new checkly.Check("browserCheck", {
      activated: true,
      name: "API Check",
      type: "API",
      frequency: 1,
      locations: [
        "us-east-1",
        "eu-west-1",
        "ap-southeast-1"
      ],
      runParallel: true,
      request: {
          method: "GET",
          url: url
        }
  });
});

// Export the check ID (note: browserCheck is now an Output<Check>)
export const checkId = browserCheck.id;


// ---------------------------------------------------------------------------------
// 6. Create a Chronosphere Dashboard
// ---------------------------------------------------------------------------------


// Load Chronosphere dashboard configurations from local json file
const dashboardConfigJson = fs.readFileSync("./chronosphere/dashboard-config.json", "utf8");
const dashboardConfig = JSON.parse(dashboardConfigJson);
dashboardConfig.dashboardJson = JSON.stringify(dashboardConfig.dashboardJson);

// Create new dashboard in Chronosphere
const dashboard = new chronosphere.Dashboard("pulumiWorkshopDashboard", dashboardConfig);

// Export dashboard id
export const dashboardId = dashboard.id;


// ---------------------------------------------------------------------------------
// 7. Create a Chronosphere Monitor
// ---------------------------------------------------------------------------------


// Load Chronosphere monitor configurations from local json file
const monitorConfigJson = fs.readFileSync("./chronosphere/monitor-config.json", "utf8");
const monitorConfig = JSON.parse(monitorConfigJson);

// Create new monitor in Chronosphere
const pulumiWorkshopMonitor = new chronosphere.Monitor("pulumiWorkshopMonitor", monitorConfig);

// Export monitor name
export const monitorName = pulumiWorkshopMonitor.name;
