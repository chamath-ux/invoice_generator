const purchaseOrderForm = document.getElementById("purchase-order-form");
const purchaseOrderItems = document.getElementById("purchase-order-items");
const itemTemplate = document.getElementById("item-template");
const previewItems = document.getElementById("purchase-order-preview-items");
const currencyInput = document.getElementById("currency");
const addItemButton = document.getElementById("add-item");
const preview = document.getElementById("purchase-order-preview");
const previewButton = document.getElementById("preview-purchase-order");
const printButton = document.getElementById("print-purchase-order");
const downloadButton = document.getElementById("download-purchase-order");
const previewDialog = document.getElementById("purchase-order-preview-dialog");
const dialogContent = document.getElementById("purchase-order-dialog-content");
const closePreviewButton = document.getElementById("close-purchase-order-preview");
const businessInfoStorageKey = "invoice-studio.business-info.v1";
const businessInfoFieldNames = ["businessName", "businessEmail", "businessAddress"];

const previewFallbacks = {
  businessName: "Your business",
  businessAddress: "Business address",
  businessEmail: "Business email",
  supplierName: "Supplier name",
  purchaseOrderNumber: "—",
  notes: "Shipping instructions or other terms",
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
    const field = purchaseOrderForm.elements.namedItem(name);
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

function restoreBusinessInfo() {
  const businessInfo = getStoredBusinessInfo();
  businessInfoFieldNames.forEach((name) => {
    const field = purchaseOrderForm.elements.namedItem(name);
    if (typeof businessInfo[name] === "string") {
      field.value = businessInfo[name];
    }
  });
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

function getFieldValue(name) {
  return purchaseOrderForm.elements.namedItem(name).value.trim();
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

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyInput.value,
  }).format(value);
}

function numberFrom(input) {
  const value = Number(input.value);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function updatePreview() {
  setPreviewValue("businessName", getFieldValue("businessName"));
  setPreviewValue("businessAddress", getFieldValue("businessAddress"));
  setPreviewValue("businessEmail", getFieldValue("businessEmail"));
  setPreviewValue("supplierName", getFieldValue("supplierName"));
  setPreviewValue("supplierAddress", getFieldValue("supplierAddress"));
  setPreviewValue("supplierEmail", getFieldValue("supplierEmail"));
  setPreviewValue("purchaseOrderNumber", getFieldValue("purchaseOrderNumber"));
  setPreviewValue("orderDate", formatDate(getFieldValue("orderDate")));
  setPreviewValue("deliveryDate", formatDate(getFieldValue("deliveryDate")));
  setPreviewValue("notes", getFieldValue("notes"));

  let subtotal = 0;
  const rows = Array.from(purchaseOrderItems.querySelectorAll("[data-item-row]"));
  const previewRows = rows.map((row) => {
    const description = row.querySelector("[data-item-description]").value.trim();
    const quantity = numberFrom(row.querySelector("[data-item-quantity]"));
    const unitPrice = numberFrom(row.querySelector("[data-item-price]"));
    const amount = quantity * unitPrice;
    subtotal += amount;

    const previewRow = document.createElement("tr");
    const descriptionCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    const amountCell = document.createElement("td");
    descriptionCell.dataset.label = "Item";
    quantityCell.dataset.label = "Qty";
    amountCell.dataset.label = "Amount";
    descriptionCell.textContent = description || "Item description";
    quantityCell.textContent = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(quantity);
    amountCell.textContent = formatMoney(amount);
    previewRow.append(descriptionCell, quantityCell, amountCell);
    return previewRow;
  });

  previewItems.replaceChildren(...previewRows);
  const taxRate = Math.min(numberFrom(purchaseOrderForm.elements.namedItem("taxRate")), 100);
  const taxAmount = subtotal * taxRate / 100;
  document.querySelector('[data-preview="subtotal"]').textContent = formatMoney(subtotal);
  document.querySelector('[data-preview="taxRateLabel"]').textContent = `(${taxRate}%)`;
  document.querySelector('[data-preview="taxAmount"]').textContent = formatMoney(taxAmount);
  document.querySelector('[data-preview="total"]').textContent = formatMoney(subtotal + taxAmount);

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
  const rows = purchaseOrderItems.querySelectorAll("[data-item-row]");
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
  return `${getFieldValue("purchaseOrderNumber") || "purchase-order"}.pdf`;
}

purchaseOrderForm.addEventListener("input", updatePreview);
purchaseOrderForm.addEventListener("change", updatePreview);

businessInfoFieldNames.forEach((name) => {
  const field = purchaseOrderForm.elements.namedItem(name);
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
  purchaseOrderItems.append(itemTemplate.content.cloneNode(true));
  updateItemRemoveButtons();
  updatePreview();
  purchaseOrderItems.querySelector("[data-item-row]:last-child [data-item-description]").focus();
});

purchaseOrderItems.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".item-remove");
  if (!removeButton || purchaseOrderItems.querySelectorAll("[data-item-row]").length === 1) {
    return;
  }
  removeButton.closest("[data-item-row]").remove();
  updateItemRemoveButtons();
  updatePreview();
});

printButton.addEventListener("click", () => {
  if (!purchaseOrderForm.checkValidity()) {
    purchaseOrderForm.reportValidity();
    return;
  }
  updatePreview();
  window.print();
});

downloadButton.addEventListener("click", async () => {
  if (!purchaseOrderForm.checkValidity()) {
    purchaseOrderForm.reportValidity();
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
    console.error("Could not create purchase order PDF:", error);
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
