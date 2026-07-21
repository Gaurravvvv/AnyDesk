# AnyDesk DevOps Playbook

This document will act as our central command center. As I generate the code for each phase, you will find the manual commands you need to run right here. 

We will update this document dynamically as we progress.

---

## Phase 1: Local Containerization

**Goal:** Run the entire AnyDesk backend and frontend stack locally in Docker containers.

I am currently generating the `Dockerfile`s and `docker-compose.yml`. Once I am done, you will need to run the following command to test them:

```powershell
# 1. Build and start the containers locally
docker-compose up --build -d

# 2. Check the logs to ensure they are healthy
docker-compose logs -f
```


## Phase 2: Automated CI/CD & Security Scanning

**Goal:** Automatically build, scan (Trivy), and push Docker images to GitHub Container Registry (GHCR) on every push to the `main` branch.

I have generated the `.github/workflows/ci.yml` file.

### Your Manual Task (Phase 2)

1. Make sure GitHub Actions has write access to your packages. Go to your GitHub repository -> **Settings** -> **Actions** -> **General** -> scroll down to **Workflow permissions** and ensure **Read and write permissions** is selected.
2. Commit and push the new files to trigger the pipeline:

```powershell
git add .
git commit -m "feat: setup docker and github actions ci/cd"
git push origin main
```

3. Go to the **Actions** tab on your GitHub repository and watch the `CI/CD Pipeline` run! It will build both images, scan them for vulnerabilities, and push them to your GHCR.


## Phase 3: Local Kubernetes Cluster & GitOps Setup

**Goal:** Run the application locally in a Kubernetes cluster using a GitOps (ArgoCD) workflow.

I have generated `kind-config.yaml`, the `k8s/` manifests, and `argocd-app.yaml`.

### Your Manual Task (Phase 3)

1. Commit and push the new Kubernetes manifests to GitHub (so ArgoCD can pull them):
```powershell
git add .
git commit -m "feat: add k8s manifests and argocd config"
git push origin main
```

2. Create the local cluster using the isolated kind binary:
```powershell
.\.bin\kind create cluster --config kind-config.yaml --name anydesk
```

3. Create the `ghcr-secret` so Kubernetes can pull your private images. (Replace `<YOUR_GITHUB_TOKEN>` with your Classic Personal Access Token that has `read:packages` scope):
```powershell
.\.bin\kubectl create secret docker-registry ghcr-secret --docker-server=ghcr.io --docker-username=Gaurravvvv --docker-password=<YOUR_GITHUB_TOKEN>
```

4. Install ArgoCD into the cluster:
```powershell
.\.bin\kubectl create namespace argocd
.\.bin\kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

5. Apply the ArgoCD application to start the GitOps sync:
```powershell
.\.bin\kubectl apply -f argocd-app.yaml
```

6. Watch the pods spin up!
```powershell
.\.bin\kubectl get pods -A -w
```

*(Once the pods are running, tell me to proceed to Phase 4!)*
