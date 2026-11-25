const headerPlaceholder = document.querySelector("[data-site-header]");

if (headerPlaceholder) {
  fetch("header.html")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load the shared header (${response.status}).`);
      }
      return response.text();
    })
    .then((headerHtml) => {
      headerPlaceholder.outerHTML = headerHtml;
    })
    .catch((error) => {
      console.error("Could not load the shared header:", error);
    });
}
