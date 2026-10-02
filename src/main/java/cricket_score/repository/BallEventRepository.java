package cricket_score.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import cricket_score.model.BallEvent;

public interface BallEventRepository extends JpaRepository<BallEvent, Long> {
	List<BallEvent> findByMatch_IdOrderByInningsAscIdAsc(Long matchId);
}