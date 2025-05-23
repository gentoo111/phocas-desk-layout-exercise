import type { PeopleQuery } from './generated/graphql';
import { DogStatus } from './generated/graphql';

type Person = PeopleQuery['people'][0];

/**
 * requirements teams must sit together.
 * People who don't like dogs should be placed as far away from those who have dogs as possible.
 * People who have dogs should be placed as far apart as possible.
 * Preference to be given to people who would like to avoid dogs. See Example below
 * Desks are arranged in a single line of adjacent desks.
 * Teams sit next to each other, so the team boundary must be taken into account.
 *
 * For example, if given a single team of 5 people with the following preferences:
 * 1. Alice - likes dogs
 * 2. Bob - likes dogs
 * 3. Charlie - doesn't like dogs
 * 4. David - has a dog
 * 5. Eve - has a dog
 *
 * A valid desk layout would be:
 * Charlie(Avoid), Alice(Like), David(Has), Bob(Like), Eve(Has)
 *
 * If Bob left, then a new valid desk layout would be
 * Charlie(Avoid), Alice(Like), David(Has), Eve(Has)
 *
 * There is a test suite provided that is disabled in calculateDeskLayout.spec.ts
 * This test suite may not be exhaustive for all edge cases.
 */
export const calculateDeskLayout = (people: Person[]): Person[] => {
  if (people.length === 0) return [];

  console.log('=== DESK LAYOUT CALCULATION START ===');
  console.log('Input people:', people.map(p => `${p.name}(${p.dogStatus}, Team:${p.team?.id || 'none'})`).join(', '));

  // Group by team
  const teamGroups = new Map<string, Person[]>();

  people.forEach(person => {
    const teamId = person.team?.id ?? 'no-team';
    if (!teamGroups.has(teamId)) {
      teamGroups.set(teamId, []);
    }
    teamGroups.get(teamId)!.push(person);
  });

  console.log('Team groups:', Array.from(teamGroups.entries()).map(([id, members]) =>
    `${id}: [${members.map(p => `${p.name}(${p.dogStatus})`).join(', ')}]`
  ).join('; '));

  // Arrange within each team
  const arrangedTeams = Array.from(teamGroups.values()).map(team =>
    arrangeTeamMembers(team)
  );

  console.log('Arranged teams:', arrangedTeams.map((team, index) =>
    `Team${index + 1}: [${team.map(p => `${p.name}(${p.dogStatus})`).join(', ')}]`
  ).join('; '));

  // Arrange team order
  const result = arrangeTeams(arrangedTeams);

  console.log('=== FINAL RESULT ===');
  console.log('Final arrangement:', result.map(p => `${p.name}(${p.dogStatus})`).join(' -> '));
  console.log('=== DESK LAYOUT CALCULATION END ===');

  return result;
}

function arrangeTeamMembers(teamMembers: Person[]): Person[] {
  if (teamMembers.length <= 1) return teamMembers;

  // Categorize by dog status
  const avoid = teamMembers.filter(p => p.dogStatus === DogStatus.Avoid);
  const like = teamMembers.filter(p => p.dogStatus === DogStatus.Like);
  const have = teamMembers.filter(p => p.dogStatus === DogStatus.Have);

  if (have.length === 0) {
    return [...avoid, ...like];
  }

  if (avoid.length === 0) {
    return arrangeWithoutAvoid(like, have);
  }

  return arrangeWithAvoidPriority(avoid, like, have);
}

function arrangeWithoutAvoid(like: Person[], have: Person[]): Person[] {
  if (have.length === 1) {
    return [...like, ...have];
  }

  const result: Person[] = [];
  for (let i = 0; i < have.length; i++) {
    result.push(have[i]);
    if (i < have.length - 1 && like.length > i) {
      result.push(like[i]);
    }
  }
  for (let i = have.length - 1; i < like.length; i++) {
    result.push(like[i]);
  }
  return result;
}

function arrangeWithAvoidPriority(avoid: Person[], like: Person[], have: Person[]): Person[] {
  if (have.length === 1) {
    return [...avoid, ...like, ...have];
  }

  if (have.length === 2) {
    if (like.length >= 1) {
      const likeForBuffer = Math.floor(like.length / 2);
      const likeBetween = Math.max(1, like.length - likeForBuffer);

      const result: Person[] = [];
      result.push(...avoid);

      if (likeForBuffer > 0) {
        result.push(...like.slice(0, likeForBuffer));
      }

      result.push(have[0]);

      if (likeBetween > 0) {
        result.push(...like.slice(likeForBuffer, likeForBuffer + likeBetween));
      }

      result.push(have[1]);

      if (like.length > likeForBuffer + likeBetween) {
        result.push(...like.slice(likeForBuffer + likeBetween));
      }

      return result;
    } else {
      return [...avoid, ...have];
    }
  }

  const result: Person[] = [];
  result.push(...avoid);

  const bufferSpace = Math.min(like.length, have.length - 1);

  if (bufferSpace > 0) {
    for (let i = 0; i < have.length; i++) {
      if (i > 0 && i <= bufferSpace) {
        result.push(like[i - 1]);
      }
      result.push(have[i]);
    }
    for (let i = bufferSpace; i < like.length; i++) {
      result.push(like[i]);
    }
  } else {
    result.push(...have);
    result.push(...like);
  }

  return result;
}

function arrangeTeams(teams: Person[][]): Person[] {
  if (teams.length <= 1) {
    return teams[0] || [];
  }

  const teamScores = teams.map(team => ({
    team,
    avoidCount: team.filter(p => p.dogStatus === DogStatus.Avoid).length,
    haveCount: team.filter(p => p.dogStatus === DogStatus.Have).length,
  }));

  console.log('Team analysis:');
  teamScores.forEach((ts, index) => {
    console.log(`Team ${index + 1}: ${ts.team.map(p => `${p.name}(${p.dogStatus})`).join(', ')} - Avoid: ${ts.avoidCount}, Have: ${ts.haveCount}`);
  });

  if (teams.length === 2) {
    const result = arrangeTwoTeams(teamScores);
    console.log('Two teams result:', result.map(p => `${p.name}(${p.dogStatus})`).join(', '));
    return result;
  }

  teamScores.sort((a, b) => b.avoidCount - a.avoidCount);
  const result = teamScores.flatMap(({ team }) => team);
  console.log('Multi teams result:', result.map(p => `${p.name}(${p.dogStatus})`).join(', '));
  return result;
}

function arrangeTwoTeams(teamScores: Array<{team: Person[], avoidCount: number, haveCount: number}>): Person[] {
  const [team1, team2] = teamScores;

  const team1HasAvoid = team1.avoidCount > 0;
  const team1HasHave = team1.haveCount > 0;
  const team2HasAvoid = team2.avoidCount > 0;
  const team2HasHave = team2.haveCount > 0;

  console.log(`Team1 has avoid: ${team1HasAvoid}, has have: ${team1HasHave}`);
  console.log(`Team2 has avoid: ${team2HasAvoid}, has have: ${team2HasHave}`);

  if (team1HasAvoid && !team1HasHave && team2HasHave && !team2HasAvoid) {
    console.log('Case 1: Team1(avoid) + Team2(have)');
    return [...team1.team, ...team2.team];
  } else if (team2HasAvoid && !team2HasHave && team1HasHave && !team1HasAvoid) {
    console.log('Case 2: Team2(avoid) + Team1(have)');
    return [...team2.team, ...team1.team];
  }

  console.log('Default case: sorting by avoid count');
  if (team1.avoidCount >= team2.avoidCount) {
    console.log('Team1 first (more avoid)');
    return [...team1.team, ...team2.team];
  } else {
    console.log('Team2 first (more avoid)');
    return [...team2.team, ...team1.team];
  }
}

