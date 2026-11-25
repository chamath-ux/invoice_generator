const quotationForm = document.getElementById("quotation-form");
const quotationItems = document.getElementById("quotation-items");
const itemTemplate = document.getElementById("item-template");
const previewItems = document.getElementById("quotation-preview-items");
const currencyInput = document.getElementById("currency");
const addItemButton = document.getElementById("add-item");
const downloadQuotationButton = document.getElementById("download-quotation");
const printQuotationButton = document.getElementById("print-quotation");
const quotationPreview = document.getElementById("quotation-preview");
const previewQuotationButton = document.getElementById("preview-quotation");
const previewDialog = document.getElementById("quotation-preview-dialog");
const previewDialogContent = document.getElementById("quotation-dialog-content");
const closePreviewButton = document.getElementById("close-quotation-preview");
const businessInfoStorageKey = "invoice-studio.business-info.v1";
const businessInfoFieldNames = ["businessName", "businessEmail", "businessAddress"];

const previewFields = {
  businessName: "Your business",
  businessAddress: "Business address",
  businessEmail: "Business email",
  customerName: "Customer name",
  customerAddress: "",
  customerEmail: "",
  quotationNumber: "—",
  quotationDate: "—",
  validUntil: "—",
  notes: "Terms, assumptions, or additional details",
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
  const businessInfo = getStoredBusinessInfo();
  businessInfoFieldNames.forEach((name) => {
    const field = quotationForm.elements.namedItem(name);
    if (field) {
      businessInfo[name] = field.value;
    }
  });

  try {
    localStorage.setItem(businessInfoStorageKey, JSON.stringify(businessInfo));
  } catch (error) {
    console.error("Could not save business information:", error);
  }
}

function restoreBusinessInfo() {
  const businessInfo = getStoredBusinessInfo();
  businessInfoFieldNames.forEach((name) => {
    const field = quotationForm.elements.namedItem(name);
    if (field && typeof businessInfo[name] === "string") {
      field.value = businessInfo[name];
    }
  });
}

function getFieldValue(name) {
  return quotationForm.elements.namedItem(name).value.trim();
}

function setPreviewValue(name, value) {
  document.querySelector(`[data-preview="${name}"]`).textContent = value || previewFields[name];
}

function formatQuotationDate(value) {
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

function formatQuotationMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyInput.value,
  }).format(value);
}

function getPositiveNumber(input) {
  const value = Number(input.value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function updateQuotationPreview() {
  setPreviewValue("businessName", getFieldValue("businessName"));
  setPreviewValue("businessAddress", getFieldValue("businessAddress"));
  setPreviewValue("businessEmail", getFieldValue("businessEmail"));
  setPreviewValue("customerName", getFieldValue("customerName"));
  setPreviewValue("customerAddress", getFieldValue("customerAddress"));
  setPreviewValue("customerEmail", getFieldValue("customerEmail"));
  setPreviewValue("quotationNumber", getFieldValue("quotationNumber"));
  setPreviewValue("quotationDate", formatQuotationDate(getFieldValue("quotationDate")));
  setPreviewValue("validUntil", formatQuotationDate(getFieldValue("validUntil")));
  setPreviewValue("notes", getFieldValue("notes"));

  let subtotal = 0;
  const rows = Array.from(quotationItems.querySelectorAll("[data-item-row]"));
  const previewRows = rows.map((row) => {
    const description = row.querySelector("[data-item-description]").value.trim();
    const quantity = getPositiveNumber(row.querySelector("[data-item-quantity]"));
    const unitPrice = getPositiveNumber(row.querySelector("[data-item-price]"));
    const amount = quantity * unitPrice;
    subtotal += amount;

    const previewRow = document.createElement("tr");
    const descriptionCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    const amountCell = document.createElement("td");
    descriptionCell.dataset.label = "Description";
    quantityCell.dataset.label = "Qty";
    amountCell.dataset.label = "Amount";
    descriptionCell.textContent = description || "Item description";
    quantityCell.textContent = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(quantity);
    amountCell.textContent = formatQuotationMoney(amount);
    previewRow.append(descriptionCell, quantityCell, amountCell);
    return previewRow;
  });

  previewItems.replaceChildren(...previewRows);

  const taxRate = Math.min(getPositiveNumber(quotationForm.elements.namedItem("taxRate")), 100);
  const taxAmount = subtotal * taxRate / 100;
  document.querySelector('[data-preview="subtotal"]').textContent = formatQuotationMoney(subtotal);
  document.querySelector('[data-preview="taxRateLabel"]').textContent = `(${taxRate}%)`;
  document.querySelector('[data-preview="taxAmount"]').textContent = formatQuotationMoney(taxAmount);
  document.querySelector('[data-preview="total"]').textContent = formatQuotationMoney(subtotal + taxAmount);

  if (previewDialog.open) {
    renderQuotationDialogPreview();
  }
}

function renderQuotationDialogPreview() {
  const previewCopy = quotationPreview.cloneNode(true);
  previewCopy.removeAttribute("id");
  previewCopy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  previewDialogContent.replaceChildren(previewCopy);
}

function updateItemRemoveButtons() {
  const rows = quotationItems.querySelectorAll("[data-item-row]");
  rows.forEach((row) => {
    row.querySelector(".item-remove").disabled = rows.length === 1;
  });
}

function createQuotationPdf() {
  return html2canvas(quotationPreview, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  }).then((canvas) => {
    const image = canvas.toDataURL("image/png");
    const pdf = new jspdf.jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth - 20;
    const imageHeight = canvas.height * imageWidth / canvas.width;
    const height = Math.min(imageHeight, pageHeight - 20);
    const width = height === imageHeight ? imageWidth : canvas.width * height / canvas.height;

    pdf.addImage(image, "PNG", (pageWidth - width) / 2, 10, width, height);
    return pdf;
  });
}

function getQuotationPdfFilename() {
  const quotationNumber = getFieldValue("quotationNumber");
  return `${quotationNumber || "quotation"}.pdf`;
}

quotationForm.addEventListener("input", () => {
  updateQuotationPreview();
});
quotationForm.addEventListener("change", () => {
  updateQuotationPreview();
});

previewQuotationButton.addEventListener("click", () => {
  updateQuotationPreview();
  renderQuotationDialogPreview();
  previewDialog.showModal();
  previewQuotationButton.setAttribute("aria-expanded", "true");
  closePreviewButton.focus();
});

closePreviewButton.addEventListener("click", () => {
  previewDialog.close();
});

previewDialog.addEventListener("close", () => {
  previewQuotationButton.setAttribute("aria-expanded", "false");
});

previewDialog.addEventListener("click", (event) => {
  if (event.target === previewDialog) {
    previewDialog.close();
  }
});

addItemButton.addEventListener("click", () => {
  quotationItems.append(itemTemplate.content.cloneNode(true));
  updateItemRemoveButtons();
  updateQuotationPreview();
  quotationItems.querySelector("[data-item-row]:last-child [data-item-description]").focus();
});

quotationItems.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".item-remove");
  if (!removeButton || quotationItems.querySelectorAll("[data-item-row]").length === 1) {
    return;
  }

  removeButton.closest("[data-item-row]").remove();
  updateItemRemoveButtons();
  updateQuotationPreview();
});

printQuotationButton.addEventListener("click", () => {
  if (!quotationForm.checkValidity()) {
    quotationForm.reportValidity();
    return;
  }

  updateQuotationPreview();
  window.print();
});

downloadQuotationButton.addEventListener("click", async () => {
  if (!quotationForm.checkValidity()) {
    quotationForm.reportValidity();
    return;
  }
  if (typeof html2canvas !== "function" || typeof jspdf !== "object") {
    alert("PDF download libraries could not be loaded. Check your internet connection and try again.");
    return;
  }

  const originalContent = downloadQuotationButton.innerHTML;
  downloadQuotationButton.disabled = true;
  downloadQuotationButton.textContent = "Preparing PDF...";
  try {
    updateQuotationPreview();
    const pdf = await createQuotationPdf();
    pdf.save(getQuotationPdfFilename());
  } catch (error) {
    console.error("Could not create quotation PDF:", error);
    alert("Could not create the PDF. Please try again.");
  } finally {
    downloadQuotationButton.disabled = false;
    downloadQuotationButton.innerHTML = originalContent;
  }
});

restoreBusinessInfo();
businessInfoFieldNames.forEach((name) => {
  const field = quotationForm.elements.namedItem(name);
  if (field) {
    field.addEventListener("input", saveBusinessInfo);
    field.addEventListener("change", saveBusinessInfo);
  }
});
updateItemRemoveButtons();
updateQuotationPreview();
