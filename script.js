const admissionForm = document.querySelector("#admissionForm");
const formMessage = document.querySelector("#formMessage");

admissionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!admissionForm.checkValidity()) {
    formMessage.textContent = "Please fill all required fields correctly.";
    return;
  }

  const formData = new FormData(admissionForm);
  const admissionData = Object.fromEntries(formData.entries());
  const studentName = formData.get("studentName");
  const course = formData.get("course");

  formMessage.textContent = "Submitting admission form...";

  try {
    const response = await fetch("/admissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(admissionData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to save admission.");
    }

    formMessage.textContent = `Thank you, ${studentName}. Your Admission request has been Received`;
    admissionForm.reset();
  } catch (error) {
    formMessage.textContent = "Please open the website using the local server URL to save admission data.";
  }
});
