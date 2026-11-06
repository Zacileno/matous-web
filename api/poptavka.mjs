/* Příjem poptávky z formuláře. Vercel z tohoto souboru udělá adresu /api/poptavka.
   Údaje se znovu zkontrolují tady na serveru a přes Resend se pošlou jako
   upozornění na pece@koupelny-syrovy.cz. Klíč RESEND_API_KEY je jen ve Vercelu
   (Production), do prohlížeče se nikdy nedostane. */

const ODESILATEL = 'Matouš Syrový web <poptavky@syrovygroup.cz>';
const PRIJEMCE = 'pece@koupelny-syrovy.cz';
const VZOR_EMAILU = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITY = { jmeno: 200, email: 254, firma: 200, zprava: 5000 };

const json = (data, status = 200) => Response.json(data, { status });
const text = (hodnota) => (typeof hodnota === 'string' ? hodnota.trim() : '');

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Neplatná data.' }, 400);
  }
  if (typeof data !== 'object' || data === null) {
    return json({ error: 'Neplatná data.' }, 400);
  }

  // Past na roboty: člověk toto skryté pole nevyplní. Robotovi se tváříme, že prošel.
  if (text(data.website)) return json({ ok: true });

  const poptavka = {
    jmeno: text(data.jmeno),
    email: text(data.email),
    firma: text(data.firma),
    zprava: text(data.zprava),
  };

  const prekroceno = Object.keys(LIMITY).some((klic) => poptavka[klic].length > LIMITY[klic]);
  if (prekroceno || !poptavka.jmeno || !VZOR_EMAILU.test(poptavka.email) || poptavka.zprava.length < 10) {
    return json({ error: 'Zkontrolujte prosím vyplněné údaje.' }, 400);
  }

  const klic = process.env.RESEND_API_KEY;
  if (!klic) {
    console.error('[poptavka] chybí RESEND_API_KEY');
    return json({ error: 'Odeslání se nepovedlo.' }, 500);
  }

  const odpoved = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${klic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: ODESILATEL,
      to: [PRIJEMCE],
      reply_to: poptavka.email,
      subject: `Přišla poptávka z webu syrovygroup.cz: ${poptavka.jmeno}`,
      text: [
        'Přišla poptávka z osobního webu Matouše Syrového (syrovygroup.cz).',
        '',
        `Jméno: ${poptavka.jmeno}`,
        `E-mail: ${poptavka.email}`,
        `Firma a obor: ${poptavka.firma || '(nevyplněno)'}`,
        '',
        'Zpráva:',
        poptavka.zprava,
        '',
        'Na zákazníka se dostanete tlačítkem Odpovědět.',
      ].join('\n'),
    }),
  });

  if (!odpoved.ok) {
    console.error('[poptavka] Resend odmítl e-mail', odpoved.status, await odpoved.text());
    return json({ error: 'Odeslání se nepovedlo.' }, 502);
  }

  return json({ ok: true });
}
