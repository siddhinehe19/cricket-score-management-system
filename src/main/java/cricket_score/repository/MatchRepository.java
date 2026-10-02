package cricket_score.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import cricket_score.model.CricketMatch;

public interface MatchRepository extends JpaRepository<CricketMatch, Long> {
}