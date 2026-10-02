# Cricket Score Management System

A cricket scorekeeping dashboard backed by Spring Boot, Spring Data JPA, and MySQL. It manages teams, players, fixtures, and ball-by-ball scoring through REST endpoints.

## Requirements

- JDK 17 or later
- MySQL 8 or later

## Run locally

1. Create the database if it does not already exist:

   ```sql
   CREATE DATABASE cricket_score_db;
   ```

2. Create `src/main/resources/application-local.properties` with your local MySQL credentials. This file is excluded from Git:

   ```properties
   spring.datasource.username=your_mysql_username
   spring.datasource.password=your_mysql_password
   ```

   Alternatively, set the `DB_PASSWORD` environment variable.

3. Start the application from the project directory:

   ```powershell
   .\mvnw.cmd spring-boot:run
   ```

4. Open <http://localhost:8080>.

## API

- `GET`, `POST`, `PUT`, `DELETE /api/teams`
- `GET`, `POST`, `PUT`, `DELETE /api/players`
- `GET`, `POST /api/matches`
- `POST /api/matches/{id}/start`
- `POST /api/matches/{id}/complete`
- `POST /api/matches/{id}/events`