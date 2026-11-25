// JavaScript is running, so let the fade-in animations take over
document.documentElement.classList.remove("no-js");

// ===== Typing effect: types each role, deletes it, then moves to the next =====
const roles = [
  "Techno-Functional Consultant",
  "Business Analyst – SAP BO BI",
  "App Dev & Analytics Lead",
  "E-commerce Strategist",
];

const typedEl = document.getElementById("typed");
let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  const current = roles[roleIndex];

  if (!deleting) {
    charIndex++;
    typedEl.textContent = current.slice(0, charIndex);
    if (charIndex === current.length) {
      deleting = true;
      setTimeout(typeLoop, 1600); // pause on the full word
      return;
    }
    setTimeout(typeLoop, 90);
  } else {
    charIndex--;
    typedEl.textContent = current.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      setTimeout(typeLoop, 400); // short pause before the next role
      return;
    }
    setTimeout(typeLoop, 45);
  }
}

typeLoop();

// ===== Fade-in sections as they scroll into view =====
const fadeEls = document.querySelectorAll(".fade-in");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add("visible");
          observer.unobserve(el);
          // Clear the stagger delay afterwards so hover effects stay snappy
          setTimeout(() => (el.style.transitionDelay = ""), 1200);
        }
      });
    },
    { threshold: 0.15 }
  );

  // Stagger siblings slightly so cards appear one after another
  fadeEls.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) =>
      c.classList.contains("fade-in")
    );
    el.style.transitionDelay = `${siblings.indexOf(el) * 0.12}s`;
    observer.observe(el);
  });
} else {
  fadeEls.forEach((el) => el.classList.add("visible"));
}

// ===== Contact form: validate, then send to the /api/contact function =====
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("cf-submit");

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `form-status show ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form));
  // Turnstile adds its token to the form as "cf-turnstile-response"
  const token = data["cf-turnstile-response"];

  if (!data.name.trim() || !data.email.trim() || !data.message.trim()) {
    setStatus("Please fill in your name, email and message.", "error");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    setStatus("Please enter a valid email address.", "error");
    return;
  }
  if (!token) {
    setStatus("Please complete the captcha check.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  setStatus("", "");

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        website: data.website,
        token,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Something went wrong. Please try again.");
    }
    form.reset();
    setStatus("Thank you! Your message has been sent. I'll get back to you soon. 🙌", "success");
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";
    // Each captcha token works only once, so get a fresh one
    if (window.turnstile) window.turnstile.reset();
  }
});

// ===== Footer year =====
document.getElementById("year").textContent = new Date().getFullYear();
