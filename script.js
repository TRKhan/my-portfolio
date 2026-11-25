// JavaScript is running, so let the fade-in animations take over
document.documentElement.classList.remove("no-js");

// ===== Typing effect: types each role, deletes it, then moves to the next =====
const roles = [
  "AI Automation Learner",
  "Prompt Writer",
  "Automation Builder",
  "Web Developer in Progress",
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

// ===== Contact button: show a thank-you message =====
const contactBtn = document.getElementById("contact-btn");
const thankYou = document.getElementById("thank-you");

contactBtn.addEventListener("click", () => {
  thankYou.textContent = "Thank you for reaching out! I'll get back to you soon. 🙌";
  thankYou.classList.add("show");
  contactBtn.textContent = "Message Sent ✓";
  contactBtn.disabled = true;
});

// ===== Footer year =====
document.getElementById("year").textContent = new Date().getFullYear();
