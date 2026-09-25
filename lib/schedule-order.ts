import type { TeamData } from "./model";
import { japanDate, upcomingSaturday, type ScheduleData, type ScheduleGame } from "./schedule";

function firstGameOnDate(schedules: ScheduleData, date: string): ScheduleGame | undefined {
    return schedules.games.filter((game) => game.date === date).sort((a, b) => {
        // Times are validated HH:mm strings; an unknown time sorts after known times.
        const timeA = a.startTime || "99:99";
        const timeB = b.startTime || "99:99";
        if (timeA !== timeB) return timeA < timeB ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })[0];
}

function includeCandidate(candidates: string[], value: string): string[] {
    if (!value || candidates.includes(value)) return candidates;
    return [...candidates.slice(0, 199), value];
}

/**
 * Projects the chosen schedule and attendance onto the existing lineup, without
 * assigning starters or mutating either input. The week marker is the Saturday
 * at the end of the current Japanese Sunday-to-Saturday week.
 */
export function projectScheduleOrder(
    team: TeamData,
    schedules: ScheduleData,
    previousWeek: string,
    now: Date = new Date(),
    options: { preferCurrentDate?: boolean } = {},
): { data: TeamData; week: string } {
    const week = upcomingSaturday(now);
    // A delayed invocation of an older cron must not roll the shared order back.
    if (previousWeek > week) return { data: team, week: previousWeek };
    const linkedGame = schedules.games.find((game) => game.id === team.scheduleId);
    const upcomingGame = firstGameOnDate(schedules, week);
    let game: ScheduleGame | undefined;

    if (!options.preferCurrentDate && previousWeek !== week) {
        game = upcomingGame;
    } else if (!options.preferCurrentDate && team.date < japanDate(now) && upcomingGame) {
        // A Saturday game may be entered after the weekly job found no schedule.
        game = upcomingGame;
    } else {
        game = linkedGame ?? firstGameOnDate(schedules, team.date);
    }

    if (!game) {
        return {
            data: team.scheduleId && !linkedGame ? { ...team, scheduleId: null } : team,
            week,
        };
    }

    const activeIds = new Set(team.players.map((player) => player.id));
    const absentIds = new Set(team.absentIds.filter((id) => activeIds.has(id)));
    const scheduledAbsences = new Set<string>();
    for (const [playerId, response] of Object.entries(game.responses)) {
        if (!activeIds.has(playerId)) continue;
        if (response.status === "absent") {
            absentIds.add(playerId);
            scheduledAbsences.add(playerId);
        } else if (response.status === "attending") {
            absentIds.delete(playerId);
        }
        // Undecided and missing responses retain the manager's current placement.
    }

    return {
        data: {
            ...team,
            scheduleId: game.id,
            date: game.date,
            startTime: game.startTime,
            tournament: game.title,
            tournaments: includeCandidate(team.tournaments, game.title),
            opponent: game.opponent,
            opponents: includeCandidate(team.opponents, game.opponent),
            location: game.location,
            mapUrl: game.mapUrl,
            slots: team.slots.map((slot) => scheduledAbsences.has(slot.playerId ?? "")
                ? { ...slot, playerId: null } : slot),
            pitcher: scheduledAbsences.has(team.pitcher ?? "") ? null : team.pitcher,
            absentIds: [...absentIds],
        },
        week,
    };
}
