const invoiceForm = document.getElementById("invoice-form");
const invoiceItems = document.getElementById("invoice-items");
const itemTemplate = document.getElementById("item-template");
const previewItems = document.getElementById("preview-items");
const currencyInput = document.getElementById("currency");
const addItemButton = document.getElementById("add-item");
const downloadInvoiceButton = document.getElementById("download-invoice");
const invoicePreview = document.getElementById("invoice-preview");
const businessLogoInput = document.getElementById("business-logo");
const businessLogoStatus = document.getElementById("business-logo-status");
const removeBusinessLogoButton = document.getElementById("remove-business-logo");
const invoiceLogoPreview = document.getElementById("invoice-logo-preview");
const defaultPreviewMark = document.querySelector(".preview-mark");
const businessInfoStorageKey = "invoice-studio.business-info.v1";
const businessInfoFieldNames = ["businessName", "businessEmail", "businessAddress"];
const maxBusinessLogoBytes = 1024 * 1024;
const maxBusinessLogoDataUrlLength = Math.ceil(maxBusinessLogoBytes / 3) * 4 + 100;
const supportedBusinessLogoTypes = ["image/png", "image/jpeg", "image/webp"];
let businessLogoDataUrl = "";

const previewFields = {
  businessName: "Your business",
  businessAddress: "Business address",
  businessEmail: "Business email",
  customerName: "Customer name",
  customerAddress: "",
  customerEmail: "",
  invoiceNumber: "—",
  invoiceDate: "—",
  dueDate: "—",
  notes: "Payment instructions or a note for your customer",
};

function getFieldValue(name) {
  return invoiceForm.elements.namedItem(name).value.trim();
}

function setPreviewValue(name, value) {
  const preview = document.querySelector(`[data-preview="${name}"]`);
  preview.textContent = value || previewFields[name];
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected logo could not be read."));
        return;
      }
      resolve(reader.result);
    }, { once: true });
    reader.addEventListener("error", () => {
      reject(reader.error || new Error("The selected logo could not be read."));
    }, { once: true });
    reader.readAsDataURL(file);
  });
}

async function displayBusinessLogo(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  businessLogoDataUrl = dataUrl;
  invoiceLogoPreview.src = dataUrl;
  invoiceLogoPreview.hidden = false;
  defaultPreviewMark.hidden = true;
  removeBusinessLogoButton.disabled = false;
}

function saveBusinessInfo() {
  const businessInfo = {};
  businessInfoFieldNames.forEach((name) => {
    businessInfo[name] = invoiceForm.elements.namedItem(name).value;
  });
  businessInfo.logoDataUrl = businessLogoDataUrl;

  try {
    localStorage.setItem(businessInfoStorageKey, JSON.stringify(businessInfo));
    return true;
  } catch (error) {
    console.error("Could not save business information:", error);
    return false;
  }
}

async function restoreBusinessInfo() {
  let businessInfo;

  try {
    const storedBusinessInfo = localStorage.getItem(businessInfoStorageKey);
    if (!storedBusinessInfo) {
      return;
    }
    businessInfo = JSON.parse(storedBusinessInfo);
  } catch (error) {
    console.error("Could not read saved business information:", error);
    return;
  }

  if (!businessInfo || typeof businessInfo !== "object" || Array.isArray(businessInfo)) {
    console.error("Saved business information has an invalid format.");
    return;
  }

  businessInfoFieldNames.forEach((name) => {
    if (typeof businessInfo[name] === "string") {
      invoiceForm.elements.namedItem(name).value = businessInfo[name];
    }
  });

  if (typeof businessInfo.logoDataUrl === "string" && businessInfo.logoDataUrl) {
    const isSupportedLogo = /^data:image\/(?:png|jpeg|webp);base64,/i.test(businessInfo.logoDataUrl);
    if (!isSupportedLogo || businessInfo.logoDataUrl.length > maxBusinessLogoDataUrlLength) {
      console.error("Saved shop logo has an invalid format or exceeds the size limit.");
      businessLogoStatus.textContent = "The saved logo could not be restored. Choose an image up to 1 MB.";
      return;
    }

    try {
      await displayBusinessLogo(businessInfo.logoDataUrl);
      businessLogoStatus.textContent = "Saved shop logo restored.";
    } catch (error) {
      console.error("Could not restore saved shop logo:", error);
      businessLogoStatus.textContent = "The saved logo could not be loaded. Choose another image.";
    }
  }
}

function updateItemRemoveButtons() {
  const rows = invoiceItems.querySelectorAll("[data-item-row]");
  rows.forEach((row) => {
    row.querySelector(".item-remove").disabled = rows.length === 1;
  });
}

function updatePreview() {
  setPreviewValue("businessName", getFieldValue("businessName"));
  setPreviewValue("businessAddress", getFieldValue("businessAddress"));
  setPreviewValue("businessEmail", getFieldValue("businessEmail"));
  setPreviewValue("customerName", getFieldValue("customerName"));
  setPreviewValue("customerAddress", getFieldValue("customerAddress"));
  setPreviewValue("customerEmail", getFieldValue("customerEmail"));
  setPreviewValue("invoiceNumber", getFieldValue("invoiceNumber"));
  setPreviewValue("invoiceDate", formatDate(getFieldValue("invoiceDate")));
  setPreviewValue("dueDate", formatDate(getFieldValue("dueDate")));
  setPreviewValue("notes", getFieldValue("notes"));

  let subtotal = 0;
  const rows = Array.from(invoiceItems.querySelectorAll("[data-item-row]"));
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
    descriptionCell.dataset.label = "Description";
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

  const taxRate = Math.min(numberFrom(invoiceForm.elements.namedItem("taxRate")), 100);
  const taxAmount = subtotal * taxRate / 100;
  document.querySelector('[data-preview="subtotal"]').textContent = formatMoney(subtotal);
  document.querySelector('[data-preview="taxRateLabel"]').textContent = `(${taxRate}%)`;
  document.querySelector('[data-preview="taxAmount"]').textContent = formatMoney(taxAmount);
  document.querySelector('[data-preview="total"]').textContent = formatMoney(subtotal + taxAmount);
}

invoiceForm.addEventListener("input", updatePreview);
invoiceForm.addEventListener("change", updatePreview);

businessInfoFieldNames.forEach((name) => {
  const field = invoiceForm.elements.namedItem(name);
  field.addEventListener("input", saveBusinessInfo);
  field.addEventListener("change", saveBusinessInfo);
});

businessLogoInput.addEventListener("change", async () => {
  const file = businessLogoInput.files[0];
  if (!file) {
    return;
  }

  if (!supportedBusinessLogoTypes.includes(file.type)) {
    businessLogoStatus.textContent = "Choose a PNG, JPEG, or WebP image.";
    businessLogoInput.value = "";
    return;
  }
  if (file.size > maxBusinessLogoBytes) {
    businessLogoStatus.textContent = "Choose an image smaller than 1 MB.";
    businessLogoInput.value = "";
    return;
  }

  businessLogoInput.disabled = true;
  removeBusinessLogoButton.disabled = true;
  try {
    await displayBusinessLogo(await readFileAsDataUrl(file));
    const saved = saveBusinessInfo();
    businessLogoStatus.textContent = saved
      ? "Shop logo added and saved with your business information."
      : "Shop logo added to the preview, but could not be saved on this device.";
  } catch (error) {
    console.error("Could not load shop logo:", error);
    businessLogoStatus.textContent = "Could not load that image. Choose a valid PNG, JPEG, or WebP.";
    businessLogoInput.value = "";
    removeBusinessLogoButton.disabled = !businessLogoDataUrl;
  } finally {
    businessLogoInput.disabled = false;
  }
});

removeBusinessLogoButton.addEventListener("click", () => {
  businessLogoDataUrl = "";
  invoiceLogoPreview.removeAttribute("src");
  invoiceLogoPreview.hidden = true;
  defaultPreviewMark.hidden = false;
  removeBusinessLogoButton.disabled = true;
  businessLogoInput.value = "";

  const saved = saveBusinessInfo();
  businessLogoStatus.textContent = saved
    ? "Shop logo removed."
    : "Shop logo removed from the preview, but could not be saved on this device.";
});

addItemButton.addEventListener("click", () => {
  const newRow = itemTemplate.content.cloneNode(true);
  invoiceItems.append(newRow);
  updateItemRemoveButtons();
  updatePreview();
  invoiceItems.querySelector("[data-item-row]:last-child [data-item-description]").focus();
});

downloadInvoiceButton.addEventListener("click", async () => {
  if (!invoiceForm.checkValidity()) {
    invoiceForm.reportValidity();
    return;
  }

  if (typeof html2canvas !== "function" || typeof jspdf !== "object") {
    alert("PDF download libraries could not be loaded. Check your internet connection and try again.");
    return;
  }

  const originalText = downloadInvoiceButton.textContent;
  downloadInvoiceButton.disabled = true;
  downloadInvoiceButton.textContent = "Preparing PDF...";

  try {
    const canvas = await html2canvas(invoicePreview, {
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

    const invoiceNumber = invoiceForm.elements.namedItem("invoiceNumber").value.trim();
    pdf.save(`${invoiceNumber || "invoice"}.pdf`);
  } catch (error) {
    console.error("Could not create invoice PDF:", error);
    alert("Could not create the PDF. Please try again.");
  } finally {
    downloadInvoiceButton.disabled = false;
    downloadInvoiceButton.textContent = originalText;
  }
});

invoiceItems.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".item-remove");
  if (!removeButton || invoiceItems.querySelectorAll("[data-item-row]").length === 1) {
    return;
  }

  removeButton.closest("[data-item-row]").remove();
  updateItemRemoveButtons();
  updatePreview();
});

restoreBusinessInfo();
updateItemRemoveButtons();
updatePreview();
