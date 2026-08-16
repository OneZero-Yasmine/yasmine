const openers = document.querySelectorAll("[data-dialog-open]");

for (const opener of openers) {
  opener.addEventListener("click", () => {
    const dialog = document.getElementById(opener.dataset.dialogOpen);
    if (dialog instanceof HTMLDialogElement) dialog.showModal();
  });
}

for (const dialog of document.querySelectorAll("dialog")) {
  const closeButton = dialog.querySelector("[data-dialog-close]");
  closeButton?.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom;
    if (!inside) dialog.close();
  });
}

const emailCopyButton = document.querySelector("[data-copy-email]");
const emailLabel = emailCopyButton?.querySelector("[data-email-label]");
const copyStatus = document.querySelector("[data-copy-status]");

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some browsers expose the Clipboard API but deny it at runtime.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy command was rejected");
}

emailCopyButton?.addEventListener("click", async () => {
  const email = emailCopyButton.dataset.copyEmail;

  try {
    await copyText(email);

    if (emailLabel) emailLabel.textContent = "已复制";
    if (copyStatus) copyStatus.textContent = `邮箱地址 ${email} 已复制`;
    window.setTimeout(() => {
      if (emailLabel) emailLabel.textContent = "Email";
      if (copyStatus) copyStatus.textContent = "";
    }, 1800);
  } catch {
    if (emailLabel) emailLabel.textContent = "复制失败";
    if (copyStatus) copyStatus.textContent = `复制失败，请手动复制：${email}`;
    window.setTimeout(() => {
      if (emailLabel) emailLabel.textContent = "Email";
      if (copyStatus) copyStatus.textContent = "";
    }, 1800);
  }
});
