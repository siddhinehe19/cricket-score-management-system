package cricket_score.model;

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
@Table(name = "ball_events")
public class BallEvent {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "ball_number", nullable = false)
	private int ballNumber;

	@Column(name = "extra_runs", nullable = false)
	private int extraRuns;

	@Column(name = "extra_type")
	private String extraType;

	@Column(nullable = false)
	private int innings;

	@Column(name = "over_number", nullable = false)
	private int overNumber;

	@Column(nullable = false)
	private int runs;

	@Column(nullable = false)
	private boolean wicket;

	@Column(name = "wicket_type")
	private String wicketType;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "batsman_id")
	private Player batsman;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "bowler_id")
	private Player bowler;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "match_id", nullable = false)
	private CricketMatch match;

	public BallEvent() {
	}

	public Long getId() {
		return id;
	}

	public int getBallNumber() {
		return ballNumber;
	}

	public void setBallNumber(int ballNumber) {
		this.ballNumber = ballNumber;
	}

	public int getExtraRuns() {
		return extraRuns;
	}

	public void setExtraRuns(int extraRuns) {
		this.extraRuns = extraRuns;
	}

	public String getExtraType() {
		return extraType;
	}

	public void setExtraType(String extraType) {
		this.extraType = extraType;
	}

	public int getInnings() {
		return innings;
	}

	public void setInnings(int innings) {
		this.innings = innings;
	}

	public int getOverNumber() {
		return overNumber;
	}

	public void setOverNumber(int overNumber) {
		this.overNumber = overNumber;
	}

	public int getRuns() {
		return runs;
	}

	public void setRuns(int runs) {
		this.runs = runs;
	}

	public boolean isWicket() {
		return wicket;
	}

	public void setWicket(boolean wicket) {
		this.wicket = wicket;
	}

	public String getWicketType() {
		return wicketType;
	}

	public void setWicketType(String wicketType) {
		this.wicketType = wicketType;
	}

	public Player getBatsman() {
		return batsman;
	}

	public void setBatsman(Player batsman) {
		this.batsman = batsman;
	}

	public Player getBowler() {
		return bowler;
	}

	public void setBowler(Player bowler) {
		this.bowler = bowler;
	}

	public CricketMatch getMatch() {
		return match;
	}

	public void setMatch(CricketMatch match) {
		this.match = match;
	}
}