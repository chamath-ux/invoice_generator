const receiptForm = document.querySelector(".details-form");
const receiptTypeInputs = receiptForm.querySelectorAll('input[name="receiptType"]');
const salesItemsSection = document.getElementById("sales-items-section");
const salesItemList = document.getElementById("sales-item-list");
const salesItemTemplate = document.getElementById("sales-item-template");
const addSalesItemButton = document.getElementById("add-sales-item");
const paymentForInput = document.getElementById("payment-for");
const receiptPreviewItems = document.getElementById("receipt-preview-items");
const receiptSalesPreview = document.querySelector("[data-receipt-sales-preview]");
const downloadReceiptButton = document.getElementById("download-receipt");
const shareReceiptButton = document.getElementById("share-receipt");
const receiptPreview = document.getElementById("receipt-preview");
const previewReceiptButton = document.getElementById("preview-receipt");
const receiptPreviewDialog = document.getElementById("receipt-preview-dialog");
const receiptDialogContent = document.getElementById("receipt-dialog-content");
const closeReceiptPreviewButton = document.getElementById("close-receipt-preview");

const receiptCopy = {
  payment: {
    title: "Create a payment receipt",
    intro: "Enter the payment and payer information for the receipt.",
    payerHeading: "Payment from",
    amountLabel: "Amount received",
    referenceLabel: "Invoice or reference number",
    descriptionLabel: "Payment for",
    descriptionPlaceholder: "Goods, services, or reason for payment",
    previewTitle: "PAYMENT RECEIPT",
    partyLabel: "PAID BY",
    previewDescriptionLabel: "PAYMENT FOR",
    previewReferenceLabel: "INVOICE OR REFERENCE",
  },
  sales: {
    title: "Create a sales receipt",
    intro: "Enter the customer, items sold, and payment information for the receipt.",
    payerHeading: "Sold to",
    amountLabel: "Total paid",
    referenceLabel: "Order or reference number",
    descriptionLabel: "Sale notes (optional)",
    descriptionPlaceholder: "Additional details about this sale",
    previewTitle: "SALES RECEIPT",
    partyLabel: "SOLD TO",
    previewDescriptionLabel: "SALE NOTES",
    previewReferenceLabel: "ORDER OR REFERENCE",
  },
};

function formatReceiptDate(value) {
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

function formatReceiptMoney(value) {
  const currency = receiptForm.elements.namedItem("currency").value;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

function setReceiptPreview(name, value, fallback = "—") {
  document.querySelector(`[data-receipt-preview="${name}"]`).textContent = value || fallback;
}

function updateReceiptPreview() {
  const selectedType = receiptForm.elements.namedItem("receiptType").value;
  const copy = receiptCopy[selectedType];
  const paymentMethod = receiptForm.elements.namedItem("paymentMethod");
  const selectedMethod = paymentMethod.options[paymentMethod.selectedIndex].text;
  const amountValue = Number(receiptForm.elements.namedItem("amount").value);
  const amount = Number.isFinite(amountValue) && amountValue > 0 ? amountValue : 0;

  setReceiptPreview("typeTitle", copy.previewTitle);
  setReceiptPreview("partyLabel", copy.partyLabel);
  setReceiptPreview("descriptionLabel", copy.previewDescriptionLabel);
  setReceiptPreview("referenceLabel", copy.previewReferenceLabel);
  setReceiptPreview("amountLabel", copy.amountLabel);
  setReceiptPreview("businessName", receiptForm.elements.namedItem("businessName").value.trim(), "Your business");
  setReceiptPreview("businessEmail", receiptForm.elements.namedItem("businessEmail").value.trim(), "Business email");
  setReceiptPreview("payerName", receiptForm.elements.namedItem("payerName").value.trim(), "Customer name");
  setReceiptPreview("payerEmail", receiptForm.elements.namedItem("payerEmail").value.trim(), "");
  setReceiptPreview("receiptNumber", receiptForm.elements.namedItem("receiptNumber").value.trim());
  setReceiptPreview("paymentDate", formatReceiptDate(receiptForm.elements.namedItem("paymentDate").value));
  setReceiptPreview("paymentFor", paymentForInput.value.trim(), selectedType === "sales" ? "Sale details" : "Payment details");
  setReceiptPreview("paymentMethod", selectedMethod === "Select a method" ? "" : selectedMethod);
  setReceiptPreview("invoiceReference", receiptForm.elements.namedItem("invoiceReference").value.trim());
  setReceiptPreview("notes", receiptForm.elements.namedItem("notes").value.trim(), "Additional receipt notes");
  setReceiptPreview("amount", formatReceiptMoney(amount));

  const saleRows = Array.from(salesItemList.querySelectorAll("[data-sales-item]"));
  const previewRows = saleRows.map((row) => {
    const description = row.querySelector('[name="itemDescription[]"]').value.trim();
    const quantity = Number(row.querySelector('[name="itemQuantity[]"]').value) || 0;
    const unitPriceValue = Number(row.querySelector('[name="itemUnitPrice[]"]').value);
    const unitPrice = Number.isFinite(unitPriceValue) && unitPriceValue > 0 ? unitPriceValue : 0;
    const previewRow = document.createElement("tr");
    const descriptionCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    const priceCell = document.createElement("td");

    descriptionCell.textContent = description || "Item description";
    quantityCell.textContent = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(quantity);
    priceCell.textContent = formatReceiptMoney(unitPrice);
    previewRow.append(descriptionCell, quantityCell, priceCell);
    return previewRow;
  });

  receiptPreviewItems.replaceChildren(...previewRows);
  receiptSalesPreview.hidden = selectedType !== "sales";

  if (receiptPreviewDialog.open) {
    renderReceiptDialogPreview();
  }
}

function renderReceiptDialogPreview() {
  const previewCopy = receiptPreview.cloneNode(true);
  previewCopy.removeAttribute("id");
  previewCopy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  receiptDialogContent.replaceChildren(previewCopy);
}

function updateReceiptType() {
  const selectedType = receiptForm.elements.namedItem("receiptType").value;
  const copy = receiptCopy[selectedType];
  const isSalesReceipt = selectedType === "sales";

  document.getElementById("page-title").textContent = copy.title;
  document.getElementById("receipt-intro-copy").textContent = copy.intro;
  document.getElementById("payer-heading").textContent = copy.payerHeading;
  document.getElementById("amount-label").textContent = copy.amountLabel;
  document.getElementById("reference-label").textContent = copy.referenceLabel;
  document.getElementById("payment-for-label").textContent = copy.descriptionLabel;
  paymentForInput.placeholder = copy.descriptionPlaceholder;
  paymentForInput.required = !isSalesReceipt;
  salesItemsSection.hidden = !isSalesReceipt;
  salesItemsSection.querySelectorAll("input").forEach((input) => {
    input.disabled = !isSalesReceipt;
  });

  receiptTypeInputs.forEach((input) => {
    input.closest(".receipt-type-option").classList.toggle("is-selected", input.checked);
  });
  updateReceiptPreview();
}

function updateSalesItemRemoveButtons() {
  const rows = salesItemList.querySelectorAll("[data-sales-item]");
  rows.forEach((row) => {
    row.querySelector(".sales-item-remove").disabled = rows.length === 1;
  });
}

receiptTypeInputs.forEach((input) => {
  input.addEventListener("change", updateReceiptType);
});

receiptForm.addEventListener("input", updateReceiptPreview);
receiptForm.addEventListener("change", updateReceiptPreview);

previewReceiptButton.addEventListener("click", () => {
  updateReceiptPreview();
  renderReceiptDialogPreview();
  receiptPreviewDialog.showModal();
  previewReceiptButton.setAttribute("aria-expanded", "true");
  closeReceiptPreviewButton.focus();
});

closeReceiptPreviewButton.addEventListener("click", () => {
  receiptPreviewDialog.close();
});

receiptPreviewDialog.addEventListener("close", () => {
  previewReceiptButton.setAttribute("aria-expanded", "false");
});

receiptPreviewDialog.addEventListener("click", (event) => {
  if (event.target === receiptPreviewDialog) {
    receiptPreviewDialog.close();
  }
});

addSalesItemButton.addEventListener("click", () => {
  salesItemList.append(salesItemTemplate.content.cloneNode(true));
  updateSalesItemRemoveButtons();
  updateReceiptPreview();
  salesItemList.querySelector("[data-sales-item]:last-child input").focus();
});

salesItemList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".sales-item-remove");
  if (!removeButton || salesItemList.querySelectorAll("[data-sales-item]").length === 1) {
    return;
  }

  removeButton.closest("[data-sales-item]").remove();
  updateSalesItemRemoveButtons();
  updateReceiptPreview();
});

downloadReceiptButton.addEventListener("click", async () => {
  if (!receiptForm.checkValidity()) {
    receiptForm.reportValidity();
    return;
  }

  if (typeof html2canvas !== "function" || typeof jspdf !== "object") {
    alert("PDF download libraries could not be loaded. Check your internet connection and try again.");
    return;
  }

  await prepareReceiptPdf(downloadReceiptButton, (pdf) => pdf.save(getReceiptPdfFilename()));
});

updateSalesItemRemoveButtons();
updateReceiptType();

async function createReceiptPdf() {
  updateReceiptPreview();
  const canvas = await html2canvas(receiptPreview, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
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
}

function getReceiptPdfFilename() {
  const receiptNumber = receiptForm.elements.namedItem("receiptNumber").value.trim();
  return `${receiptNumber || "receipt"}.pdf`;
}

async function prepareReceiptPdf(button, operation) {
  const originalContent = button.innerHTML;
  button.disabled = true;
  button.textContent = "Preparing PDF...";

  try {
    const pdf = await createReceiptPdf();
    await operation(pdf);
  } catch (error) {
    console.error("Could not create or share receipt PDF:", error);
    alert("Could not create or share the PDF. Please try again.");
  } finally {
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

shareReceiptButton.addEventListener("click", async () => {
  if (!receiptForm.checkValidity()) {
    receiptForm.reportValidity();
    return;
  }
  if (typeof html2canvas !== "function" || typeof jspdf !== "object") {
    alert("PDF download libraries could not be loaded. Check your internet connection and try again.");
    return;
  }

  await prepareReceiptPdf(shareReceiptButton, async (pdf) => {
    if (typeof File !== "function" || typeof navigator.share !== "function"
      || typeof navigator.canShare !== "function") {
      pdf.save(getReceiptPdfFilename());
      alert("File sharing isn't supported in this browser. The receipt PDF has been downloaded instead.");
      return;
    }

    const file = new File([pdf.output("blob")], getReceiptPdfFilename(), { type: "application/pdf" });
    if (!navigator.canShare({ files: [file] })) {
      pdf.save(getReceiptPdfFilename());
      alert("File sharing isn't supported in this browser. The receipt PDF has been downloaded instead.");
      return;
    }

    try {
      await navigator.share({ files: [file], title: "Receipt" });
    } catch (error) {
      if (error.name !== "AbortError") {
        throw error;
      }
    }
  });
});
