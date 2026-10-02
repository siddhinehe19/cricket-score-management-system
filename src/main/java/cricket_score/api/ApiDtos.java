package cricket_score.api;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ApiDtos {
	private ApiDtos() {
	}

	public record TeamRequest(
			@NotBlank @Size(max = 255) String name,
			@NotBlank @Size(max = 255) String shortName) {
	}

	public record TeamResponse(Long id, String name, String shortName) {
	}

	public record PlayerRequest(
			@NotBlank @Size(max = 255) String name,
			@Size(max = 255) String role,
			@NotNull Long teamId) {
	}

	public record PlayerResponse(Long id, String name, String role, Long teamId) {
	}

	public record MatchRequest(
			@NotNull Long homeId,
			@NotNull Long awayId,
			@Size(max = 255) String venue,
			@NotNull LocalDate date,
			@Min(1) @Max(50) int overs) {
	}

	public record InningsResponse(int runs, int wickets, int balls, List<String> events) {
	}

	public record MatchResponse(
			Long id,
			Long homeId,
			Long awayId,
			String venue,
			LocalDate date,
			int overs,
			String status,
			String result,
			List<InningsResponse> innings) {
	}

	public record ScoreEventRequest(
			@Min(0) @Max(6) int runs,
			@Min(0) int extraRuns,
			String extraType,
			boolean wicket,
			String wicketType) {
	}
}