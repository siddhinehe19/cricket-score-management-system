package cricket_score.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import cricket_score.model.Player;

public interface PlayerRepository extends JpaRepository<Player, Long> {
	List<Player> findAllByOrderByIdAsc();
}