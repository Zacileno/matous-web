/* ══════════════════════════════════════════════
   Matouš Syrový – interaktivita
   ══════════════════════════════════════════════ */

/* ── Automatický rok v patičce ── */
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

/* ── Hlavička: po odscrollování se podloží ── */
const topbar = document.getElementById('topbar');
if (topbar) {
  const prepniHlavicku = () => {
    topbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  prepniHlavicku();
  window.addEventListener('scroll', prepniHlavicku, { passive: true });
}

/* ── Postupné odkrývání při scrollu ── */
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('vis'), i * 60);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: .12 });
  reveals.forEach(el => obs.observe(el));
} else {
  reveals.forEach(el => el.classList.add('vis'));
}

/* ── Formulář ── */
const form = document.getElementById('booking-form');

if (form) {
  const submitBtn = form.querySelector('.booking-submit');
  const status = document.getElementById('form-status');

  function showStatus(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status show' + (kind ? ' ' + kind : '');
  }

  function setInvalid(field, msg) {
    const wrap = field.closest('.field');
    wrap.classList.add('invalid');
    wrap.querySelector('.field-error').textContent = msg;
  }

  function clearInvalid(field) {
    field.closest('.field').classList.remove('invalid');
  }

  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => clearInvalid(el));
  });

  function validate() {
    let ok = true;
    const jmeno = form.jmeno;
    const email = form.email;
    const zprava = form.zprava;
    const souhlas = form.souhlas;

    if (!jmeno.value.trim()) { setInvalid(jmeno, 'Vyplňte prosím jméno.'); ok = false; }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    if (!emailOk) { setInvalid(email, 'Zadejte prosím platný e-mail.'); ok = false; }

    if (zprava.value.trim().length < 10) {
      setInvalid(zprava, 'Napište prosím alespoň pár vět.');
      ok = false;
    }

    if (!souhlas.checked) {
      showStatus('Bez souhlasu se zpracováním údajů nemůžeme formulář odeslat.', 'err');
      ok = false;
    }

    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // past na roboty – lidé toto pole nevyplní
    if (form.website.value) return;

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.querySelector('.cta-label').textContent = 'Odesílám…';
    showStatus('', '');

    try {
      const odpoved = await fetch('/api/poptavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jmeno: form.jmeno.value.trim(),
          email: form.email.value.trim(),
          firma: form.firma.value.trim(),
          zprava: form.zprava.value.trim(),
          website: form.website.value
        })
      });

      if (!odpoved.ok) throw new Error(`HTTP ${odpoved.status}`);

      form.reset();
      showStatus('Děkuji, poptávka dorazila. Ozvu se do 48 hodin.', 'ok');
      submitBtn.querySelector('.cta-label').textContent = 'Odesláno';
    } catch (err) {
      showStatus('Odeslání se nepovedlo. Zkuste to prosím znovu, nebo napište na e-mail níže.', 'err');
      submitBtn.disabled = false;
      submitBtn.querySelector('.cta-label').textContent = 'Odeslat poptávku';
    }
  });
}
