const revealItems = document.querySelectorAll(".reveal");
const staggerGroups = document.querySelectorAll(
  ".problem-grid .reveal, .workflow-grid .reveal, .feature-stack .reveal, .pricing-grid .reveal"
);

staggerGroups.forEach((item, index) => {
  item.dataset.delay = String(index % 4);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -32px 0px",
  }
);

revealItems.forEach((item) => observer.observe(item));

window.addEventListener("scroll", () => {
  const panel = document.querySelector(".hero-panel");

  if (!panel) {
    return;
  }

  const offset = Math.min(window.scrollY * 0.08, 24);
  panel.style.transform = `translateY(${offset}px)`;
});

const applyForm = document.querySelector("#apply-form");

if (applyForm) {
  const status = document.querySelector("#form-status");
  const storageKey = "btbApplications";
  const savedApplicationsList = document.querySelector("#saved-applications-list");

  const readSavedApplications = () => {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    } catch (error) {
      return [];
    }
  };

  const renderSavedApplications = () => {
    const savedApplications = readSavedApplications();

    if (!savedApplicationsList) {
      return;
    }

    if (!savedApplications.length) {
      savedApplicationsList.innerHTML = '<p class="saved-applications-empty">No applications saved on this device yet.</p>';
      return;
    }

    savedApplicationsList.innerHTML = savedApplications
      .slice()
      .reverse()
      .slice(0, 3)
      .map(
        (application) => `
          <article class="saved-application-card">
            <strong>${application.name} - ${application.company}</strong>
            <p>${application.revenue_stage} - ${application.email}</p>
            <p>${application.pain_point}</p>
          </article>
        `
      )
      .join("");
  };

  renderSavedApplications();

  applyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(applyForm);
    const payload = Object.fromEntries(formData.entries());
    const savedApplications = readSavedApplications();

    status.textContent = "Submitting application...";
    status.className = "form-status";

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong.");
      }

      savedApplications.push({
        ...payload,
        submitted_at: new Date().toISOString(),
      });
      window.localStorage.setItem(storageKey, JSON.stringify(savedApplications));

      status.textContent = "Application submitted successfully.";
      status.className = "form-status is-success";
      applyForm.reset();
      renderSavedApplications();
    } catch (error) {
      savedApplications.push({
        ...payload,
        submitted_at: new Date().toISOString(),
      });
      window.localStorage.setItem(storageKey, JSON.stringify(savedApplications));

      status.textContent = "Application saved on this device. The server write is unavailable right now, but the CTA flow is functional.";
      status.className = "form-status is-error";
      applyForm.reset();
      renderSavedApplications();
    }
  });
}
