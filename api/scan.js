import { limited, send, readBody, askClaude, parseJSON } from '../lib/claude.js';

const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function validate(d) {
  if (!d || typeof d !== 'object') return null;
  const steps = Array.isArray(d.steps) ? d.steps.map(s => str(s, 200)).filter(Boolean).slice(0, 6) : [];
  const out = {
    commonName: str(d.commonName, 60),
    species: str(d.species, 80),
    confidence: ['High', 'Medium', 'Low'].includes(d.confidence) ? d.confidence : 'Low',
    healthy: d.healthy === true,
    diagnosis: str(d.diagnosis, 80),
    explanation: str(d.explanation, 500),
    steps,
    wateringIntervalDays: Math.min(60, Math.max(1, Math.round(Number(d.wateringIntervalDays)) || 7)),
    light: str(d.light, 60),
    humidity: str(d.humidity, 60),
    soilMix: str(d.soilMix, 100),
    soilCheckEveryDays: Math.min(30, Math.max(1, Math.round(Number(d.soilCheckEveryDays)) || 4)),
    sunEveryDays: Math.min(30, Math.max(0, Math.round(Number(d.sunEveryDays)) || 0)),
    firstTask: ['soil', 'sun', 'none'].includes(d.firstTask) ? d.firstTask : 'none'
  };
  return out.commonName && out.diagnosis && out.explanation && steps.length ? out : null;
}

const SYSTEM = `You identify houseplants from a photo and assess their health for a plant care app.
Reply with ONE JSON object and nothing else, using exactly these keys:
commonName (string), species (string, Latin name), confidence ("High" | "Medium" | "Low"),
healthy (boolean), diagnosis (short label, e.g. "Healthy" or "Underwatered"), explanation (1-3 plain sentences saying what you can see),
steps (array of 2-5 short action steps), wateringIntervalDays (integer, typical days between waterings indoors), light (short phrase for the light it needs),
humidity (short phrase), soilMix (recommended potting mix, short phrase), soilCheckEveryDays (integer, how often to check soil moisture),
sunEveryDays (integer: how often to move it to a brighter spot or rotate toward light; 0 if it needs no moving),
firstTask ("soil" if the user should check soil moisture first, "sun" if the plant should move to brighter light, otherwise "none").
If the image is not a plant, set confidence "Low", healthy false, diagnosis "No plant found" and explain briefly. Be honest about uncertainty.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (process.env.AI_FEATURES !== 'on') return send(res, 403, { error: 'premium_only' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 503, { error: 'no_key' });
  if (limited(req, 'scan', 8)) return send(res, 429, { error: 'rate_limited' });
  try {
    const body = await readBody(req, 2_800_000);
    const image = String(body.image || '');
    if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length > 2_000_000) return send(res, 400, { error: 'bad_image' });
    const mediaType = ['image/jpeg', 'image/png', 'image/webp'].includes(body.mediaType) ? body.mediaType : 'image/jpeg';
    const text = await askClaude({
      system: SYSTEM,
      maxTokens: 800,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: 'Identify this plant and assess its health. Return only the JSON object.' }
      ] }]
    });
    const result = validate(parseJSON(text));
    if (!result) return send(res, 502, { error: 'bad_response' });
    send(res, 200, result);
  } catch (e) {
    send(res, e.status || 500, { error: e.code || 'failed' });
  }
}
