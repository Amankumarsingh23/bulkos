// Canvas-based share card generator — client-only
// Output: 1080 × 1920 PNG blob (Instagram story format)

export interface ShareCardData {
  userName: string;
  weeksOnProgram: number;
  weightChange: number | null;
  currentWeight: number | null;
  startWeight: number | null;
  targetWeight: number | null;
  bestLiftName: string | null;
  bestLiftKg: number | null;
  weekGrade: "A" | "B" | "C" | "D" | "F";
  weekScore: number;
  progressPhotoUrl: string | null;
  includePhoto: boolean;
}

// ── Canvas constants ───────────────────────────────────────────────────────────

const W = 1080;
const H = 1920;
const PAD = 88; // horizontal padding
const CX = W / 2;

// ── Palette ────────────────────────────────────────────────────────────────────

const GOLD       = "#C9A96E";
const GOLD_LT    = "#E8D5A8";
const GOLD_DK    = "#A07B45";
const WHITE      = "#FFFFFF";
const IVORY      = "#F5F0E6";
const WARM_GRAY  = "#7A6E68";
const SAGE       = "#5B8A5B";
const TERRA      = "#C4826A";

const GRADE_COLOR: Record<string, string> = {
  A: GOLD, B: SAGE, C: WARM_GRAY, D: TERRA, F: "#B04040",
};

// ── Font helpers ───────────────────────────────────────────────────────────────

const F_DISPLAY  = "'Playfair Display', Georgia, serif";
const F_SANS     = "'DM Sans', system-ui, sans-serif";

function font(size: number, weight: number | string, family: string): string {
  return `${weight} ${size}px ${family}`;
}

// ── Image loader ───────────────────────────────────────────────────────────────

async function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    // Supabase storage requires crossOrigin so add a cache-bust for first load
    img.src = url.includes("?") ? url : `${url}?t=${Date.now()}`;
  });
}

// Cover-crop an image to fit a destination rect
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number
) {
  const ia = img.width / img.height;
  const da = dw / dh;
  let sx, sy, sw, sh;
  if (ia > da) {
    sh = img.height; sw = sh * da;
    sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / da;
    sx = 0; sy = (img.height - sh) / 4; // slight top bias so face is visible
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ── Drawing primitives ─────────────────────────────────────────────────────────

function goldRule(ctx: CanvasRenderingContext2D, y: number, x1 = PAD, x2 = W - PAD, alpha = 0.65) {
  const g = ctx.createLinearGradient(x1, y, x2, y);
  g.addColorStop(0,    `rgba(201,169,110,0)`);
  g.addColorStop(0.15, `rgba(201,169,110,${alpha})`);
  g.addColorStop(0.85, `rgba(201,169,110,${alpha})`);
  g.addColorStop(1,    `rgba(201,169,110,0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x1, y, x2 - x1, 1.5);
}

function goldGradText(ctx: CanvasRenderingContext2D, x: number, y: number): CanvasGradient {
  const g = ctx.createLinearGradient(x, y - 50, x, y + 4);
  g.addColorStop(0,    GOLD_LT);
  g.addColorStop(0.45, GOLD);
  g.addColorStop(0.75, GOLD_DK);
  g.addColorStop(1,    "#D4B072");
  return g;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Section: background ────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  // Deep warm radial gradient — rich center, near-black edges
  const bg = ctx.createRadialGradient(CX, 860, 0, CX, 860, 1300);
  bg.addColorStop(0,   "#271408");
  bg.addColorStop(0.4, "#160B05");
  bg.addColorStop(1,   "#080402");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Film grain — very subtle warm noise
  const imgData = ctx.getImageData(0, 0, W, H);
  const px = imgData.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    px[i]   = Math.max(0, Math.min(255, px[i]   + n));
    px[i+1] = Math.max(0, Math.min(255, px[i+1] + n * 0.82));
    px[i+2] = Math.max(0, Math.min(255, px[i+2] + n * 0.6));
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle vignette — slightly darker corners
  const vig = ctx.createRadialGradient(CX, H / 2, H * 0.28, CX, H / 2, H * 0.88);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// ── Section: header ────────────────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, weeks: number) {
  // "Bulk" in white
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(54, 700, F_SANS);
  ctx.fillStyle    = WHITE;
  ctx.fillText("Bulk", PAD, 128);
  const bulkW = ctx.measureText("Bulk").width;

  // "OS" in gold gradient
  ctx.fillStyle = goldGradText(ctx, PAD + bulkW + 4, 128);
  ctx.fillText("OS", PAD + bulkW, 128);

  // Week counter — top right, muted
  ctx.textAlign = "right";
  ctx.font      = font(27, 400, F_SANS);
  ctx.fillStyle = WARM_GRAY;
  ctx.fillText(`Week ${weeks}`, W - PAD, 128);

  goldRule(ctx, 158);
}

// ── Section: photo hero ────────────────────────────────────────────────────────

function drawPhotoHero(ctx: CanvasRenderingContext2D, img: HTMLImageElement, weeks: number) {
  // Photo — full width, top section
  const PHOTO_H = 760;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, PHOTO_H);
  ctx.clip();
  drawCover(ctx, img, 0, 0, W, PHOTO_H);
  ctx.restore();

  // Gradient overlay — photo fades into dark bg
  const overlay = ctx.createLinearGradient(0, PHOTO_H * 0.45, 0, PHOTO_H);
  overlay.addColorStop(0, "rgba(8,4,2,0)");
  overlay.addColorStop(0.55, "rgba(8,4,2,0.7)");
  overlay.addColorStop(1, "rgba(8,4,2,0.97)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, PHOTO_H);

  // Re-draw header on top of photo (header was drawn before this)
  drawHeader(ctx, weeks);

  // Week number overlaid at bottom of photo zone
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor  = "rgba(0,0,0,0.9)";
  ctx.shadowBlur   = 40;
  ctx.fillStyle    = WHITE;
  ctx.font         = font(200, 700, F_DISPLAY);
  ctx.fillText(String(weeks), CX, PHOTO_H - 24);
  ctx.restore();

  // "WEEKS" label
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(38, 600, F_SANS);
  ctx.letterSpacing = "8px";
  ctx.fillStyle    = goldGradText(ctx, CX, PHOTO_H + 50);
  ctx.fillText("WEEKS", CX, PHOTO_H + 50);
  ctx.letterSpacing = "0px";
}

// ── Section: data hero (no photo) ─────────────────────────────────────────────

function drawDataHero(ctx: CanvasRenderingContext2D, weeks: number) {
  const NUM_Y  = 700;
  const GLOW_Y = 560;

  // Glow halo behind the number
  const glow = ctx.createRadialGradient(CX, GLOW_Y, 0, CX, GLOW_Y, 440);
  glow.addColorStop(0, "rgba(201,169,110,0.11)");
  glow.addColorStop(0.5, "rgba(201,169,110,0.04)");
  glow.addColorStop(1, "rgba(201,169,110,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Thin decorative ring behind number
  ctx.save();
  ctx.strokeStyle = "rgba(201,169,110,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, GLOW_Y, 390, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, GLOW_Y, 310, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // The week number — massive, white, with gold aura
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor  = "rgba(201,169,110,0.45)";
  ctx.shadowBlur   = 90;
  ctx.fillStyle    = WHITE;
  ctx.font         = font(320, 700, F_DISPLAY);
  ctx.fillText(String(weeks), CX, NUM_Y);
  ctx.restore();

  // "WEEKS" — gold gradient, letter-spaced
  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(42, 700, F_SANS);
  ctx.letterSpacing = "10px";
  ctx.fillStyle    = goldGradText(ctx, CX, NUM_Y + 68);
  ctx.fillText("WEEKS", CX, NUM_Y + 68);
  ctx.letterSpacing = "0px";
  ctx.restore();

  // "ON PROGRAM" — muted
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(26, 400, F_SANS);
  ctx.letterSpacing = "5px";
  ctx.fillStyle    = WARM_GRAY;
  ctx.fillText("ON PROGRAM", CX, NUM_Y + 118);
  ctx.letterSpacing = "0px";
}

// ── Section: stats row ─────────────────────────────────────────────────────────

function drawStats(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  baseY: number
) {
  const COL_W = (W - PAD * 2) / 3; // 920/3 ≈ 307
  const CENTERS = [PAD + COL_W * 0.5, CX, W - PAD - COL_W * 0.5];
  const VAL_Y   = baseY + 90;
  const LBL_Y   = baseY + 150;

  // Top rule
  goldRule(ctx, baseY - 10);

  // Column dividers
  ctx.fillStyle = "rgba(201,169,110,0.18)";
  ctx.fillRect(PAD + COL_W, baseY - 10, 1, 190);
  ctx.fillRect(PAD + COL_W * 2, baseY - 10, 1, 190);

  // ── Column 1: Weight change ─────────────────────────────────────────────────
  const wChange = data.weightChange;
  const wColor  = wChange === null ? IVORY : wChange >= 0 ? "#7DC47D" : TERRA;
  const wText   = wChange !== null
    ? `${wChange >= 0 ? "+" : ""}${wChange.toFixed(1)}`
    : data.currentWeight ? data.currentWeight.toFixed(1) : "—";
  const wSub    = wChange !== null
    ? (wChange >= 0 ? "GAINED" : "LOST")
    : "CURRENT";

  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(76, 700, F_DISPLAY);
  ctx.fillStyle    = wColor;
  ctx.shadowColor  = wChange !== null && wChange >= 0 ? "rgba(100,180,100,0.3)" : "rgba(0,0,0,0)";
  ctx.shadowBlur   = 30;
  ctx.fillText(wText, CENTERS[0], VAL_Y);
  ctx.restore();

  ctx.textAlign    = "center";
  ctx.font         = font(24, 400, F_SANS);
  ctx.fillStyle    = WARM_GRAY;
  ctx.letterSpacing = "0px";
  ctx.fillText("kg", CENTERS[0] + ctx.measureText(wText).width * 0.5 + 14, VAL_Y - 12);
  ctx.letterSpacing = "3px";
  ctx.fillStyle    = WARM_GRAY;
  ctx.font         = font(20, 600, F_SANS);
  ctx.fillText(wSub, CENTERS[0], LBL_Y);
  ctx.letterSpacing = "0px";

  // ── Column 2: Best lift ─────────────────────────────────────────────────────
  const liftText = data.bestLiftKg ? String(Math.round(data.bestLiftKg)) : "—";

  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(76, 700, F_DISPLAY);
  ctx.fillStyle    = WHITE;
  ctx.shadowColor  = "rgba(201,169,110,0.25)";
  ctx.shadowBlur   = 30;
  ctx.fillText(liftText, CENTERS[1], VAL_Y);
  ctx.restore();

  if (data.bestLiftKg) {
    ctx.textAlign = "center";
    ctx.font      = font(24, 400, F_SANS);
    ctx.fillStyle = WARM_GRAY;
    ctx.fillText("kg", CENTERS[1] + ctx.measureText(liftText).width * 0.5 + 14, VAL_Y - 12);
  }

  // Exercise name in gold below value
  if (data.bestLiftName) {
    ctx.textAlign    = "center";
    ctx.font         = font(22, 600, F_SANS);
    ctx.fillStyle    = goldGradText(ctx, CENTERS[1], VAL_Y + 16);
    ctx.fillText(data.bestLiftName.toUpperCase().slice(0, 14), CENTERS[1], VAL_Y + 20);
  }

  ctx.textAlign    = "center";
  ctx.font         = font(20, 600, F_SANS);
  ctx.letterSpacing = "3px";
  ctx.fillStyle    = WARM_GRAY;
  ctx.fillText("BEST LIFT", CENTERS[1], LBL_Y);
  ctx.letterSpacing = "0px";

  // ── Column 3: Grade ─────────────────────────────────────────────────────────
  const gradeColor = GRADE_COLOR[data.weekGrade] ?? GOLD;

  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(88, 700, F_DISPLAY);
  ctx.fillStyle    = gradeColor;
  ctx.shadowColor  = gradeColor + "55";
  ctx.shadowBlur   = 40;
  ctx.fillText(data.weekGrade, CENTERS[2], VAL_Y);
  ctx.restore();

  ctx.textAlign    = "center";
  ctx.font         = font(24, 400, F_SANS);
  ctx.fillStyle    = WARM_GRAY + "99";
  ctx.fillText(`${data.weekScore}/100`, CENTERS[2], VAL_Y + 30);

  ctx.textAlign    = "center";
  ctx.font         = font(20, 600, F_SANS);
  ctx.letterSpacing = "3px";
  ctx.fillStyle    = WARM_GRAY;
  ctx.fillText("WEEK GRADE", CENTERS[2], LBL_Y);
  ctx.letterSpacing = "0px";

  // Bottom rule
  goldRule(ctx, baseY + 192);
}

// ── Section: goal progress ─────────────────────────────────────────────────────

function drawGoal(ctx: CanvasRenderingContext2D, data: ShareCardData, y: number) {
  if (!data.startWeight || !data.currentWeight || !data.targetWeight) return;

  const start = data.startWeight;
  const cur   = data.currentWeight;
  const goal  = data.targetWeight;

  const progress = Math.min(1, Math.max(0, (cur - start) / (goal - start || 1)));
  const BAR_X   = PAD;
  const BAR_W   = W - PAD * 2;
  const BAR_H   = 7;
  const BAR_R   = BAR_H / 2;

  // Label
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(22, 600, F_SANS);
  ctx.letterSpacing = "3px";
  ctx.fillStyle    = WARM_GRAY;
  ctx.fillText("GOAL PROGRESS", PAD, y);
  ctx.letterSpacing = "0px";

  // Weight labels
  const lbY = y + 44;
  ctx.font      = font(24, 400, F_SANS);
  ctx.fillStyle = WARM_GRAY;
  ctx.textAlign = "left";  ctx.fillText(`${start.toFixed(1)} kg`, PAD, lbY);
  ctx.textAlign = "center"; ctx.fillStyle = IVORY;
  ctx.font      = font(26, 700, F_SANS);
  ctx.fillText(`${cur.toFixed(1)} kg`, CX, lbY);
  ctx.textAlign = "right"; ctx.font = font(24, 400, F_SANS); ctx.fillStyle = WARM_GRAY;
  ctx.fillText(`${goal.toFixed(1)} kg`, W - PAD, lbY);

  // Bar track
  const barY = y + 64;
  roundedRect(ctx, BAR_X, barY, BAR_W, BAR_H, BAR_R);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  // Bar fill — gold gradient
  if (progress > 0.01) {
    const fillW = BAR_W * progress;
    const fillGrad = ctx.createLinearGradient(BAR_X, barY, BAR_X + fillW, barY);
    fillGrad.addColorStop(0,   GOLD_DK);
    fillGrad.addColorStop(0.6, GOLD);
    fillGrad.addColorStop(1,   GOLD_LT);
    roundedRect(ctx, BAR_X, barY, fillW, BAR_H, BAR_R);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Current marker dot
    const dotX = BAR_X + fillW;
    const dotY = barY + BAR_H / 2;
    ctx.save();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_LT;
    ctx.fill();
    ctx.restore();
  }

  // Pct label under bar
  ctx.textAlign    = "right";
  ctx.font         = font(22, 600, F_SANS);
  ctx.fillStyle    = GOLD;
  ctx.fillText(`${Math.round(progress * 100)}% to goal`, W - PAD, barY + BAR_H + 30);
}

// ── Section: quote line ────────────────────────────────────────────────────────

function drawQuote(ctx: CanvasRenderingContext2D, weeks: number, weightChange: number | null, y: number) {
  let line: string;
  if (weightChange !== null && weightChange >= 3) {
    line = `${weightChange.toFixed(1)} kg and counting.`;
  } else if (weeks >= 24) {
    line = "This is a lifestyle.";
  } else if (weeks >= 12) {
    line = "Three months of discipline.";
  } else if (weeks >= 8) {
    line = "The results are real.";
  } else if (weeks >= 4) {
    line = "Building the foundation.";
  } else {
    line = "Every journey starts with one log.";
  }

  ctx.save();
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = `italic ${font(34, 300, F_DISPLAY)}`;
  ctx.fillStyle    = "rgba(245,240,230,0.55)";
  ctx.fillText(line, CX, y);
  ctx.restore();

  // Three gold dots below
  const DOT_Y = y + 48;
  const DOT_GAP = 22;
  [CX - DOT_GAP, CX, CX + DOT_GAP].forEach((dx, i) => {
    ctx.beginPath();
    ctx.arc(dx, DOT_Y, i === 1 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? GOLD : GOLD_DK;
    ctx.fill();
  });
}

// ── Section: footer ────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D) {
  const RULE_Y = 1768;
  goldRule(ctx, RULE_Y);

  // "Made with " plain + "BulkOS" in gold
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font         = font(28, 400, F_SANS);
  ctx.fillStyle    = WARM_GRAY;
  const prefix     = "Made with ";
  const brand      = "BulkOS";
  const totalW     = ctx.measureText(prefix + brand).width;
  const startX     = CX - totalW / 2;
  ctx.textAlign    = "left";
  ctx.fillText(prefix, startX, 1824);
  ctx.fillStyle    = goldGradText(ctx, startX + ctx.measureText(prefix).width, 1824);
  ctx.fillText(brand, startX + ctx.measureText(prefix).width, 1824);

  // Tagline
  ctx.textAlign    = "center";
  ctx.font         = font(20, 400, F_SANS);
  ctx.letterSpacing = "4px";
  ctx.fillStyle    = "rgba(138,118,100,0.55)";
  ctx.fillText("TRACK · ANALYSE · GROW", CX, 1870);
  ctx.letterSpacing = "0px";
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready;

  const canvas  = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext("2d")!;

  // 1 — Background + grain + vignette
  drawBackground(ctx);

  let statsBaseY = 860;

  // 2 — Hero zone
  const photoImg =
    data.includePhoto && data.progressPhotoUrl
      ? await loadImg(data.progressPhotoUrl)
      : null;

  if (photoImg) {
    // Photo hero — header drawn inside (after photo)
    drawPhotoHero(ctx, photoImg, data.weeksOnProgram);
    statsBaseY = 890;
  } else {
    // Data hero — header drawn first
    drawHeader(ctx, data.weeksOnProgram);
    drawDataHero(ctx, data.weeksOnProgram);
  }

  // 3 — Stats row
  drawStats(ctx, data, statsBaseY);

  // 4 — Goal bar
  drawGoal(ctx, data, statsBaseY + 240);

  // 5 — Quote
  drawQuote(ctx, data.weeksOnProgram, data.weightChange, statsBaseY + 420);

  // 6 — Footer
  drawFooter(ctx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      1.0
    );
  });
}
