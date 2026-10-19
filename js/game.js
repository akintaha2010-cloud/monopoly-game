import { SPACES, GROUPS, CHANCE, CHEST, JAIL_INDEX } from "./board.js";

export const START_MONEY = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const HOTEL = 5;

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Game {
  constructor(players, rng = Math.random) {
    if (players.length < 2 || players.length > 4) throw new Error("2-4 oyuncu gerekir");
    this.rng = rng;
    this.players = players.map((p, i) => ({
      id: i, name: p.name, color: p.color,
      money: START_MONEY, pos: 0,
      inJail: false, jailTurns: 0, jailFree: 0, bankrupt: false,
    }));
    this.props = {}; // index -> { owner, houses, mortgaged }
    this.current = 0;
    this.phase = "roll"; // roll | buy | end | gameover
    this.dice = [0, 0];
    this.doubles = 0;
    this.extraTurn = false;
    this.decks = { chance: shuffle(CHANCE, rng), chest: shuffle(CHEST, rng) };
    this.lastCard = null;
    this.log = [];
    this.winner = null;
    this.say(`${this.player.name} başlıyor.`);
  }

  get player() { return this.players[this.current]; }
  say(msg) { this.log.push(msg); }
  isOwnable(i) { return ["property", "railroad", "utility"].includes(SPACES[i].type); }
  ownerOf(i) { return this.props[i] ? this.players[this.props[i].owner] : null; }
  owned(player) { return Object.keys(this.props).map(Number).filter((i) => this.props[i].owner === player.id); }
  groupIndices(group) { return SPACES.map((s, i) => (s.group === group ? i : -1)).filter((i) => i >= 0); }

  hasMonopoly(player, group) {
    return this.groupIndices(group).every((i) => this.props[i]?.owner === player.id);
  }

  countOwned(player, type) {
    return this.owned(player).filter((i) => SPACES[i].type === type).length;
  }

  rentFor(i, diceTotal, { cardMultiplier = false } = {}) {
    const s = SPACES[i], p = this.props[i];
    if (!p || p.mortgaged) return 0;
    const owner = this.players[p.owner];
    if (s.type === "property") {
      if (p.houses > 0) return s.rent[p.houses];
      return this.hasMonopoly(owner, s.group) ? s.rent[0] * 2 : s.rent[0];
    }
    if (s.type === "railroad") {
      const rent = 25 * 2 ** (this.countOwned(owner, "railroad") - 1);
      return cardMultiplier ? rent * 2 : rent;
    }
    if (s.type === "utility") {
      const mult = cardMultiplier || this.countOwned(owner, "utility") === 2 ? 10 : 4;
      return mult * diceTotal;
    }
    return 0;
  }

  // ---- turn flow -------------------------------------------------------

  roll(forced) {
    if (this.phase !== "roll") throw new Error("Şu an zar atılamaz");
    const d = forced || [1 + Math.floor(this.rng() * 6), 1 + Math.floor(this.rng() * 6)];
    this.dice = d;
    const total = d[0] + d[1];
    const isDouble = d[0] === d[1];
    const pl = this.player;
    this.say(`${pl.name} ${d[0]} + ${d[1]} = ${total} attı${isDouble ? " (çift!)" : ""}.`);
    this.extraTurn = false;

    if (pl.inJail) {
      if (isDouble) {
        pl.inJail = false; pl.jailTurns = 0;
        this.say(`${pl.name} çift atarak hapisten çıktı.`);
      } else if (++pl.jailTurns >= 3) {
        pl.inJail = false; pl.jailTurns = 0;
        this.say(`${pl.name} 3. denemede çıkamadı, ${JAIL_FINE}₺ ceza ödedi.`);
        this.charge(pl, JAIL_FINE, null);
      } else {
        this.say(`${pl.name} hapiste kaldı (${pl.jailTurns}/3).`);
        this.phase = "end";
        return d;
      }
      this.phase = "end";
      this.moveBy(total);
      return d;
    }

    if (isDouble) {
      if (++this.doubles === 3) {
        this.say(`${pl.name} üst üste 3 çift attı, hapse gidiyor!`);
        this.sendToJail(pl);
        return d;
      }
      this.extraTurn = true;
    }
    this.phase = "end";
    this.moveBy(total);
    return d;
  }

  moveBy(steps) {
    const pl = this.player;
    const target = (pl.pos + steps + 40) % 40;
    if (steps > 0 && target < pl.pos) this.passGo(pl);
    pl.pos = target;
    this.land();
  }

  moveTo(target, { collectGo = true } = {}) {
    const pl = this.player;
    if (collectGo && target < pl.pos) this.passGo(pl);
    pl.pos = target;
  }

  passGo(pl) {
    pl.money += GO_SALARY;
    this.say(`${pl.name} BAŞLANGIÇ'tan geçti, ${GO_SALARY}₺ aldı.`);
  }

  land(opts = {}) {
    const pl = this.player, i = pl.pos, s = SPACES[i];
    this.say(`${pl.name} → ${s.name}`);
    if (this.isOwnable(i)) {
      const p = this.props[i];
      if (!p) { this.phase = "buy"; return; }
      if (p.owner === pl.id) return;
      if (p.mortgaged) { this.say(`${s.name} ipotekli, kira yok.`); return; }
      let rent;
      if (opts.utilityTen) rent = 10 * (this.dice[0] + this.dice[1]);
      else rent = this.rentFor(i, this.dice[0] + this.dice[1], { cardMultiplier: opts.railDouble });
      const owner = this.players[p.owner];
      this.say(`${pl.name}, ${owner.name}'e ${rent}₺ kira ödüyor.`);
      this.charge(pl, rent, owner);
      return;
    }
    switch (s.type) {
      case "tax":
        this.say(`${pl.name} ${s.amount}₺ vergi ödüyor.`);
        this.charge(pl, s.amount, null);
        break;
      case "gotojail":
        this.sendToJail(pl);
        break;
      case "chance":
      case "chest":
        this.drawCard(s.type);
        break;
      default:
        break;
    }
  }

  sendToJail(pl) {
    pl.pos = JAIL_INDEX;
    pl.inJail = true;
    pl.jailTurns = 0;
    this.extraTurn = false;
    this.doubles = 0;
    this.phase = "end";
    this.say(`${pl.name} hapse girdi.`);
  }

  drawCard(kind) {
    const deck = this.decks[kind];
    const card = deck.shift();
    deck.push(card);
    this.lastCard = { kind, text: card.text };
    const pl = this.player;
    this.say(`${kind === "chance" ? "Şans" : "Kamu Fonu"}: ${card.text}`);
    const others = this.players.filter((p) => p !== pl && !p.bankrupt);
    switch (card.action) {
      case "money":
        if (card.amount >= 0) pl.money += card.amount;
        else this.charge(pl, -card.amount, null);
        break;
      case "move":
        this.moveTo(card.to);
        this.land();
        break;
      case "moveBy":
        this.moveTo((pl.pos + card.steps + 40) % 40, { collectGo: false });
        this.land();
        break;
      case "nearestRail": {
        const t = [5, 15, 25, 35].find((r) => r > pl.pos) ?? 5;
        this.moveTo(t);
        this.land({ railDouble: true });
        break;
      }
      case "nearestUtil": {
        const t = [12, 28].find((u) => u > pl.pos) ?? 12;
        this.moveTo(t);
        this.land({ utilityTen: true });
        break;
      }
      case "jail":
        this.sendToJail(pl);
        break;
      case "jailFree":
        pl.jailFree++;
        break;
      case "repairs": {
        let cost = 0;
        for (const i of this.owned(pl)) {
          const h = this.props[i].houses;
          cost += h === HOTEL ? card.hotel : h * card.house;
        }
        if (cost) this.charge(pl, cost, null);
        break;
      }
      case "payEach":
        for (const o of others) this.charge(pl, card.amount, o);
        break;
      case "collectEach":
        for (const o of others) this.charge(o, card.amount, pl);
        break;
      default:
        break;
    }
  }

  // Money may go negative; the debtor must raise funds or declare bankruptcy before ending the turn.
  charge(from, amount, to) {
    from.money -= amount;
    if (to) to.money += amount;
    if (from.money < 0) {
      from.debtTo = to ? to.id : null;
      this.say(`${from.name} borçta (${from.money}₺). Ev sat / ipotek et ya da iflas et.`);
    }
  }

  buy() {
    if (this.phase !== "buy") throw new Error("Satın alınacak mülk yok");
    const pl = this.player, i = pl.pos, s = SPACES[i];
    if (pl.money < s.price) throw new Error("Yeterli para yok");
    pl.money -= s.price;
    this.props[i] = { owner: pl.id, houses: 0, mortgaged: false };
    this.say(`${pl.name}, ${s.name}'i ${s.price}₺'ye aldı.`);
    this.phase = "end";
  }

  skipBuy() {
    if (this.phase !== "buy") throw new Error("Satın alınacak mülk yok");
    this.say(`${this.player.name}, ${SPACES[this.player.pos].name}'i almadı.`);
    this.phase = "end";
  }

  payJailFine() {
    const pl = this.player;
    if (!pl.inJail || this.phase !== "roll") throw new Error("Hapiste değilsin");
    if (pl.money < JAIL_FINE) throw new Error("Yeterli para yok");
    pl.money -= JAIL_FINE;
    pl.inJail = false; pl.jailTurns = 0;
    this.say(`${pl.name} ${JAIL_FINE}₺ ödeyip hapisten çıktı.`);
  }

  useJailCard() {
    const pl = this.player;
    if (!pl.inJail || pl.jailFree < 1 || this.phase !== "roll") throw new Error("Kart kullanılamaz");
    pl.jailFree--;
    pl.inJail = false; pl.jailTurns = 0;
    this.say(`${pl.name} hapisten ücretsiz çıkış kartını kullandı.`);
  }

  // ---- building & mortgages -------------------------------------------

  canBuild(i) {
    const s = SPACES[i], p = this.props[i], pl = this.player;
    if (s.type !== "property" || !p || p.owner !== pl.id || p.houses >= HOTEL) return false;
    if (!this.hasMonopoly(pl, s.group)) return false;
    const group = this.groupIndices(s.group);
    if (group.some((g) => this.props[g].mortgaged)) return false;
    const min = Math.min(...group.map((g) => this.props[g].houses));
    return p.houses === min && pl.money >= GROUPS[s.group].houseCost;
  }

  build(i) {
    if (!this.canBuild(i)) throw new Error("Buraya ev kurulamaz");
    const s = SPACES[i], p = this.props[i];
    this.player.money -= GROUPS[s.group].houseCost;
    p.houses++;
    this.say(`${this.player.name}, ${s.name}'e ${p.houses === HOTEL ? "otel" : "ev"} kurdu.`);
  }

  canSellHouse(i) {
    const s = SPACES[i], p = this.props[i];
    if (!p || p.owner !== this.player.id || s.type !== "property" || p.houses === 0) return false;
    const max = Math.max(...this.groupIndices(s.group).map((g) => this.props[g].houses));
    return p.houses === max;
  }

  sellHouse(i) {
    if (!this.canSellHouse(i)) throw new Error("Ev satılamaz");
    const s = SPACES[i], p = this.props[i];
    p.houses--;
    this.player.money += GROUPS[s.group].houseCost / 2;
    this.say(`${this.player.name}, ${s.name}'den bir yapı sattı.`);
  }

  canMortgage(i) {
    const s = SPACES[i], p = this.props[i];
    if (!p || p.owner !== this.player.id || p.mortgaged) return false;
    if (s.type === "property") return this.groupIndices(s.group).every((g) => !this.props[g] || this.props[g].houses === 0);
    return true;
  }

  mortgage(i) {
    if (!this.canMortgage(i)) throw new Error("İpotek edilemez");
    this.props[i].mortgaged = true;
    this.player.money += SPACES[i].price / 2;
    this.say(`${this.player.name}, ${SPACES[i].name}'i ipotek etti.`);
  }

  unmortgageCost(i) { return SPACES[i].price / 2 + Math.ceil(SPACES[i].price / 20); }

  canUnmortgage(i) {
    const p = this.props[i];
    return !!p && p.owner === this.player.id && p.mortgaged && this.player.money >= this.unmortgageCost(i);
  }

  unmortgage(i) {
    if (!this.canUnmortgage(i)) throw new Error("İpotek kaldırılamaz");
    this.player.money -= this.unmortgageCost(i);
    this.props[i].mortgaged = false;
    this.say(`${this.player.name}, ${SPACES[i].name} ipoteğini kaldırdı.`);
  }

  // ---- end of turn / bankruptcy ----------------------------------------

  endTurn() {
    if (this.phase !== "end") throw new Error("Önce zar at / karar ver");
    if (this.player.money < 0) throw new Error("Borcunu ödemeden turu bitiremezsin");
    if (this.extraTurn && !this.player.inJail) {
      this.phase = "roll";
      this.say(`${this.player.name} çift attığı için tekrar oynuyor.`);
      return;
    }
    this.nextPlayer();
  }

  nextPlayer() {
    this.doubles = 0;
    this.extraTurn = false;
    do { this.current = (this.current + 1) % this.players.length; } while (this.player.bankrupt);
    this.phase = "roll";
    this.say(`Sıra ${this.player.name}'de.`);
  }

  declareBankruptcy() {
    const pl = this.player;
    const creditor = pl.debtTo != null ? this.players[pl.debtTo] : null;
    for (const i of this.owned(pl)) {
      const p = this.props[i];
      if (p.houses) { pl.money += (p.houses * GROUPS[SPACES[i].group].houseCost) / 2; p.houses = 0; }
      if (creditor) p.owner = creditor.id;
      else delete this.props[i];
    }
    if (creditor) {
      creditor.money += Math.max(pl.money, 0);
      creditor.jailFree += pl.jailFree;
    }
    pl.money = 0; pl.jailFree = 0; pl.bankrupt = true; pl.inJail = false;
    this.say(`${pl.name} iflas etti${creditor ? `; mülkleri ${creditor.name}'e geçti` : ""}.`);
    const alive = this.players.filter((p) => !p.bankrupt);
    if (alive.length === 1) {
      this.winner = alive[0];
      this.phase = "gameover";
      this.say(`🏆 ${this.winner.name} kazandı!`);
      return;
    }
    this.nextPlayer();
  }

  netWorth(pl) {
    return pl.money + this.owned(pl).reduce((sum, i) => {
      const p = this.props[i], s = SPACES[i];
      const built = s.type === "property" ? p.houses * GROUPS[s.group].houseCost : 0;
      return sum + (p.mortgaged ? s.price / 2 : s.price) + built;
    }, 0);
  }
}
