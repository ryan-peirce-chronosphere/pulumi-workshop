## Observability as Code Example App With OTel Auto Instrumentation 

This project is a containerized Node.js application instrumented with OpenTelemetry. It's deployed to Google Cloud Platform (GCP) using Pulumi and creates observability resources in Chronosphere and Checkly.

The application serves an HTML landing page via Express and simulates occasional error responses. It's instrumented via the OpenTelemetry zero-code auto-instrumentation package.

## Table of Contents

- Pre-requisites
- Setup Instructions
    - 1. Set up GCP
    - 2. Set Up Pulumi
    - 3. Configure Chronosphere
    - 4. (Optional) Configure Checkly
    - 5. Environment Variables and Secrets
- Building and Deploying
- Documentation
- Getting a Chronosphere Tenant

## Pre-requisites

Before getting started, make sure you have the following installed and configured:

- Node.js 
- Docker 
- Pulumi CLI ([Installation instructions](https://www.pulumi.com/docs/get-started/install/))
- GCP CLI (gcloud) ([Installation instructions](https://cloud.google.com/sdk/docs/install))
- Chronosphere Account and API Token ([Documentation](https://docs.chronosphere.io))
- (Optional) Checkly Account ([Documentation](https://checklyhq.com))

## Setup 

**Set your GCP Project:**

```bash
gcloud config set project <YOUR_GCP_PROJECT_ID>
```

**Enable Required APIs:**

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

**Login to Pulumi:**

```bash
pulumi login
```

**Clone Repo:**

```bash
git clone https://github.com/ryan-peirce-chronosphere/pulumi-workshop.git
```

**Initialize Pulumi and App:**

Pulumi
```bash
pulumi stack init
```

```bash
pulumi install
```

Node
```bash
cd app
```

```bash
npm install
```

**Configure Pulumi Variables:**

```bash
config set gcp:project pulumi-workshop-448917
pulumi config set project <YOUR_GCP_PROJECT_ID>
pulumi config set region <YOUR_GCP_REGION>
pulumi config set repository <YOUR_ARTIFACT_REGISTRY_REPOSITORY_ID>
```

**Set Chronosphere and Checkly Configs:**

Chronosphere:
```bash
export CHRONOSPHERE_API_TOKEN=<YOUR_CHRONOSPHERE_API_TOKEN>
export CHRONOSPHERE_ORG=<YOUR_CHRONOSPHERE_ORG>
```
(Optional) Checkly:
```bash
export CHECKLY_API_KEY=<YOUR_CHECKLY_API_KEY>
export CHECKLY_ACCOUNT_ID=<YOUR_CHECKLY_ACCOUNT_ID>
```

**Deploy:**

From your root directory run:
```bash
pulumi up
```
This deploys your Cloud Run services, IAM members, Chronosphere monitors/dashboards, and Checkly tests.
Verify Deployment:
Check the outputs (app service URL, collector service URL, etc.) from Pulumi and verify that the application is running and accessible.

## Links

**Documentation:**

Refer to the official documentation for Pulumi, GCP, Chronosphere, and Checkly for further guidance.
- GCP ([Installation instructions](https://www.pulumi.com/docs/iac/clouds/gcp/))
- Chronosphere ([Documentation](https://www.pulumi.com/registry/packages/chronosphere/))
- Checkly ([Documentation](https://www.pulumi.com/registry/packages/checkly/))

**Getting a Chronosphere Tenant:**

https://chronosphere.io/demo-request/