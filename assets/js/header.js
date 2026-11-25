const headerPlaceholder = document.querySelector("[data-site-header]");

if (headerPlaceholder) {
  const scriptUrl = new URL(document.currentScript.src);
  const partialUrl = new URL("../../partials/header.html", scriptUrl);
  const indexUrl = new URL("../../index.html", scriptUrl);

  fetch(partialUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load the shared header (${response.status}).`);
      }
      return response.text();
    })
    .then((headerHtml) => {
      headerPlaceholder.outerHTML = headerHtml;
      const brandLink = document.querySelector(".brand");
      if (brandLink) {
        brandLink.href = indexUrl.href;
      }
    })
    .catch((error) => {
      console.error("Could not load the shared header:", error);
    });
}
