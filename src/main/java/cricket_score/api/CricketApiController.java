package cricket_score.api;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.stream.IntStream;

import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import cricket_score.api.ApiDtos.InningsResponse;
import cricket_score.api.ApiDtos.MatchRequest;
import cricket_score.api.ApiDtos.MatchResponse;
import cricket_score.api.ApiDtos.PlayerRequest;
import cricket_score.api.ApiDtos.PlayerResponse;
import cricket_score.api.ApiDtos.ScoreEventRequest;
import cricket_score.api.ApiDtos.TeamRequest;
import cricket_score.api.ApiDtos.TeamResponse;
import cricket_score.model.BallEvent;
import cricket_score.model.CricketMatch;
import cricket_score.model.Player;
import cricket_score.model.Team;
import cricket_score.repository.BallEventRepository;
import cricket_score.repository.MatchRepository;
import cricket_score.repository.PlayerRepository;
import cricket_score.repository.TeamRepository;

@Validated
@RestController
@RequestMapping("/api")
public class CricketApiController {
	private final TeamRepository teamRepository;
	private final PlayerRepository playerRepository;
	private final MatchRepository matchRepository;
	private final BallEventRepository ballEventRepository;

	public CricketApiController(
			TeamRepository teamRepository,
			PlayerRepository playerRepository,
			MatchRepository matchRepository,
			BallEventRepository ballEventRepository) {
		this.teamRepository = teamRepository;
		this.playerRepository = playerRepository;
		this.matchRepository = matchRepository;
		this.ballEventRepository = ballEventRepository;
	}

	@GetMapping("/teams")
	@Transactional(readOnly = true)
	public List<TeamResponse> getTeams() {
		return teamRepository.findAll(Sort.by("id")).stream().map(this::toTeamResponse).toList();
	}

	@PostMapping("/teams")
	public TeamResponse createTeam(@Valid @RequestBody TeamRequest request) {
		Team team = new Team();
		team.setName(request.name().trim());
		team.setShortName(request.shortName().trim());
		return toTeamResponse(teamRepository.save(team));
	}

	@PutMapping("/teams/{id}")
	public TeamResponse updateTeam(@PathVariable Long id, @Valid @RequestBody TeamRequest request) {
		Team team = findTeam(id);
		team.setName(request.name().trim());
		team.setShortName(request.shortName().trim());
		return toTeamResponse(teamRepository.save(team));
	}

	@DeleteMapping("/teams/{id}")
	@Transactional
	public void deleteTeam(@PathVariable Long id) {
		try {
			teamRepository.delete(findTeam(id));
			teamRepository.flush();
		} catch (DataIntegrityViolationException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Remove this team's players and fixtures before deleting it.");
		}
	}

	@GetMapping("/players")
	@Transactional(readOnly = true)
	public List<PlayerResponse> getPlayers(@RequestParam(required = false) Long teamId) {
		return playerRepository.findAll(Sort.by("id")).stream()
				.filter(player -> teamId == null || player.getTeam().getId().equals(teamId))
				.map(this::toPlayerResponse)
				.toList();
	}

	@PostMapping("/players")
	public PlayerResponse createPlayer(@Valid @RequestBody PlayerRequest request) {
		Player player = new Player();
		applyPlayerRequest(player, request);
		return toPlayerResponse(playerRepository.save(player));
	}

	@PutMapping("/players/{id}")
	public PlayerResponse updatePlayer(@PathVariable Long id, @Valid @RequestBody PlayerRequest request) {
		Player player = playerRepository.findById(id)
				.orElseThrow(() -> notFound("Player", id));
		applyPlayerRequest(player, request);
		return toPlayerResponse(playerRepository.save(player));
	}

	@DeleteMapping("/players/{id}")
	@Transactional
	public void deletePlayer(@PathVariable Long id) {
		try {
			playerRepository.delete(playerRepository.findById(id)
					.orElseThrow(() -> notFound("Player", id)));
			playerRepository.flush();
		} catch (DataIntegrityViolationException exception) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "A player used in ball events cannot be removed.");
		}
	}

	@GetMapping("/matches")
	@Transactional(readOnly = true)
	public List<MatchResponse> getMatches() {
		return matchRepository.findAll(Sort.by(Sort.Direction.DESC, "startTime", "id")).stream()
				.map(this::toMatchResponse)
				.toList();
	}

	@PostMapping("/matches")
	public MatchResponse createMatch(@Valid @RequestBody MatchRequest request) {
		if (request.homeId().equals(request.awayId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose two different teams.");
		}
		CricketMatch match = new CricketMatch();
		match.setTeam1(findTeam(request.homeId()));
		match.setTeam2(findTeam(request.awayId()));
		match.setVenue(request.venue() == null ? null : request.venue().trim());
		match.setStartTime(request.date().atStartOfDay());
		match.setOversLimit(request.overs());
		match.setStatus("Upcoming");
		return toMatchResponse(matchRepository.save(match));
	}

	@PostMapping("/matches/{id}/start")
	public MatchResponse startMatch(@PathVariable Long id) {
		CricketMatch match = findMatch(id);
		if (!hasStatus(match, "Upcoming") && !hasStatus(match, "Live")) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Only upcoming matches can be started.");
		}
		match.setStatus("Live");
		if (match.getStartTime() == null) {
			match.setStartTime(LocalDateTime.now());
		}
		return toMatchResponse(matchRepository.save(match));
	}

	@PostMapping("/matches/{id}/complete")
	public MatchResponse completeMatch(@PathVariable Long id) {
		CricketMatch match = findMatch(id);
		match.setStatus("Completed");
		return toMatchResponse(matchRepository.save(match));
	}

	@PostMapping("/matches/{id}/events")
	@Transactional
	public MatchResponse recordEvent(@PathVariable Long id, @Valid @RequestBody ScoreEventRequest request) {
		CricketMatch match = findMatch(id);
		if (!hasStatus(match, "Live")) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Start the match before recording deliveries.");
		}
		String extraType = normalizeExtraType(request.extraType());
		List<BallEvent> events = ballEventRepository.findByMatch_IdOrderByInningsAscIdAsc(id);
		List<BallEvent> inningsEvents = events.stream().filter(event -> event.getInnings() == 1).toList();
		int legalBalls = (int) inningsEvents.stream().filter(this::isLegalBall).count();
		long wickets = inningsEvents.stream().filter(BallEvent::isWicket).count();
		if (legalBalls >= match.getOversLimit() * 6 || wickets >= 10) {
			match.setStatus("Completed");
			return toMatchResponse(matchRepository.save(match));
		}
		BallEvent ballEvent = new BallEvent();
		ballEvent.setMatch(match);
		ballEvent.setInnings(1);
		ballEvent.setOverNumber(legalBalls / 6 + 1);
		ballEvent.setBallNumber(legalBalls % 6 + 1);
		ballEvent.setRuns(request.runs());
		ballEvent.setExtraRuns(request.extraRuns());
		ballEvent.setExtraType(extraType);
		ballEvent.setWicket(request.wicket());
		ballEvent.setWicketType(request.wicket() ? request.wicketType() : null);
		ballEventRepository.save(ballEvent);

		int nextLegalBalls = legalBalls + (isLegalBall(ballEvent) ? 1 : 0);
		if (request.wicket() && wickets + 1 >= 10 || nextLegalBalls >= match.getOversLimit() * 6) {
			match.setStatus("Completed");
			matchRepository.save(match);
		}
		return toMatchResponse(match);
	}

	private void applyPlayerRequest(Player player, PlayerRequest request) {
		player.setName(request.name().trim());
		player.setRole(request.role() == null ? null : request.role().trim());
		player.setTeam(findTeam(request.teamId()));
	}

	private Team findTeam(Long id) {
		return teamRepository.findById(id).orElseThrow(() -> notFound("Team", id));
	}

	private CricketMatch findMatch(Long id) {
		return matchRepository.findById(id).orElseThrow(() -> notFound("Match", id));
	}

	private ResponseStatusException notFound(String type, Long id) {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, type + " " + id + " was not found.");
	}

	private TeamResponse toTeamResponse(Team team) {
		return new TeamResponse(team.getId(), team.getName(), team.getShortName());
	}

	private PlayerResponse toPlayerResponse(Player player) {
		return new PlayerResponse(player.getId(), player.getName(), player.getRole(), player.getTeam().getId());
	}

	private MatchResponse toMatchResponse(CricketMatch match) {
		List<BallEvent> events = ballEventRepository.findByMatch_IdOrderByInningsAscIdAsc(match.getId());
		int inningsCount = events.stream().mapToInt(BallEvent::getInnings).max().orElse(
				hasStatus(match, "Live") ? 1 : 0);
		List<InningsResponse> innings = IntStream.rangeClosed(1, inningsCount)
				.mapToObj(number -> summarizeInnings(events, number))
				.toList();
		String status = canonicalStatus(match.getStatus());
		String result = "Completed".equals(status) ? "Match completed" : null;
		return new MatchResponse(
				match.getId(), match.getTeam1().getId(), match.getTeam2().getId(), match.getVenue(),
				match.getStartTime() == null ? null : match.getStartTime().toLocalDate(),
				match.getOversLimit(), status, result, innings);
	}

	private InningsResponse summarizeInnings(List<BallEvent> allEvents, int inningsNumber) {
		List<BallEvent> events = allEvents.stream()
				.filter(event -> event.getInnings() == inningsNumber)
				.toList();
		int runs = events.stream().mapToInt(event -> event.getRuns() + event.getExtraRuns()).sum();
		int wickets = (int) events.stream().filter(BallEvent::isWicket).count();
		int legalBalls = (int) events.stream().filter(this::isLegalBall).count();
		List<String> deliveryLabels = events.stream().map(this::deliveryLabel).toList();
		return new InningsResponse(runs, wickets, legalBalls, deliveryLabels);
	}

	private boolean isLegalBall(BallEvent event) {
		return !"wide".equalsIgnoreCase(event.getExtraType())
				&& !"no-ball".equalsIgnoreCase(event.getExtraType())
				&& !"noball".equalsIgnoreCase(event.getExtraType());
	}

	private String deliveryLabel(BallEvent event) {
		if (event.isWicket()) {
			return "W";
		}
		if ("wide".equalsIgnoreCase(event.getExtraType())) {
			return "Wd";
		}
		if ("no-ball".equalsIgnoreCase(event.getExtraType()) || "noball".equalsIgnoreCase(event.getExtraType())) {
			return "Nb";
		}
		return Integer.toString(event.getRuns() + event.getExtraRuns());
	}

	private String normalizeExtraType(String extraType) {
		if (extraType == null || extraType.isBlank()) {
			return null;
		}
		String normalized = extraType.trim().toLowerCase(Locale.ROOT);
		if (!normalized.equals("wide") && !normalized.equals("no-ball") && !normalized.equals("noball")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Extra type must be wide or no-ball.");
		}
		return normalized.equals("noball") ? "no-ball" : normalized;
	}

	private boolean hasStatus(CricketMatch match, String status) {
		return status.equalsIgnoreCase(match.getStatus());
	}

	private String canonicalStatus(String status) {
		if (status == null) {
			return "Upcoming";
		}
		return switch (status.toLowerCase(Locale.ROOT)) {
			case "live" -> "Live";
			case "completed" -> "Completed";
			default -> "Upcoming";
		};
	}
}