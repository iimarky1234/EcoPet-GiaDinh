/**
 * 🐾 ECOPET GIA ĐỊNH — APP CONTROLLER
 * Zero-dependency Vanilla JavaScript (ES6+)
 * Powered by ThingSpeak Channel 3428136 (MakerLab GiaDinh Station)
 */

// ==========================================================================
// 1. CONFIGURATION & STATE
// ==========================================================================
const CONFIG = {
  channelId: 3428136,
  apiUrl: "https://api.thingspeak.com/channels/3428136/feeds.json?results=15",
  pollIntervalMs: 20000, // 20 seconds
  storageKey: "ecopet_giadinh_save_v1"
};

// Application State
const state = {
  isGodMode: false,
  soundMuted: false,
  language: "vi", // "vi" or "en"
  coins: 150,
  highScore: 0,
  equippedHat: null,
  inventory: ["none"], // list of item IDs owned

  // Vitals
  hunger: 85,
  happiness: 90,
  energy: 80,
  comfort: 85,

  // Live IoT Telemetry (Current)
  weather: {
    windSpeed: 0.9,      // field1: m/s
    windDir: 90,         // field2: deg
    temp: 29.1,          // field3: °C
    pressure: 100.4,     // field4: kPa
    light: 850,          // field5: lux
    humidity: 76.4,      // field6: %RH
    noise: 72.8,         // field7: dB
    pm25: 34,            // field8: µg/m³
    lastEntryId: null,
    updatedAt: new Date()
  },

  // Furniture states
  fanSpinning: false,
  speakerPlaying: false,
  fanManualOverride: null,

  countdown: 20
};

// ==========================================================================
// 2. WEB AUDIO PROCEDURAL SYNTHESIZER (No external audio files needed!)
// ==========================================================================
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playPurr() {
    if (state.soundMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    lfo.frequency.value = 18; // purr frequency flutter
    lfoGain.gain.value = 8;
    lfo.connect(osc.frequency);

    osc.type = "triangle";
    osc.frequency.value = 75; // low purr tone

    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start();
    osc.start();
    lfo.stop(this.ctx.currentTime + 0.5);
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playChirp() {
    if (state.soundMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCrunch() {
    if (state.soundMuted) return;
    this.init();
    if (!this.ctx) return;

    // White noise burst for bite crunch
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  playCoin() {
    if (state.soundMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playLoFiBeat() {
    if (state.soundMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [261.63, 329.63, 392.00, 523.25]; // C major chord arpeggio
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + idx * 0.15;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }
}

const audio = new SoundSynth();

// ==========================================================================
// 3. DICTIONARY / I18N
// ==========================================================================
const I18N = {
  vi: {
    subTitle: "Thú Ảo Vi Khí Hậu IoT (Trạm MakerLab #3428136)",
    liveMode: "Trực Tiếp",
    godMode: "Hộp Cát Thời Tiết",
    hunger: "Độ No",
    happiness: "Hạnh Phúc",
    energy: "Năng Lượng",
    climateComfort: "Vi Khí Hậu",
    bowlEmpty: "Trống",
    actPet: "Nựng Bé",
    actPlay: "Chơi Mini-Game",
    actWardrobe: "Tủ Đồ",
    arcadeTitle: "Bắt Gió Sạch (Clean Breeze Catcher)",
    score: "Điểm",
    highScore: "Kỷ Lục",
    windMultiplier: "Gió Thật",
    arcadeInst: "Di chuyển chuột hoặc phím mũi tên [←] [→] để hứng Làn Gió Xanh 🍃 và Tia Nắng ☀️. Tránh né Bụi Mịn PM2.5 🌫️!",
    arcadeStartBtn: "Bắt Đầu Bay!",
    wardrobeTitle: "Tủ Đồ Phụ Kiện EcoPet",
    wardrobeSub: "Dùng EcoCoins kiếm từ việc chăm sóc và mini-game để diện đồ cho bé!",
    telemetryTitle: "Trạm Quan Trắc MakerLab Gia Định",
    godModeTitle: "Hộp Cát Thời Tiết (Weather God Mode)",
    godModeSub: "Kéo thanh trượt để thử nghiệm phản ứng của EcoPet!",
    presets: "Kịch bản nhanh:",
    sensWindSpeed: "Tốc Độ Gió",
    sensWindDir: "Hướng Gió",
    sensTemp: "Nhiệt Độ Không Khí",
    sensPressure: "Áp Suất Khí Quyển",
    sensLight: "Cường Độ Ánh Sáng",
    sensHumidity: "Độ Ẩm Không Khí",
    sensNoise: "Độ Ồn Môi Trường",
    sensPM25: "Bụi Mịn PM2.5",
    quotes: {
      hot: ["Trời nóng quá (~{temp}°C), cho tớ xin ly Trà Đá!", "Nắng gắt ghê, tớ phải bật quạt thôi!"],
      cool: ["Tiết trời mát mẻ dễ chịu ghê!", "Gia Định hôm nay trong lành quá!"],
      windy: ["Gió Gia Định thổi mạnh ghê ({wind} m/s)!", "Khăn quàng của tớ bay phần phật!"],
      dusty: ["Bụi PM2.5 cao quá ({pm} µg/m³), tớ phải đeo khẩu trang!", "Máy lọc không khí đang chạy hết công suất!"],
      noisy: ["Phố xá ồn ào quá ({noise} dB), tớ đeo tai nghe quẩy đây!", "Tiếng còi xe rộn rã phố Gia Định!"],
      night: ["Trời tối rồi, tớ buồn ngủ quá... Zzz", "Gia Định về đêm thật lung linh."],
      happy: ["Cảm ơn bạn đã nựng tớ!", "Tớ yêu bạn nhiều lắm! 🐾"]
    }
  },
  en: {
    subTitle: "IoT Microclimate Virtual Pet (MakerLab Station #3428136)",
    liveMode: "Live IoT",
    godMode: "Weather Sandbox",
    hunger: "Hunger",
    happiness: "Happiness",
    energy: "Energy",
    climateComfort: "Microclimate",
    bowlEmpty: "Empty",
    actPet: "Pet Me",
    actPlay: "Mini-Game",
    actWardrobe: "Wardrobe",
    arcadeTitle: "Clean Breeze Catcher",
    score: "Score",
    highScore: "High Score",
    windMultiplier: "Live Wind",
    arcadeInst: "Move mouse or [←] [→] arrow keys to catch Clean Breeze 🍃 and Solar Sparks ☀️. Avoid PM2.5 Smog 🌫️!",
    arcadeStartBtn: "Start Gliding!",
    wardrobeTitle: "EcoPet Accessory Shop",
    wardrobeSub: "Spend EcoCoins earned from pet care and arcade mini-game to dress your pet!",
    telemetryTitle: "MakerLab Gia Dinh Station Telemetry",
    godModeTitle: "Weather Sandbox (God Mode)",
    godModeSub: "Drag sliders to test extreme weather reactions!",
    presets: "Quick Scenarios:",
    sensWindSpeed: "Wind Speed",
    sensWindDir: "Wind Direction",
    sensTemp: "Air Temperature",
    sensPressure: "Barometric Pressure",
    sensLight: "Solar Light",
    sensHumidity: "Relative Humidity",
    sensNoise: "Ambient Noise",
    sensPM25: "PM2.5 Fine Dust",
    quotes: {
      hot: ["It's so hot (~{temp}°C), iced tea please!", "Blazing sun, turning on the desk fan!"],
      cool: ["The weather feels so fresh and gentle!", "Lovely atmosphere in Gia Dinh today!"],
      windy: ["Whoa, gusty wind ({wind} m/s)!", "My scarf is fluttering in the breeze!"],
      dusty: ["High dust ({pm} µg/m³), putting on my mask!", "Air purifier running at turbo speed!"],
      noisy: ["Street is loud ({noise} dB), rocking my headphones!", "Busy traffic vibes in Gia Dinh!"],
      night: ["It's dark outside, getting sleepy... Zzz", "Peaceful starry night in the city."],
      happy: ["Thank you for petting me!", "I love you so much! 🐾"]
    }
  }
};

// Wardrobe Catalog
const WARDROBE_ITEMS = [
  { id: "nonla", name: "Nón Lá", icon: "🎋", price: 100 },
  { id: "shades", name: "Cyber Shades", icon: "🕶️", price: 150 },
  { id: "crown", name: "Golden Crown", icon: "👑", price: 250 },
  { id: "headset", name: "Gamer Headset", icon: "🎧", price: 200 },
  { id: "ribbon", name: "Red Ribbon", icon: "🎀", price: 80 },
  { id: "chef", name: "Chef Toque", icon: "👨‍🍳", price: 120 }
];

// ==========================================================================
// 4. STORAGE (SAVE & LOAD)
// ==========================================================================
function saveLocalData() {
  try {
    const data = {
      coins: state.coins,
      highScore: state.highScore,
      inventory: state.inventory,
      equippedHat: state.equippedHat,
      language: state.language,
      hunger: state.hunger,
      happiness: state.happiness,
      energy: state.energy
    };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage save error:", e);
  }
}

function loadLocalData() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      if (typeof data.coins === "number") state.coins = data.coins;
      if (typeof data.highScore === "number") state.highScore = data.highScore;
      if (Array.isArray(data.inventory)) state.inventory = data.inventory;
      if (data.equippedHat) state.equippedHat = data.equippedHat;
      if (data.language) state.language = data.language;
      if (typeof data.hunger === "number") state.hunger = data.hunger;
      if (typeof data.happiness === "number") state.happiness = data.happiness;
      if (typeof data.energy === "number") state.energy = data.energy;
    }
  } catch (e) {
    console.warn("Storage load error:", e);
  }
}

// ==========================================================================
// 5. THINGSPEAK IOT SERVICE
// ==========================================================================
async function fetchThingSpeakData() {
  if (state.isGodMode) return;

  const statusPill = document.getElementById("stationStatusPill");
  const statusLabel = document.getElementById("statusLabelText");

  try {
    const res = await fetch(CONFIG.apiUrl);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();

    if (data && data.feeds && data.feeds.length > 0) {
      const latest = data.feeds[data.feeds.length - 1];

      // Parse and clamp valid sensor readings
      state.weather.windSpeed = parseFloat(latest.field1) || 0.8;
      state.weather.windDir = parseFloat(latest.field2) || 90;
      state.weather.temp = parseFloat(latest.field3) || 29.0;
      state.weather.pressure = parseFloat(latest.field4) || 100.4;
      state.weather.light = parseFloat(latest.field5) || 500;
      state.weather.humidity = parseFloat(latest.field6) || 75.0;
      state.weather.noise = parseFloat(latest.field7) || 72.0;
      state.weather.pm25 = parseFloat(latest.field8) || 35;
      state.weather.lastEntryId = latest.entry_id;
      state.weather.updatedAt = new Date(latest.created_at || Date.now());

      if (statusPill) statusPill.querySelector(".status-dot").className = "status-dot live";
      if (statusLabel) statusLabel.textContent = `Online (#${state.weather.lastEntryId})`;

      applyWeatherToEnvironment();
      updateTelemetryDrawerUI();
    }
  } catch (err) {
    console.warn("ThingSpeak fetch issue, falling back to simulated live feed:", err);
    if (statusLabel) statusLabel.textContent = "Offline (Dự phòng)";
  }
}

// ==========================================================================
// 6. APPLY WEATHER DYNAMICS TO PET & ENVIRONMENT
// ==========================================================================
function applyWeatherToEnvironment() {
  const w = state.weather;

  // 1. Wind tilt on curtains, potted plant, pet scarf
  // Convert direction (0-360) and speed into tilt angle (-25deg to +25deg)
  const angleRad = (w.windDir * Math.PI) / 180;
  const windSwayAngle = Math.sin(angleRad) * Math.min(w.windSpeed * 4, 25);
  const animDuration = Math.max(0.6, 3.5 - Math.min(w.windSpeed * 0.4, 2.5)) + "s";

  document.documentElement.style.setProperty("--wind-tilt", `${windSwayAngle}deg`);
  document.documentElement.style.setProperty("--wind-speed-anim", animDuration);

  // 2. Barometer needle calculation (95 kPa to 105 kPa mapped to -70deg to +70deg)
  const barometerNeedle = document.getElementById("barometerNeedle");
  const barometerVal = document.getElementById("barometerVal");
  if (barometerNeedle && barometerVal) {
    const clampedPres = Math.min(Math.max(w.pressure, 95), 105);
    const needleDeg = ((clampedPres - 100) / 5) * 65;
    barometerNeedle.style.transform = `rotate(${needleDeg}deg)`;
    barometerVal.textContent = w.pressure.toFixed(1);
  }

  // 3. Desk Fan (Turns on when temp > 30°C or manual toggle)
  const electricFan = document.getElementById("electricFan");
  const shouldFanSpin = state.fanManualOverride !== null ? state.fanManualOverride : (w.temp >= 30.0);
  state.fanSpinning = shouldFanSpin;
  if (electricFan) {
    if (shouldFanSpin) {
      electricFan.classList.add("spinning");
    } else {
      electricFan.classList.remove("spinning");
    }
  }

  // 4. Air Purifier (Screen & Ring glow green/blue/red based on PM2.5)
  const purifierRing = document.getElementById("purifierRing");
  const purifierPmVal = document.getElementById("purifierPmVal");
  const petFaceMask = document.getElementById("petFaceMask");

  if (purifierPmVal) purifierPmVal.textContent = Math.round(w.pm25);
  if (purifierRing) {
    if (w.pm25 < 30) {
      purifierRing.style.borderColor = "#10b981"; // Good green
    } else if (w.pm25 < 55) {
      purifierRing.style.borderColor = "#f59e0b"; // Moderate amber
    } else {
      purifierRing.style.borderColor = "#ef4444"; // Bad red
    }
  }

  // Pet equips protective face mask if PM2.5 is high
  if (petFaceMask) {
    if (w.pm25 > 45) {
      petFaceMask.classList.add("active");
    } else {
      petFaceMask.classList.remove("active");
    }
  }

  // 5. DJ Headphones on pet if street noise > 75 dB
  const petHeadphones = document.getElementById("petHeadphones");
  if (petHeadphones) {
    if (w.noise > 74) {
      petHeadphones.classList.add("active");
    } else {
      petHeadphones.classList.remove("active");
    }
  }

  // 6. Calculate Climate Comfort Score (0-100%)
  let comfortScore = 100;
  // Penalty for extreme heat or cold
  if (w.temp > 32) comfortScore -= (w.temp - 32) * 5;
  else if (w.temp < 20) comfortScore -= (20 - w.temp) * 4;
  // Penalty for high PM2.5
  if (w.pm25 > 35) comfortScore -= (w.pm25 - 35) * 0.8;
  // Penalty for extreme noise
  if (w.noise > 75) comfortScore -= (w.noise - 75) * 1.5;
  // Penalty for high humidity (>80%)
  if (w.humidity > 80) comfortScore -= (w.humidity - 80) * 0.5;

  state.comfort = Math.round(Math.max(15, Math.min(100, comfortScore)));

  // Update vitals UI
  updateVitalsUI();

  // Dynamic Context-Aware Speech Bubble
  updatePetDialogue();
}

// ==========================================================================
// 7. DIALOGUE & SPEECH ENGINE
// ==========================================================================
let lastDialogueTime = 0;
function updatePetDialogue(forceQuote = null) {
  const now = Date.now();
  if (!forceQuote && now - lastDialogueTime < 7000) return; // avoid too frequent spam
  lastDialogueTime = now;

  const speechText = document.getElementById("speechText");
  const speechBubble = document.getElementById("petSpeechBubble");
  if (!speechText || !speechBubble) return;

  const w = state.weather;
  const t = I18N[state.language].quotes;
  let text = "";

  if (forceQuote) {
    text = forceQuote;
  } else if (w.temp >= 31.5) {
    text = t.hot[Math.floor(Math.random() * t.hot.length)].replace("{temp}", w.temp.toFixed(1));
    spawnSweatDrop();
  } else if (w.pm25 >= 50) {
    text = t.dusty[Math.floor(Math.random() * t.dusty.length)].replace("{pm}", Math.round(w.pm25));
  } else if (w.noise >= 78) {
    text = t.noisy[Math.floor(Math.random() * t.noisy.length)].replace("{noise}", w.noise.toFixed(1));
  } else if (w.windSpeed >= 2.5) {
    text = t.windy[Math.floor(Math.random() * t.windy.length)].replace("{wind}", w.windSpeed.toFixed(1));
  } else if (w.light < 50) {
    text = t.night[Math.floor(Math.random() * t.night.length)];
  } else {
    text = t.cool[Math.floor(Math.random() * t.cool.length)];
  }

  speechText.textContent = text;
  speechBubble.style.opacity = "1";
}

// ==========================================================================
// 8. PET INTERACTIONS (Petting, Tickling, Feeding)
// ==========================================================================
function triggerPet() {
  const petBody = document.getElementById("petBodyWrapper");
  if (!petBody) return;

  // Squash & bounce animation
  petBody.classList.remove("pet-squash", "pet-tickle-hop");
  void petBody.offsetWidth; // trigger reflow
  petBody.classList.add("pet-squash");

  // Purr audio
  audio.playPurr();

  // Floating heart FX
  spawnHeartParticle();

  // Boost Happiness & Comfort
  state.happiness = Math.min(100, state.happiness + 6);
  state.comfort = Math.min(100, state.comfort + 3);
  updateVitalsUI();

  // Random cute dialogue
  const happyQuotes = I18N[state.language].quotes.happy;
  updatePetDialogue(happyQuotes[Math.floor(Math.random() * happyQuotes.length)]);
}

function triggerTickle() {
  const petBody = document.getElementById("petBodyWrapper");
  if (!petBody) return;

  petBody.classList.remove("pet-squash", "pet-tickle-hop");
  void petBody.offsetWidth;
  petBody.classList.add("pet-tickle-hop");

  audio.playChirp();
  spawnHeartParticle();

  // Small coin reward for good interaction
  addCoins(1);

  state.happiness = Math.min(100, state.happiness + 8);
  updateVitalsUI();
}

function feedPet(foodType) {
  const bowlDish = document.getElementById("bowlDish");
  const petMouth = document.getElementById("petMouth");
  audio.init();

  let foodEmoji = "🥖";
  let hungerBoost = 20;
  let happyBoost = 10;
  let quote = "";

  switch (foodType) {
    case "banhmi":
      foodEmoji = "🥖";
      hungerBoost = 30;
      happyBoost = 15;
      quote = state.language === "vi" ? "Bánh Mì giòn rụm thơm ngon quá!" : "Crispy Banh Mi is delicious!";
      audio.playCrunch();
      break;
    case "trada":
      foodEmoji = "🍵";
      hungerBoost = 5;
      happyBoost = 20;
      // Trà đá clears heat discomfort!
      state.comfort = Math.min(100, state.comfort + 15);
      quote = state.language === "vi" ? "Trà Đá mát lạnh sảng khoái!" : "Refreshing iced tea chills me out!";
      audio.playChirp();
      break;
    case "boba":
      foodEmoji = "🧋";
      hungerBoost = 18;
      happyBoost = 30;
      state.energy = Math.min(100, state.energy + 20);
      quote = state.language === "vi" ? "Trà Sữa Trân Châu ngọt ngào quá!" : "Boba sweetness overload!";
      audio.playChirp();
      break;
    case "watermelon":
      foodEmoji = "🍉";
      hungerBoost = 15;
      happyBoost = 15;
      quote = state.language === "vi" ? "Dưa Hấu ngọt mát mọng nước!" : "Juicy watermelon slice!";
      audio.playCrunch();
      break;
  }

  // Animate food bowl
  if (bowlDish) {
    bowlDish.innerHTML = `<span style="font-size:1.4rem;">${foodEmoji}</span>`;
    setTimeout(() => {
      bowlDish.innerHTML = `<span class="bowl-empty-label">${I18N[state.language].bowlEmpty}</span>`;
    }, 2200);
  }

  // Open pet mouth temporarily
  if (petMouth) {
    petMouth.classList.add("mouth-open");
    setTimeout(() => petMouth.classList.remove("mouth-open"), 1200);
  }

  // Update vitals
  state.hunger = Math.min(100, state.hunger + hungerBoost);
  state.happiness = Math.min(100, state.happiness + happyBoost);
  addCoins(2); // Feeding reward
  updateVitalsUI();

  updatePetDialogue(quote);
  saveLocalData();
}

function spawnHeartParticle() {
  const overlay = document.getElementById("petFxOverlay");
  if (!overlay) return;

  const heart = document.createElement("span");
  heart.className = "fx-heart";
  heart.textContent = ["💖", "💕", "✨", "🌸"][Math.floor(Math.random() * 4)];
  heart.style.left = 20 + Math.random() * 60 + "%";
  heart.style.top = 20 + Math.random() * 40 + "%";
  overlay.appendChild(heart);

  setTimeout(() => heart.remove(), 1000);
}

function spawnSweatDrop() {
  const overlay = document.getElementById("petFxOverlay");
  if (!overlay) return;

  const sweat = document.createElement("span");
  sweat.className = "fx-sweat";
  sweat.textContent = "💧";
  sweat.style.left = 30 + Math.random() * 40 + "%";
  sweat.style.top = "10%";
  overlay.appendChild(sweat);

  setTimeout(() => sweat.remove(), 1200);
}

// ==========================================================================
// 9. DYNAMIC SKY WINDOW (HTML5 CANVAS)
// ==========================================================================
class SkyWindowRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Initialize wind particles
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        len: 8 + Math.random() * 18,
        speed: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.5
      });
    }

    this.render();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.parentElement.clientWidth || 480;
    this.canvas.height = this.canvas.parentElement.clientHeight || 240;
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const light = state.weather.light;
    const windSpeed = state.weather.windSpeed;
    const windDir = state.weather.windDir;
    const humidity = state.weather.humidity;

    // 1. Sky Gradient based on Solar Light Lux
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (light > 800) {
      // Bright sunny Saigon day
      skyGrad.addColorStop(0, "#38bdf8");
      skyGrad.addColorStop(1, "#bae6fd");
    } else if (light > 200) {
      // Golden twilight / overcast afternoon
      skyGrad.addColorStop(0, "#f59e0b");
      skyGrad.addColorStop(0.6, "#fbbf24");
      skyGrad.addColorStop(1, "#fed7aa");
    } else {
      // Night sky with stars
      skyGrad.addColorStop(0, "#090d16");
      skyGrad.addColorStop(1, "#1e1b4b");
    }

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Sun or Moon
    if (light > 200) {
      // Sun
      ctx.save();
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.35, 24, 0, Math.PI * 2);
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();
    } else {
      // Moon
      ctx.save();
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.35, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#f8fafc";
      ctx.shadowColor = "#e2e8f0";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    }

    // 3. Gia Dinh Skyline Silhouette
    ctx.fillStyle = light > 200 ? "rgba(30, 41, 59, 0.45)" : "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.rect(w * 0.1, h * 0.72, 35, h * 0.28);
    ctx.rect(w * 0.22, h * 0.65, 45, h * 0.35);
    ctx.rect(w * 0.38, h * 0.78, 30, h * 0.22);
    ctx.rect(w * 0.52, h * 0.60, 50, h * 0.40);
    ctx.rect(w * 0.70, h * 0.68, 40, h * 0.32);
    ctx.rect(w * 0.84, h * 0.74, 38, h * 0.26);
    ctx.fill();

    // 4. Moving Wind Streak / Leaf Particles
    const angleRad = (windDir * Math.PI) / 180;
    const vx = Math.sin(angleRad) * (windSpeed * 1.5 + 1);
    const vy = Math.cos(angleRad) * 0.5;

    ctx.strokeStyle = light > 200 ? "rgba(255, 255, 255, 0.4)" : "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1.5;

    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - vx * p.len * 0.3, p.y - vy * p.len * 0.3);
      ctx.stroke();

      p.x += vx * p.speed;
      p.y += vy * p.speed;

      if (p.x > w + 20) p.x = -20;
      if (p.x < -20) p.x = w + 20;
      if (p.y > h + 10) p.y = -10;
      if (p.y < -10) p.y = h + 10;
    });

    // 5. Rain Streaks on window glass if humidity > 80%
    if (humidity > 80) {
      ctx.strokeStyle = "rgba(186, 230, 253, 0.35)";
      ctx.lineWidth = 1;
      for (let r = 0; r < 12; r++) {
        const rx = (w * (r * 0.08 + 0.05)) % w;
        const ry = (Date.now() * 0.15 + r * 50) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 1, ry + 12);
        ctx.stroke();
      }
    }

    requestAnimationFrame(() => this.render());
  }
}

// ==========================================================================
// 10. ARCADE MINI-GAME: CLEAN BREEZE CATCHER
// ==========================================================================
class ArcadeGame {
  constructor() {
    this.canvas = document.getElementById("arcadeCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.modal = document.getElementById("arcadeModal");
    this.startScreen = document.getElementById("arcadeStartScreen");
    this.scoreVal = document.getElementById("gameScore");
    this.highScoreVal = document.getElementById("gameHighScore");
    this.windModVal = document.getElementById("gameWindModifier");

    this.running = false;
    this.score = 0;
    this.playerX = this.canvas.width / 2;
    this.playerWidth = 46;
    this.items = [];
    this.keys = {};

    this.bindEvents();
  }

  bindEvents() {
    const btnOpen = document.getElementById("btnOpenArcade");
    const btnClose = document.getElementById("btnCloseArcade");
    const btnStart = document.getElementById("btnStartArcadeGame");

    if (btnOpen) btnOpen.addEventListener("click", () => this.open());
    if (btnClose) btnClose.addEventListener("click", () => this.close());
    if (btnStart) btnStart.addEventListener("click", () => this.start());

    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });

    // Mouse movement inside canvas
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      this.playerX = (e.clientX - rect.left) * scaleX - this.playerWidth / 2;
    });

    // Mobile touch buttons
    const btnLeft = document.getElementById("btnMoveLeft");
    const btnRight = document.getElementById("btnMoveRight");
    if (btnLeft) {
      btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys["ArrowLeft"] = true; });
      btnLeft.addEventListener("touchend", () => { this.keys["ArrowLeft"] = false; });
    }
    if (btnRight) {
      btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys["ArrowRight"] = true; });
      btnRight.addEventListener("touchend", () => { this.keys["ArrowRight"] = false; });
    }
  }

  open() {
    this.modal.classList.add("open");
    this.highScoreVal.textContent = state.highScore;
    const windMultiplier = Math.max(0.5, state.weather.windSpeed).toFixed(1);
    this.windModVal.textContent = `${windMultiplier}x`;
    this.startScreen.style.display = "flex";
  }

  close() {
    this.running = false;
    this.modal.classList.remove("open");
  }

  start() {
    this.startScreen.style.display = "none";
    this.score = 0;
    this.scoreVal.textContent = "0";
    this.items = [];
    this.playerX = this.canvas.width / 2;
    this.running = true;
    audio.init();

    this.spawnTimer = setInterval(() => {
      if (!this.running) return;
      this.spawnItem();
    }, 600);

    this.gameLoop();
  }

  spawnItem() {
    // 60% breeze leaf, 20% sun spark, 10% banh mi, 10% pm2.5 dust
    const rand = Math.random();
    let type = "leaf";
    let points = 10;
    let emoji = "🍃";

    if (rand < 0.45) {
      type = "leaf"; points = 10; emoji = "🍃";
    } else if (rand < 0.70) {
      type = "sun"; points = 20; emoji = "☀️";
    } else if (rand < 0.85) {
      type = "banhmi"; points = 35; emoji = "🥖";
    } else {
      type = "dust"; points = -20; emoji = "🌫️";
    }

    this.items.push({
      x: 20 + Math.random() * (this.canvas.width - 40),
      y: -20,
      vy: 2.2 + Math.random() * 2.5,
      type,
      points,
      emoji,
      radius: 16
    });
  }

  gameLoop() {
    if (!this.running) {
      clearInterval(this.spawnTimer);
      return;
    }

    this.update();
    this.draw();

    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Player controls
    const speed = 7;
    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
      this.playerX -= speed;
    }
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
      this.playerX += speed;
    }

    // Clamp player within boundaries
    this.playerX = Math.max(0, Math.min(this.canvas.width - this.playerWidth, this.playerX));

    // Live wind drift factor!
    const windPush = Math.sin((state.weather.windDir * Math.PI) / 180) * (state.weather.windSpeed * 0.35);

    // Update items & collision detection
    const playerY = this.canvas.height - 38;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.vy;
      it.x += windPush;

      // Check collision with player basket
      if (
        it.y + it.radius >= playerY &&
        it.y - it.radius <= playerY + 28 &&
        it.x >= this.playerX - 10 &&
        it.x <= this.playerX + this.playerWidth + 10
      ) {
        // Collected!
        this.score = Math.max(0, this.score + it.points);
        this.scoreVal.textContent = this.score;

        if (it.points > 0) {
          audio.playChirp();
        } else {
          audio.playCrunch();
        }

        this.items.splice(i, 1);
        continue;
      }

      // Fell off screen
      if (it.y > this.canvas.height + 30) {
        this.items.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Draw Falling Items
    ctx.font = "20px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    this.items.forEach(it => {
      ctx.fillText(it.emoji, it.x, it.y);
    });

    // Draw Player (EcoPet Basket)
    const px = this.playerX;
    const py = h - 38;

    // Basket body
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.roundRect(px, py, this.playerWidth, 24, [8, 8, 12, 12]);
    ctx.fill();

    // Cute ears
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(px + 8, py - 4, 6, 0, Math.PI * 2);
    ctx.arc(px + this.playerWidth - 8, py - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Face on basket
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(px + 14, py + 10, 2.5, 0, Math.PI * 2);
    ctx.arc(px + this.playerWidth - 14, py + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  gameOver() {
    this.running = false;
    clearInterval(this.spawnTimer);

    // Convert score to coins
    const coinsEarned = Math.floor(this.score / 5);
    if (coinsEarned > 0) {
      addCoins(coinsEarned);
      audio.playCoin();
    }

    if (this.score > state.highScore) {
      state.highScore = this.score;
      saveLocalData();
    }

    const startMsg = state.language === "vi"
      ? `Trò chơi kết thúc! Bạn được ${this.score} điểm (+${coinsEarned} 🪙 EcoCoins).`
      : `Game Over! You scored ${this.score} pts (+${coinsEarned} 🪙 EcoCoins).`;

    alert(startMsg);
    this.open();
  }
}

// ==========================================================================
// 11. WARDROBE & ACCESSORIES SHOP
// ==========================================================================
function renderWardrobeGrid() {
  const grid = document.getElementById("wardrobeGrid");
  if (!grid) return;

  grid.innerHTML = "";

  // "None" / Unequip option
  const noneCard = document.createElement("div");
  noneCard.className = "wardrobe-item";
  noneCard.innerHTML = `
    <span class="item-icon">❌</span>
    <span class="item-name">${state.language === "vi" ? "Không Mặc" : "None"}</span>
    <button class="btn-item-action ${!state.equippedHat ? 'btn-item-equipped' : 'btn-item-equip'}">
      ${!state.equippedHat ? (state.language === "vi" ? "Đang Mặc" : "Equipped") : (state.language === "vi" ? "Mặc" : "Equip")}
    </button>
  `;
  noneCard.querySelector("button").addEventListener("click", () => {
    state.equippedHat = null;
    applyEquippedHat();
    renderWardrobeGrid();
    saveLocalData();
  });
  grid.appendChild(noneCard);

  // Catalog items
  WARDROBE_ITEMS.forEach(item => {
    const isOwned = state.inventory.includes(item.id);
    const isEquipped = state.equippedHat === item.id;

    const card = document.createElement("div");
    card.className = "wardrobe-item";

    let actionBtnHtml = "";
    if (isEquipped) {
      actionBtnHtml = `<button class="btn-item-action btn-item-equipped">${state.language === "vi" ? "Đang Mặc" : "Equipped"}</button>`;
    } else if (isOwned) {
      actionBtnHtml = `<button class="btn-item-action btn-item-equip">${state.language === "vi" ? "Mặc" : "Equip"}</button>`;
    } else {
      actionBtnHtml = `<button class="btn-item-action btn-item-buy">${item.price} 🪙</button>`;
    }

    card.innerHTML = `
      <span class="item-icon">${item.icon}</span>
      <span class="item-name">${item.name}</span>
      <span class="item-price">${isOwned ? 'Đã sở hữu' : item.price + ' EcoCoins'}</span>
      ${actionBtnHtml}
    `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", () => {
      if (isEquipped) return;
      if (isOwned) {
        state.equippedHat = item.id;
        applyEquippedHat();
        renderWardrobeGrid();
        saveLocalData();
      } else {
        // Buy
        if (state.coins >= item.price) {
          state.coins -= item.price;
          state.inventory.push(item.id);
          state.equippedHat = item.id;
          audio.playCoin();
          updateWalletUI();
          applyEquippedHat();
          renderWardrobeGrid();
          saveLocalData();
        } else {
          alert(state.language === "vi" ? "Bạn chưa đủ EcoCoins! Hãy nựng bé hoặc chơi mini-game để kiếm thêm." : "Not enough EcoCoins! Pet your critter or play mini-games to earn more.");
        }
      }
    });

    grid.appendChild(card);
  });
}

function applyEquippedHat() {
  const hatSlot = document.getElementById("petHatSlot");
  if (!hatSlot) return;

  if (!state.equippedHat) {
    hatSlot.innerHTML = "";
    return;
  }

  const item = WARDROBE_ITEMS.find(i => i.id === state.equippedHat);
  if (item) {
    hatSlot.innerHTML = item.icon;
  }
}

// ==========================================================================
// 12. UI CONTROLLER & EVENT LISTENERS
// ==========================================================================
function updateWalletUI() {
  const coinBalance = document.getElementById("coinBalance");
  if (coinBalance) coinBalance.textContent = state.coins;
}

function addCoins(amount) {
  state.coins += amount;
  updateWalletUI();
  saveLocalData();
}

function updateVitalsUI() {
  const hungerVal = document.getElementById("hungerVal");
  const hungerBar = document.getElementById("hungerBar");
  const happyVal = document.getElementById("happyVal");
  const happyBar = document.getElementById("happyBar");
  const energyVal = document.getElementById("energyVal");
  const energyBar = document.getElementById("energyBar");
  const comfortVal = document.getElementById("comfortVal");
  const comfortBar = document.getElementById("comfortBar");

  if (hungerVal && hungerBar) {
    hungerVal.textContent = Math.round(state.hunger) + "%";
    hungerBar.style.width = Math.round(state.hunger) + "%";
  }
  if (happyVal && happyBar) {
    happyVal.textContent = Math.round(state.happiness) + "%";
    happyBar.style.width = Math.round(state.happiness) + "%";
  }
  if (energyVal && energyBar) {
    energyVal.textContent = Math.round(state.energy) + "%";
    energyBar.style.width = Math.round(state.energy) + "%";
  }
  if (comfortVal && comfortBar) {
    comfortVal.textContent = Math.round(state.comfort) + "%";
    comfortBar.style.width = Math.round(state.comfort) + "%";
  }
}

function updateTelemetryDrawerUI() {
  const w = state.weather;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("valWindSpeed", w.windSpeed.toFixed(2));
  set("valWindDir", Math.round(w.windDir));
  set("valTemp", w.temp.toFixed(1));
  set("valPressure", w.pressure.toFixed(1));
  set("valLight", Math.round(w.light));
  set("valHumidity", w.humidity.toFixed(1));
  set("valNoise", w.noise.toFixed(1));
  set("valPM25", Math.round(w.pm25));

  const lastTag = document.getElementById("lastUpdatedTag");
  if (lastTag) {
    lastTag.textContent = `${state.language === "vi" ? "Cập nhật:" : "Updated:"} ${w.updatedAt.toLocaleTimeString()}`;
  }
}

function initEventHandlers() {
  // Sound Mute Toggle
  const btnSound = document.getElementById("btnSoundToggle");
  const soundIcon = document.getElementById("soundIcon");
  if (btnSound && soundIcon) {
    btnSound.addEventListener("click", () => {
      state.soundMuted = !state.soundMuted;
      soundIcon.textContent = state.soundMuted ? "🔇" : "🔊";
      if (!state.soundMuted) audio.playChirp();
    });
  }

  // Language Toggle
  const btnLang = document.getElementById("btnLangToggle");
  if (btnLang) {
    btnLang.addEventListener("click", () => {
      state.language = state.language === "vi" ? "en" : "vi";
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (I18N[state.language][key]) {
          el.textContent = I18N[state.language][key];
        }
      });
      renderWardrobeGrid();
      updatePetDialogue();
      saveLocalData();
    });
  }

  // Pet body click & drag interactions
  const petBodyWrapper = document.getElementById("petBodyWrapper");
  if (petBodyWrapper) {
    petBodyWrapper.addEventListener("click", triggerPet);
    petBodyWrapper.addEventListener("dblclick", triggerTickle);
  }

  const btnPetDirect = document.getElementById("btnPetDirect");
  if (btnPetDirect) {
    btnPetDirect.addEventListener("click", triggerPet);
  }

  // Furniture Click Interactivity
  const electricFan = document.getElementById("electricFan");
  if (electricFan) {
    electricFan.addEventListener("click", () => {
      state.fanManualOverride = !state.fanSpinning;
      applyWeatherToEnvironment();
      audio.playChirp();
    });
  }

  const pottedPlant = document.getElementById("pottedPlant");
  if (pottedPlant) {
    pottedPlant.addEventListener("click", () => {
      spawnHeartParticle();
      audio.playChirp();
      updatePetDialogue(state.language === "vi" ? "Cây trầu bà cảm ơn bạn đã tưới nước!" : "The houseplant thanks you for watering!");
    });
  }

  const retroSpeaker = document.getElementById("retroSpeaker");
  if (retroSpeaker) {
    retroSpeaker.addEventListener("click", () => {
      audio.playLoFiBeat();
      updatePetDialogue(state.language === "vi" ? "Giai điệu vi khí hậu thật chill!" : "Chill microclimate Lo-Fi beats!");
    });
  }

  // Food buttons
  document.querySelectorAll(".food-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const foodType = btn.getAttribute("data-food");
      feedPet(foodType);
    });
  });

  // Wardrobe Modal
  const btnOpenWardrobe = document.getElementById("btnOpenWardrobe");
  const btnCloseWardrobe = document.getElementById("btnCloseWardrobe");
  const wardrobeModal = document.getElementById("wardrobeModal");

  if (btnOpenWardrobe && wardrobeModal) {
    btnOpenWardrobe.addEventListener("click", () => {
      renderWardrobeGrid();
      wardrobeModal.classList.add("open");
    });
  }
  if (btnCloseWardrobe && wardrobeModal) {
    btnCloseWardrobe.addEventListener("click", () => {
      wardrobeModal.classList.remove("open");
    });
  }

  // Telemetry Drawer
  const btnTelemetryToggle = document.getElementById("btnTelemetryToggle");
  const btnCloseTelemetry = document.getElementById("btnCloseTelemetry");
  const telemetryDrawer = document.getElementById("telemetryDrawer");

  if (btnTelemetryToggle && telemetryDrawer) {
    btnTelemetryToggle.addEventListener("click", () => {
      telemetryDrawer.classList.toggle("open");
    });
  }
  if (btnCloseTelemetry && telemetryDrawer) {
    btnCloseTelemetry.addEventListener("click", () => {
      telemetryDrawer.classList.remove("open");
    });
  }

  // Live vs God Mode Toggles
  const btnLiveMode = document.getElementById("btnLiveMode");
  const btnGodMode = document.getElementById("btnGodMode");
  const btnCloseGodMode = document.getElementById("btnCloseGodMode");
  const godmodePanel = document.getElementById("godmodePanel");

  if (btnLiveMode && btnGodMode && godmodePanel) {
    btnLiveMode.addEventListener("click", () => {
      state.isGodMode = false;
      btnLiveMode.classList.add("active");
      btnGodMode.classList.remove("active");
      godmodePanel.classList.remove("open");
      fetchThingSpeakData();
    });

    btnGodMode.addEventListener("click", () => {
      state.isGodMode = true;
      btnGodMode.classList.add("active");
      btnLiveMode.classList.remove("active");
      godmodePanel.classList.add("open");
      syncGodModeSlidersToState();
    });

    if (btnCloseGodMode) {
      btnCloseGodMode.addEventListener("click", () => {
        godmodePanel.classList.remove("open");
      });
    }
  }

  initGodModeSliders();
}

// ==========================================================================
// 13. GOD MODE / WEATHER SANDBOX SLIDERS
// ==========================================================================
function syncGodModeSlidersToState() {
  const w = state.weather;
  const setVal = (id, val) => {
    const slider = document.getElementById(id);
    if (slider) slider.value = val;
  };

  setVal("godSliderWind", w.windSpeed);
  setVal("godSliderDir", w.windDir);
  setVal("godSliderTemp", w.temp);
  setVal("godSliderPressure", w.pressure);
  setVal("godSliderLight", w.light);
  setVal("godSliderHumidity", w.humidity);
  setVal("godSliderNoise", w.noise);
  setVal("godSliderPM25", w.pm25);

  updateGodModeLabels();
}

function updateGodModeLabels() {
  const w = state.weather;
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt("godValWind", `${w.windSpeed.toFixed(1)} m/s`);
  setTxt("godValDir", `${Math.round(w.windDir)}°`);
  setTxt("godValTemp", `${w.temp.toFixed(1)} °C`);
  setTxt("godValPressure", `${w.pressure.toFixed(1)} kPa`);
  setTxt("godValLight", `${Math.round(w.light)} lux`);
  setTxt("godValHumidity", `${Math.round(w.humidity)} %`);
  setTxt("godValNoise", `${Math.round(w.noise)} dB`);
  setTxt("godValPM25", `${Math.round(w.pm25)} µg/m³`);
}

function initGodModeSliders() {
  const bindSlider = (id, key, parseFn) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", (e) => {
        state.weather[key] = parseFn(e.target.value);
        updateGodModeLabels();
        applyWeatherToEnvironment();
        updateTelemetryDrawerUI();
      });
    }
  };

  bindSlider("godSliderWind", "windSpeed", parseFloat);
  bindSlider("godSliderDir", "windDir", parseFloat);
  bindSlider("godSliderTemp", "temp", parseFloat);
  bindSlider("godSliderPressure", "pressure", parseFloat);
  bindSlider("godSliderLight", "light", parseFloat);
  bindSlider("godSliderHumidity", "humidity", parseFloat);
  bindSlider("godSliderNoise", "noise", parseFloat);
  bindSlider("godSliderPM25", "pm25", parseFloat);

  // Preset buttons
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-preset");
      if (p === "saigon-heat") {
        state.weather.temp = 38.5;
        state.weather.light = 2400;
        state.weather.humidity = 58;
        state.weather.windSpeed = 1.0;
      } else if (p === "typhoon") {
        state.weather.windSpeed = 16.5;
        state.weather.windDir = 240;
        state.weather.pressure = 96.5;
        state.weather.humidity = 95;
      } else if (p === "smog") {
        state.weather.pm25 = 165;
        state.weather.humidity = 82;
        state.weather.windSpeed = 0.3;
      } else if (p === "cozy-night") {
        state.weather.light = 5;
        state.weather.temp = 25.0;
        state.weather.noise = 42;
        state.weather.windSpeed = 1.2;
      }
      syncGodModeSlidersToState();
      applyWeatherToEnvironment();
      updateTelemetryDrawerUI();
    });
  });
}

// ==========================================================================
// 14. APPLICATION BOOTSTRAP
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadLocalData();
  updateWalletUI();
  updateVitalsUI();
  applyEquippedHat();
  initEventHandlers();

  // Initialize Sky Canvas & Arcade Game
  new SkyWindowRenderer("skyCanvas");
  window.arcadeGame = new ArcadeGame();

  // Initial Fetch from ThingSpeak
  fetchThingSpeakData();

  // Setup periodic polling & countdown
  setInterval(() => {
    if (!state.isGodMode) {
      state.countdown--;
      const countdownTag = document.getElementById("refreshCountdownTag");
      if (countdownTag) countdownTag.textContent = `${state.language === "vi" ? "Đếm ngược:" : "Next poll:"} ${state.countdown}s`;

      if (state.countdown <= 0) {
        state.countdown = 20;
        fetchThingSpeakData();
      }
    }
  }, 1000);

  // Slow biological decay for vitals (hunger, energy)
  setInterval(() => {
    state.hunger = Math.max(10, state.hunger - 0.2);
    state.energy = Math.max(10, state.energy - 0.15);
    state.happiness = Math.max(10, state.happiness - 0.1);
    updateVitalsUI();
  }, 5000);

  // Periodic random thought bubble
  setInterval(() => {
    updatePetDialogue();
  }, 12000);
});
