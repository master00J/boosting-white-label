import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FighterSide = "player" | "opponent";

type DuelEvent = {
  id: number;
  round: number;
  attacker: FighterSide;
  defender: FighterSide;
  hit: boolean;
  damage: number;
  playerHp: number;
  opponentHp: number;
  message: string;
};

type Fighter = {
  side: FighterSide;
  name: string;
  hp: number;
  attack: number;
  defence: number;
  strength: number;
  maxHit: number;
};

function roll(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent: number) {
  return Math.random() * 100 < percent;
}

function accuracy(attacker: Fighter, defender: Fighter) {
  const base = 54 + (attacker.attack - defender.defence) * 0.55;
  return Math.max(32, Math.min(78, base));
}

function createFighters(): [Fighter, Fighter] {
  return [
    {
      side: "player",
      name: "You",
      hp: 99,
      attack: roll(78, 99),
      defence: roll(72, 94),
      strength: roll(80, 99),
      maxHit: roll(32, 42),
    },
    {
      side: "opponent",
      name: "Arena rival",
      hp: 99,
      attack: roll(76, 99),
      defence: roll(70, 96),
      strength: roll(78, 99),
      maxHit: roll(31, 43),
    },
  ];
}

export async function POST() {
  const [player, opponent] = createFighters();
  const fighters: Record<FighterSide, Fighter> = { player, opponent };
  const events: DuelEvent[] = [];

  let attacker: FighterSide = chance(50) ? "player" : "opponent";
  let eventId = 1;

  for (let round = 1; round <= 40; round += 1) {
    const defender: FighterSide = attacker === "player" ? "opponent" : "player";
    const attackingFighter = fighters[attacker];
    const defendingFighter = fighters[defender];
    const didHit = chance(accuracy(attackingFighter, defendingFighter));
    const highRollBonus = chance(12) ? roll(4, 9) : 0;
    const damage = didHit ? Math.min(defendingFighter.hp, roll(1, attackingFighter.maxHit) + highRollBonus) : 0;

    defendingFighter.hp = Math.max(0, defendingFighter.hp - damage);

    events.push({
      id: eventId,
      round,
      attacker,
      defender,
      hit: didHit,
      damage,
      playerHp: player.hp,
      opponentHp: opponent.hp,
      message: didHit
        ? `${attackingFighter.name} lashes for ${damage}.`
        : `${attackingFighter.name} misses the whip swing.`,
    });

    eventId += 1;

    if (player.hp <= 0 || opponent.hp <= 0) break;
    attacker = defender;
  }

  if (player.hp > 0 && opponent.hp > 0) {
    const winner = player.hp >= opponent.hp ? player : opponent;
    const loser = winner.side === "player" ? opponent : player;
    loser.hp = 0;
    events.push({
      id: eventId,
      round: events.length + 1,
      attacker: winner.side,
      defender: loser.side,
      hit: true,
      damage: 0,
      playerHp: player.hp,
      opponentHp: opponent.hp,
      message: `${winner.name} wins by arena decision.`,
    });
  }

  const winner: FighterSide = player.hp > 0 ? "player" : "opponent";

  return NextResponse.json({
    winner,
    fighters: {
      player: {
        name: player.name,
        attack: player.attack,
        defence: player.defence,
        strength: player.strength,
        maxHit: player.maxHit,
      },
      opponent: {
        name: opponent.name,
        attack: opponent.attack,
        defence: opponent.defence,
        strength: opponent.strength,
        maxHit: opponent.maxHit,
      },
    },
    events,
  });
}
