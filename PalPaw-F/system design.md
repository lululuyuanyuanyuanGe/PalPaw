# System Design: PalPaw Project

## Overview

PalPaw is a cross-platform animal adoption application built with a decoupled frontend and backend architecture. The frontend is developed using React Native (Expo), while the backend is implemented using Node.js with Express and PostgreSQL.

## Architecture

- **Frontend (PalPaw-F)**:  
  A mobile app allowing users to register, log in, post adoption requests, create posts, and sell products. Deployed separately from backend.

- **Backend (PalPaw-B)**:  
  An Express.js application managing API endpoints, user authentication, post and product data, and persistent storage with PostgreSQL.

- **Database**:  
  PostgreSQL database used to store all user, post, and product data.

## CI/CD Workflow Design

- **Build Stage**:  
  Docker image for backend is built in GitLab CI using Docker-in-Docker. Image is tagged with both `latest` and `v1.0`.

- **Push Stage**:  
  The built image is pushed to Docker Hub (`palpawteam/palpaw-backend`), using GitLab CI secret variables for authentication.

- **Deploy Stage (Simulated)**:  
  In GitLab CI, a container is launched from the Docker image to simulate deployment.

- **Verification Stage**:  
  Curl and Apache Bench are used to verify that the service is running and responding under basic load.

## Technologies

- **Frontend**: React Native + Expo  
- **Backend**: Node.js + Express  
- **Database**: PostgreSQL  
- **CI/CD**: GitLab CI/CD  
- **Containerization**: Docker  
- **Testing**: curl, Apache Bench