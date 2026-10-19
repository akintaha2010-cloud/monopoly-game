import { test } from "node:test";
import assert from "node:assert/strict";
import { Game, START_MONEY } from "../js/game.js";

const newGame = (n = 2) => new Game(
  Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, color: "#000" })),
  () => 0.5,
);

test("buy property and pay rent", () => {
  const g = newGame();
  g.roll([1, 2]); // -> Baltic Ave (3)
  assert.equal(g.phase, "buy");
  g.buy();
  assert.equal(g.players[0].money, START_MONEY - 60);
  g.endTurn();
  g.roll([1, 2]);
  assert.equal(g.players[1].money, START_MONEY - 4);
  assert.equal(g.players[0].money, START_MONEY - 60 + 4);
});

test("monopoly doubles rent, houses follow rent table and even-build rule", () => {
  const g = newGame();
  g.props[1] = { owner: 0, houses: 0, mortgaged: false };
  g.props[3] = { owner: 0, houses: 0, mortgaged: false };
  assert.equal(g.rentFor(3, 7), 8);
  g.build(3);
  assert.equal(g.canBuild(3), false, "must build evenly");
  g.build(1);
  assert.equal(g.rentFor(3, 7), 20);
  assert.equal(g.players[0].money, START_MONEY - 100);
});

test("passing GO pays salary", () => {
  const g = newGame();
  g.players[0].pos = 38;
  g.roll([1, 3]); // 38 -> 2 (chest)
  assert.ok(g.players[0].money >= START_MONEY + 200 - 100 - 50 || g.players[0].pos !== 2);
  assert.ok(g.log.some((l) => l.includes("BAŞLANGIÇ'tan geçti")));
});

test("three doubles sends to jail; jail exit after three failed rolls costs fine", () => {
  const g = newGame();
  g.roll([1, 1]); g.phase === "buy" && g.skipBuy(); g.endTurn();
  g.roll([2, 2]); g.phase === "buy" && g.skipBuy(); g.endTurn();
  g.roll([3, 3]);
  assert.equal(g.players[0].inJail, true);
  assert.equal(g.players[0].pos, 10);
  g.endTurn();
  assert.equal(g.current, 1);
  g.roll([1, 2]); g.phase === "buy" && g.skipBuy(); g.endTurn();
  g.roll([1, 2]); g.endTurn(); g.roll([1, 2]); g.phase === "buy" && g.skipBuy(); g.endTurn();
  g.roll([1, 2]); g.endTurn(); g.roll([1, 2]); g.phase === "buy" && g.skipBuy(); g.endTurn();
  const before = g.players[0].money;
  g.roll([1, 2]); // third failed attempt -> pay 50, move 3
  assert.equal(g.players[0].inJail, false);
  assert.equal(g.players[0].pos, 13);
  assert.ok(g.players[0].money <= before - 50);
});

test("go to jail space", () => {
  const g = newGame();
  g.players[0].pos = 25;
  g.roll([2, 3]);
  assert.equal(g.players[0].inJail, true);
  assert.equal(g.players[0].pos, 10);
});

test("railroad and utility rent", () => {
  const g = newGame();
  g.props[5] = { owner: 1, houses: 0, mortgaged: false };
  g.props[15] = { owner: 1, houses: 0, mortgaged: false };
  assert.equal(g.rentFor(5, 7), 50);
  g.props[12] = { owner: 1, houses: 0, mortgaged: false };
  assert.equal(g.rentFor(12, 7), 28);
  g.props[28] = { owner: 1, houses: 0, mortgaged: false };
  assert.equal(g.rentFor(12, 7), 70);
});

test("mortgage blocks rent and unmortgage costs 10% interest", () => {
  const g = newGame();
  g.props[39] = { owner: 0, houses: 0, mortgaged: false };
  g.mortgage(39);
  assert.equal(g.players[0].money, START_MONEY + 200);
  assert.equal(g.rentFor(39, 7), 0);
  g.unmortgage(39);
  assert.equal(g.players[0].money, START_MONEY + 200 - 220);
});

test("debt blocks end of turn; bankruptcy transfers assets and ends game", () => {
  const g = newGame();
  g.props[39] = { owner: 1, houses: 5, mortgaged: false };
  g.props[37] = { owner: 1, houses: 5, mortgaged: false };
  g.props[1] = { owner: 0, houses: 0, mortgaged: false };
  g.players[0].pos = 35;
  g.roll([1, 3]); // -> 39 Boardwalk with hotel: 2000
  assert.ok(g.players[0].money < 0);
  assert.throws(() => g.endTurn());
  g.declareBankruptcy();
  assert.equal(g.phase, "gameover");
  assert.equal(g.winner.name, "P2");
  assert.equal(g.props[1].owner, 1);
});
