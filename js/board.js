// Board definition: 40 spaces, clockwise from GO.
// rent: [base, 1 house, 2, 3, 4, hotel]
export const GROUPS = {
  brown: { color: "#8b4513", houseCost: 50 },
  lightblue: { color: "#87ceeb", houseCost: 50 },
  pink: { color: "#d63384", houseCost: 100 },
  orange: { color: "#fd7e14", houseCost: 100 },
  red: { color: "#dc3545", houseCost: 150 },
  yellow: { color: "#ffc107", houseCost: 150 },
  green: { color: "#198754", houseCost: 200 },
  darkblue: { color: "#0d3b8c", houseCost: 200 },
};

const prop = (name, group, price, rent) => ({ type: "property", name, group, price, rent });
const rail = (name) => ({ type: "railroad", name, price: 200 });
const util = (name) => ({ type: "utility", name, price: 150 });

export const SPACES = [
  { type: "go", name: "BAŞLANGIÇ" },
  prop("Mediterranean Ave", "brown", 60, [2, 10, 30, 90, 160, 250]),
  { type: "chest", name: "Kamu Fonu" },
  prop("Baltic Ave", "brown", 60, [4, 20, 60, 180, 320, 450]),
  { type: "tax", name: "Gelir Vergisi", amount: 200 },
  rail("Reading Railroad"),
  prop("Oriental Ave", "lightblue", 100, [6, 30, 90, 270, 400, 550]),
  { type: "chance", name: "Şans" },
  prop("Vermont Ave", "lightblue", 100, [6, 30, 90, 270, 400, 550]),
  prop("Connecticut Ave", "lightblue", 120, [8, 40, 100, 300, 450, 600]),
  { type: "jail", name: "Hapis / Ziyaret" },
  prop("St. Charles Place", "pink", 140, [10, 50, 150, 450, 625, 750]),
  util("Elektrik İdaresi"),
  prop("States Ave", "pink", 140, [10, 50, 150, 450, 625, 750]),
  prop("Virginia Ave", "pink", 160, [12, 60, 180, 500, 700, 900]),
  rail("Pennsylvania Railroad"),
  prop("St. James Place", "orange", 180, [14, 70, 200, 550, 750, 950]),
  { type: "chest", name: "Kamu Fonu" },
  prop("Tennessee Ave", "orange", 180, [14, 70, 200, 550, 750, 950]),
  prop("New York Ave", "orange", 200, [16, 80, 220, 600, 800, 1000]),
  { type: "parking", name: "Ücretsiz Otopark" },
  prop("Kentucky Ave", "red", 220, [18, 90, 250, 700, 875, 1050]),
  { type: "chance", name: "Şans" },
  prop("Indiana Ave", "red", 220, [18, 90, 250, 700, 875, 1050]),
  prop("Illinois Ave", "red", 240, [20, 100, 300, 750, 925, 1100]),
  rail("B&O Railroad"),
  prop("Atlantic Ave", "yellow", 260, [22, 110, 330, 800, 975, 1150]),
  prop("Ventnor Ave", "yellow", 260, [22, 110, 330, 800, 975, 1150]),
  util("Su İdaresi"),
  prop("Marvin Gardens", "yellow", 280, [24, 120, 360, 850, 1025, 1200]),
  { type: "gotojail", name: "Hapse Git" },
  prop("Pacific Ave", "green", 300, [26, 130, 390, 900, 1100, 1275]),
  prop("North Carolina Ave", "green", 300, [26, 130, 390, 900, 1100, 1275]),
  { type: "chest", name: "Kamu Fonu" },
  prop("Pennsylvania Ave", "green", 320, [28, 150, 450, 1000, 1200, 1400]),
  rail("Short Line"),
  { type: "chance", name: "Şans" },
  prop("Park Place", "darkblue", 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: "tax", name: "Lüks Vergisi", amount: 100 },
  prop("Boardwalk", "darkblue", 400, [50, 200, 600, 1400, 1700, 2000]),
];

export const JAIL_INDEX = 10;

// Card actions: money (+/-), move (to index), moveBy, jail, jailFree, repairs, payEach, collectEach, nearestRail, nearestUtil
export const CHANCE = [
  { text: "BAŞLANGIÇ'a ilerle (200₺ al).", action: "move", to: 0 },
  { text: "Illinois Ave'ye ilerle.", action: "move", to: 24 },
  { text: "St. Charles Place'e ilerle.", action: "move", to: 11 },
  { text: "En yakın demiryoluna ilerle; sahipliyse 2 kat kira öde.", action: "nearestRail" },
  { text: "En yakın idareye ilerle; sahipliyse zarın 10 katını öde.", action: "nearestUtil" },
  { text: "Banka sana 50₺ temettü ödüyor.", action: "money", amount: 50 },
  { text: "Hapisten ücretsiz çıkış kartı.", action: "jailFree" },
  { text: "3 kare geri git.", action: "moveBy", steps: -3 },
  { text: "Doğrudan hapse git.", action: "jail" },
  { text: "Genel tamir: her ev için 25₺, her otel için 100₺ öde.", action: "repairs", house: 25, hotel: 100 },
  { text: "Hız cezası: 15₺ öde.", action: "money", amount: -15 },
  { text: "Reading Railroad'a git.", action: "move", to: 5 },
  { text: "Boardwalk'a ilerle.", action: "move", to: 39 },
  { text: "Yönetim kurulu başkanı seçildin: her oyuncuya 50₺ öde.", action: "payEach", amount: 50 },
  { text: "Kredin vadesi doldu: 150₺ al.", action: "money", amount: 150 },
];

export const CHEST = [
  { text: "BAŞLANGIÇ'a ilerle (200₺ al).", action: "move", to: 0 },
  { text: "Banka hatası lehine: 200₺ al.", action: "money", amount: 200 },
  { text: "Doktor ücreti: 50₺ öde.", action: "money", amount: -50 },
  { text: "Hisse satışı: 50₺ al.", action: "money", amount: 50 },
  { text: "Hapisten ücretsiz çıkış kartı.", action: "jailFree" },
  { text: "Doğrudan hapse git.", action: "jail" },
  { text: "Tatil fonu vadesi doldu: 100₺ al.", action: "money", amount: 100 },
  { text: "Vergi iadesi: 20₺ al.", action: "money", amount: 20 },
  { text: "Doğum günün: her oyuncudan 10₺ al.", action: "collectEach", amount: 10 },
  { text: "Hayat sigortası: 100₺ al.", action: "money", amount: 100 },
  { text: "Hastane ücreti: 100₺ öde.", action: "money", amount: -100 },
  { text: "Okul ücreti: 50₺ öde.", action: "money", amount: -50 },
  { text: "Danışmanlık ücreti: 25₺ al.", action: "money", amount: 25 },
  { text: "Sokak tamiri: her ev için 40₺, her otel için 115₺ öde.", action: "repairs", house: 40, hotel: 115 },
  { text: "Güzellik yarışmasında ikinci oldun: 10₺ al.", action: "money", amount: 10 },
  { text: "Miras kaldı: 100₺ al.", action: "money", amount: 100 },
];
