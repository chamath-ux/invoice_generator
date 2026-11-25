const deliveryNoteForm = document.getElementById("delivery-note-form");
const deliveryNoteItems = document.getElementById("delivery-note-items");
const itemTemplate = document.getElementById("item-template");
const previewItems = document.getElementById("delivery-note-preview-items");
const addItemButton = document.getElementById("add-item");
const preview = document.getElementById("delivery-note-preview");
const previewButton = document.getElementById("preview-delivery-note");
const printButton = document.getElementById("print-delivery-note");
const downloadButton = document.getElementById("download-delivery-note");
const previewDialog = document.getElementById("delivery-note-preview-dialog");
const dialogContent = document.getElementById("delivery-note-dialog-content");
const closePreviewButton = document.getElementById("close-delivery-note-preview");
const businessInfoStorageKey = "invoice-studio.business-info.v1";
const businessInfoFieldNames = ["businessName", "businessEmail", "businessAddress"];

const previewFallbacks = {
  businessName: "Your business",
  businessAddress: "Business address",
  businessEmail: "Business email",
  recipientName: "Recipient name",
  deliveryNoteNumber: "—",
  orderReference: "—",
  notes: "Delivery instructions or comments",
};

function getStoredBusinessInfo() {
  try {
    const storedBusinessInfo = localStorage.getItem(businessInfoStorageKey);
    if (!storedBusinessInfo) {
      return {};
    }

    const businessInfo = JSON.parse(storedBusinessInfo);
    if (!businessInfo || typeof businessInfo !== "object" || Array.isArray(businessInfo)) {
      console.error("Saved business information has an invalid format.");
      return {};
    }
    return businessInfo;
  } catch (error) {
    console.error("Could not read saved business information:", error);
    return {};
  }
}

function saveBusinessInfo() {
  const storedBusinessInfo = getStoredBusinessInfo();
  const businessInfo = {};
  businessInfoFieldNames.forEach((name) => {
    const field = deliveryNoteForm.elements.namedItem(name);
    if (field) {
      businessInfo[name] = field.value;
    } else if (typeof storedBusinessInfo[name] === "string") {
      businessInfo[name] = storedBusinessInfo[name];
    }
  });
  if (typeof storedBusinessInfo.logoDataUrl === "string") {
    businessInfo.logoDataUrl = storedBusinessInfo.logoDataUrl;
  }

  try {
    localStorage.setItem(businessInfoStorageKey, JSON.stringify(businessInfo));
  } catch (error) {
    console.error("Could not save business information:", error);
  }
}

function removeSavedDocumentDrafts() {
  try {
    [
      "invoice-studio.invoice-draft.v1",
      "invoice-studio.quotation-draft.v1",
      "invoice-studio.receipt-draft.v1",
      "invoice-studio.purchase-order-draft.v1",
    ].forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("Could not remove saved document details:", error);
  }
}

function removeSavedNonBusinessInfo() {
  const storedBusinessInfo = getStoredBusinessInfo();
  const businessInfo = {};
  businessInfoFieldNames.forEach((name) => {
    if (typeof storedBusinessInfo[name] === "string") {
      businessInfo[name] = storedBusinessInfo[name];
    }
  });
  if (typeof storedBusinessInfo.logoDataUrl === "string") {
    businessInfo.logoDataUrl = storedBusinessInfo.logoDataUrl;
  }

  if (Object.keys(storedBusinessInfo).length !== Object.keys(businessInfo).length) {
    try {
      localStorage.setItem(businessInfoStorageKey, JSON.stringify(businessInfo));
    } catch (error) {
      console.error("Could not remove saved non-business details:", error);
    }
  }
}

function restoreBusinessInfo() {
  const businessInfo = getStoredBusinessInfo();
  businessInfoFieldNames.forEach((name) => {
    const field = deliveryNoteForm.elements.namedItem(name);
    if (typeof businessInfo[name] === "string") {
      field.value = businessInfo[name];
    }
  });
}

function getFieldValue(name) {
  return deliveryNoteForm.elements.namedItem(name).value.trim();
}

function setPreviewValue(name, value) {
  const element = document.querySelector(`[data-preview="${name}"]`);
  element.textContent = value || previewFallbacks[name] || "";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function updatePreview() {
  setPreviewValue("businessName", getFieldValue("businessName"));
  setPreviewValue("businessAddress", getFieldValue("businessAddress"));
  setPreviewValue("businessEmail", getFieldValue("businessEmail"));
  setPreviewValue("recipientName", getFieldValue("recipientName"));
  setPreviewValue("recipientEmail", getFieldValue("recipientEmail"));
  setPreviewValue("deliveryAddress", getFieldValue("deliveryAddress"));
  setPreviewValue("deliveryNoteNumber", getFieldValue("deliveryNoteNumber"));
  setPreviewValue("deliveryDate", formatDate(getFieldValue("deliveryDate")));
  setPreviewValue("orderReference", getFieldValue("orderReference"));
  setPreviewValue("notes", getFieldValue("notes"));
  setPreviewValue("receivedBySignature", getFieldValue("receivedBySignature"));

  const rows = Array.from(deliveryNoteItems.querySelectorAll("[data-item-row]"));
  const previewRows = rows.map((row) => {
    const description = row.querySelector("[data-item-description]").value.trim();
    const quantityValue = Number(row.querySelector("[data-item-quantity]").value);
    const quantity = Number.isFinite(quantityValue) && quantityValue >= 0 ? quantityValue : 0;
    const previewRow = document.createElement("tr");
    const descriptionCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    descriptionCell.dataset.label = "Item";
    quantityCell.dataset.label = "Qty delivered";
    descriptionCell.textContent = description || "Item description";
    quantityCell.textContent = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(quantity);
    previewRow.append(descriptionCell, quantityCell);
    return previewRow;
  });
  previewItems.replaceChildren(...previewRows);

  if (previewDialog.open) {
    renderDialogPreview();
  }
}

function renderDialogPreview() {
  const previewCopy = preview.cloneNode(true);
  previewCopy.removeAttribute("id");
  previewCopy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  dialogContent.replaceChildren(previewCopy);
}

function updateItemRemoveButtons() {
  const rows = deliveryNoteItems.querySelectorAll("[data-item-row]");
  rows.forEach((row) => {
    row.querySelector(".item-remove").disabled = rows.length === 1;
  });
}

async function createPdf() {
  updatePreview();
  const canvas = await html2canvas(preview, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const pdf = new jspdf.jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const image = canvas.toDataURL("image/png");
  const imageWidth = pageWidth - 20;
  const imageHeight = canvas.height * imageWidth / canvas.width;
  const height = Math.min(imageHeight, pageHeight - 20);
  const width = height === imageHeight ? imageWidth : canvas.width * height / canvas.height;
  pdf.addImage(image, "PNG", (pageWidth - width) / 2, 10, width, height);
  return pdf;
}

function getPdfFilename() {
  return `${getFieldValue("deliveryNoteNumber") || "delivery-note"}.pdf`;
}

deliveryNoteForm.addEventListener("input", updatePreview);
deliveryNoteForm.addEventListener("change", updatePreview);

businessInfoFieldNames.forEach((name) => {
  const field = deliveryNoteForm.elements.namedItem(name);
  field.addEventListener("input", saveBusinessInfo);
  field.addEventListener("change", saveBusinessInfo);
});

previewButton.addEventListener("click", () => {
  updatePreview();
  renderDialogPreview();
  previewDialog.showModal();
  previewButton.setAttribute("aria-expanded", "true");
  closePreviewButton.focus();
});

closePreviewButton.addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("close", () => previewButton.setAttribute("aria-expanded", "false"));
previewDialog.addEventListener("click", (event) => {
  if (event.target === previewDialog) {
    previewDialog.close();
  }
});

addItemButton.addEventListener("click", () => {
  deliveryNoteItems.append(itemTemplate.content.cloneNode(true));
  updateItemRemoveButtons();
  updatePreview();
  deliveryNoteItems.querySelector("[data-item-row]:last-child [data-item-description]").focus();
});

deliveryNoteItems.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".item-remove");
  if (!removeButton || deliveryNoteItems.querySelectorAll("[data-item-row]").length === 1) {
    return;
  }
  removeButton.closest("[data-item-row]").remove();
  updateItemRemoveButtons();
  updatePreview();
});

printButton.addEventListener("click", () => {
  if (!deliveryNoteForm.checkValidity()) {
    deliveryNoteForm.reportValidity();
    return;
  }
  updatePreview();
  window.print();
});

downloadButton.addEventListener("click", async () => {
  if (!deliveryNoteForm.checkValidity()) {
    deliveryNoteForm.reportValidity();
    return;
  }
  if (typeof html2canvas !== "function" || typeof jspdf !== "object") {
    alert("PDF download libraries could not be loaded. Check your internet connection and try again.");
    return;
  }

  const originalContent = downloadButton.innerHTML;
  downloadButton.disabled = true;
  downloadButton.textContent = "Preparing PDF...";
  try {
    const pdf = await createPdf();
    pdf.save(getPdfFilename());
  } catch (error) {
    console.error("Could not create delivery note PDF:", error);
    alert("Could not create the PDF. Please try again.");
  } finally {
    downloadButton.disabled = false;
    downloadButton.innerHTML = originalContent;
  }
});

removeSavedDocumentDrafts();
removeSavedNonBusinessInfo();
restoreBusinessInfo();
updateItemRemoveButtons();
updatePreview();
