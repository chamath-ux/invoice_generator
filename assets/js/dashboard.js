const categoryFilter = document.getElementById("tool-category-filter");
const toolCards = Array.from(document.querySelectorAll(".tool-card"));
const filterStatus = document.getElementById("tool-filter-status");

function filterTools() {
  const selectedCategory = categoryFilter.value;
  let visibleCount = 0;

  toolCards.forEach((card) => {
    const isVisible = selectedCategory === "all" || card.dataset.category === selectedCategory;
    card.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
    }
  });

  const selectedOption = categoryFilter.selectedOptions[0];
  filterStatus.textContent = selectedCategory === "all"
    ? `Showing all ${visibleCount} tools.`
    : `Showing ${visibleCount} ${selectedOption.textContent} ${visibleCount === 1 ? "tool" : "tools"}.`;
}

categoryFilter.addEventListener("change", filterTools);
filterTools();
