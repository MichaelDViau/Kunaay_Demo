(function () {
  "use strict";

  const formSubmitEndpoint = "https://formsubmit.co/ajax/info@kunaay.com";
  const form = document.getElementById("contact-form");
  if (!form) {
    return;
  }

  const statusElement = document.getElementById("contact-form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton ? submitButton.textContent : "";

  const resetStatus = () => {
    if (!statusElement) {
      return;
    }
    statusElement.classList.add("d-none");
    statusElement.classList.remove("alert", "alert-success", "alert-danger");
    statusElement.textContent = "";
  };

  const showStatus = (message, type) => {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.classList.remove("d-none", "alert-success", "alert-danger");
    statusElement.classList.add(type === "success" ? "alert-success" : "alert-danger", "alert");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    resetStatus();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    const formData = new FormData(form);

    try {
      const response = await fetch(formSubmitEndpoint, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.success === "true" || data.success === true) {
        showStatus("Thank you! Your message has been sent successfully.", "success");
        form.reset();
      } else {
        throw new Error("Unexpected response from email service.");
      }
    } catch (error) {
      console.error("Failed to send contact form", error);
      showStatus(
        "We couldn't send your message right now. Please try again later or email us directly at info@kunaay.com.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
})();
