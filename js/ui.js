import { SPACES, GROUPS } from "./board.js";
import { Game, HOTEL } from "./game.js";

const COLORS = ["#e63946", "#1d4ed8", "#f59e0b", "#7c3aed"];
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ---- setup screen ------------------------------------------------------

const inputs = $("#player-inputs");
function addPlayerInput() {
  const n = inputs.children.length;
  if (n >= 4) return;
  const row = el("div", "player-input");
  const name = el("input");
  name.type = "text";
  name.value = `Oyuncu ${n + 1}`;
  const color = el("input");
  color.type = "color";
  color.value = COLORS[n];
  row.append(name, color);
  inputs.append(row);
  $("#add-player").disabled = inputs.children.length >= 4;
}
addPlayerInput();
addPlayerInput();
$("#add-player").onclick = addPlayerInput;

let game;
$("#start").onclick = () => {
  const players = [...inputs.children].map((row, i) => ({
    name: row.children[0].value.trim() || `Oyuncu ${i + 1}`,
    color: row.children[1].value,
  }));
  game = new Game(players);
  $("#setup").classList.add("hidden");
  $("#game").classList.remove("hidden");
  buildBoard();
  render();
};

// ---- board -------------------------------------------------------------

// Grid position for space index i on an 11x11 board, GO at bottom-right.
function gridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i };
  if (i <= 20) return { row: 11 - (i - 10), col: 1 };
  if (i <= 30) return { row: 1, col: 1 + (i - 20) };
  return { row: 1 + (i - 30), col: 11 };
}

const cells = [];
function buildBoard() {
  const board = $("#board");
  SPACES.forEach((s, i) => {
    const c = el("div", "space");
    const { row, col } = gridPos(i);
    c.style.gridRow = row;
    c.style.gridColumn = col;
    if (i % 10 === 0) c.classList.add("corner");
    if (s.type === "property") {
      const bar = el("div", "bar");
      bar.style.background = GROUPS[s.group].color;
      c.append(bar);
    }
    c.append(el("div", "name", s.name));
    c.append(el("div", "houses"));
    if (s.price) c.append(el("div", "price", `${s.price}₺`));
    c.append(el("div", "tokens"));
    c.append(el("div", "owner"));
    c.title = describe(i);
    board.append(c);
    cells[i] = c;
  });
}

function describe(i) {
  const s = SPACES[i];
  if (s.type === "property") {
    const r = s.rent;
    return `${s.name} — ${s.price}₺\nKira: ${r[0]} | 1 ev ${r[1]} | 2 ev ${r[2]} | 3 ev ${r[3]} | 4 ev ${r[4]} | otel ${r[5]}\nEv maliyeti: ${GROUPS[s.group].houseCost}₺`;
  }
  if (s.type === "railroad") return `${s.name} — 200₺\nKira: 25 / 50 / 100 / 200`;
  if (s.type === "utility") return `${s.name} — 150₺\nKira: zarın 4 katı (ikisi birden: 10 katı)`;
  if (s.type === "tax") return `${s.name}: ${s.amount}₺`;
  return s.name;
}

// ---- rendering ---------------------------------------------------------

function render() {
  SPACES.forEach((s, i) => {
    const c = cells[i], p = game.props[i];
    c.querySelector(".tokens").replaceChildren(
      ...game.players.filter((pl) => !pl.bankrupt && pl.pos === i).map((pl) => {
        const t = el("div", "token");
        t.style.background = pl.color;
        t.title = pl.name;
        return t;
      }),
    );
    c.querySelector(".owner").style.background = p ? game.players[p.owner].color : "transparent";
    c.querySelector(".houses").textContent = !p || !p.houses ? "" : p.houses === HOTEL ? "🏨" : "🏠".repeat(p.houses);
    c.classList.toggle("mortgaged", !!p?.mortgaged);
  });

  const pl = game.player;
  $("#dice").replaceChildren(...game.dice.map((d) => el("span", null, d || "?")));
  $("#turn").textContent = game.phase === "gameover" ? "" : `Sıra: ${pl.name}`;
  $("#turn").style.color = pl.color;

  const card = $("#card");
  card.classList.toggle("hidden", !game.lastCard);
  if (game.lastCard) card.textContent = `${game.lastCard.kind === "chance" ? "Şans" : "Kamu Fonu"}: ${game.lastCard.text}`;

  renderActions();
  renderPlayers();
  renderMyProps();
  const log = $("#log");
  log.replaceChildren(...game.log.map((m) => el("li", null, m)));
  log.scrollTop = log.scrollHeight;
}

function button(label, fn, { primary = false, disabled = false } = {}) {
  const b = el("button", primary ? "primary" : null, label);
  b.disabled = disabled;
  b.onclick = () => act(fn);
  return b;
}

function act(fn) {
  try {
    fn();
  } catch (e) {
    alert(e.message);
  }
  render();
}

function renderActions() {
  const box = $("#actions");
  const pl = game.player;
  const out = [];
  if (game.phase === "gameover") {
    box.replaceChildren(el("div", "winner", `🏆 ${game.winner.name} kazandı!`), button("Yeni oyun", () => location.reload(), { primary: true }));
    return;
  }
  if (game.phase === "roll") {
    if (pl.inJail) {
      out.push(button(`50₺ öde ve çık`, () => game.payJailFine(), { disabled: pl.money < 50 }));
      if (pl.jailFree) out.push(button("Ücretsiz çıkış kartı", () => game.useJailCard()));
    }
    out.push(button(pl.inJail ? "Çift için zar at" : "Zar at", () => { game.lastCard = null; game.roll(); }, { primary: true }));
  }
  if (game.phase === "buy") {
    const s = SPACES[pl.pos];
    out.push(button(`${s.name} al (${s.price}₺)`, () => game.buy(), { primary: true, disabled: pl.money < s.price }));
    out.push(button("Alma", () => game.skipBuy()));
  }
  if (game.phase === "end") {
    out.push(button(game.extraTurn && !pl.inJail ? "Tekrar oyna" : "Turu bitir", () => game.endTurn(), { primary: true, disabled: pl.money < 0 }));
  }
  if (pl.money < 0) out.push(button("İflas et", () => confirm(`${pl.name} iflas etsin mi?`) && game.declareBankruptcy()));
  box.replaceChildren(...out);
}

function renderPlayers() {
  $("#players").replaceChildren(...game.players.map((p) => {
    const d = el("div", "player");
    d.style.borderLeftColor = p.color;
    d.classList.toggle("active", p === game.player && game.phase !== "gameover");
    d.classList.toggle("bankrupt", p.bankrupt);
    const money = el("span", "money" + (p.money < 0 ? " neg" : ""), `${p.money}₺`);
    d.append(money, el("strong", null, p.name));
    const extra = [`${game.owned(p).length} mülk`, `servet ${game.netWorth(p)}₺`];
    if (p.inJail) extra.push("hapiste");
    if (p.jailFree) extra.push(`${p.jailFree} çıkış kartı`);
    d.append(el("div", null, extra.join(" · ")));
    return d;
  }));
}

function renderMyProps() {
  const pl = game.player;
  const box = $("#my-props");
  if (game.phase === "gameover") { box.replaceChildren(); return; }
  const rows = game.owned(pl).sort((a, b) => a - b).map((i) => {
    const s = SPACES[i], p = game.props[i];
    const row = el("div", "prop-row");
    const sw = el("span", "swatch");
    sw.style.background = s.type === "property" ? GROUPS[s.group].color : "#555";
    const h = p.houses === HOTEL ? " 🏨" : p.houses ? ` ${"🏠".repeat(p.houses)}` : "";
    row.append(sw, el("span", "label", `${s.name}${h}${p.mortgaged ? " (ipotekli)" : ""}`));
    if (s.type === "property") {
      row.append(button("+Ev", () => game.build(i), { disabled: !game.canBuild(i) }));
      row.append(button("−Ev", () => game.sellHouse(i), { disabled: !game.canSellHouse(i) }));
    }
    row.append(p.mortgaged
      ? button(`İpotek kaldır (${game.unmortgageCost(i)}₺)`, () => game.unmortgage(i), { disabled: !game.canUnmortgage(i) })
      : button(`İpotek (+${s.price / 2}₺)`, () => game.mortgage(i), { disabled: !game.canMortgage(i) }));
    return row;
  });
  box.replaceChildren(...(rows.length ? rows : [el("div", null, "Henüz mülkün yok.")]));
}
