package cricket_score.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "matches")
public class CricketMatch {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "overs_limit", nullable = false)
	private int oversLimit;

	@Column(name = "start_time")
	private LocalDateTime startTime;

	private String status;

	private String venue;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "team1_id", nullable = false)
	private Team team1;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "team2_id", nullable = false)
	private Team team2;

	public CricketMatch() {
	}

	public Long getId() {
		return id;
	}

	public int getOversLimit() {
		return oversLimit;
	}

	public void setOversLimit(int oversLimit) {
		this.oversLimit = oversLimit;
	}

	public LocalDateTime getStartTime() {
		return startTime;
	}

	public void setStartTime(LocalDateTime startTime) {
		this.startTime = startTime;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getVenue() {
		return venue;
	}

	public void setVenue(String venue) {
		this.venue = venue;
	}

	public Team getTeam1() {
		return team1;
	}

	public void setTeam1(Team team1) {
		this.team1 = team1;
	}

	public Team getTeam2() {
		return team2;
	}

	public void setTeam2(Team team2) {
		this.team2 = team2;
	}
}