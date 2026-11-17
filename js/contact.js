// Contact form: validates inline, then opens the visitor's email app (there is no message backend yet).
const form = document.getElementById("contact-form");
const topic = new URLSearchParams(location.search).get("topic");
if (form && topic && [...form.topic.options].some((o) => o.value === topic)) form.topic.value = topic;

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!window.validateForm(form)) return;
  const topicLabel = form.topic.options[form.topic.selectedIndex].text;
  const body = [
    form.message.value.trim(),
    "",
    `Name: ${form.name.value.trim()}`,
    `Email: ${form.email.value.trim()}`,
    form.phone.value.trim() ? `Phone: ${form.phone.value.trim()}` : "",
  ].filter((l, i) => l || i === 1).join("\n");
  window.location.href = `mailto:info@justhome.com?subject=${encodeURIComponent(`JustHome enquiry: ${topicLabel}`)}&body=${encodeURIComponent(body)}`;
  window.showToast?.("Opening your email app…");
});
