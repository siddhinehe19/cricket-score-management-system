package cricket_score.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import cricket_score.model.Team;

public interface TeamRepository extends JpaRepository<Team, Long> {
}