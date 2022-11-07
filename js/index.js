function flip(elem, first) {
  //last
  const last = elem.getBoundingClientRect();

  //invert
  const deltaX = first.boundingRect.left - last.left;
  const deltaY = first.boundingRect.top - last.top;

  //   play
  elem.animate(
    [
      {
        transformOrigin: "top left",
        // transform: `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`,
        transform: `translate(${deltaX}px, ${deltaY}px)`,
      },
      {
        transformOrigin: "top left",
        transform: "none",
      },
    ],
    {
      duration: 500,
      easing: "ease-in-out",
      fill: "both",
    }
  );
}

function animateHeader() {
  const header$ = body$.querySelector("header");
  const logo$ = header$.querySelector("#logo");
  const searchBar$ = header$.querySelector("#search-bar");

  //first
  const logoFirst = {
    boundingRect: logo$.getBoundingClientRect(),
    offset: (logo$.offsetHeight - logo$.clientHeight) / 2,
  };
  const searchBarFirst = {
    boundingRect: searchBar$.getBoundingClientRect(),
    offset: (searchBar$.offsetHeight - searchBar$.clientHeight) / 2,
  };

  //last
  document.querySelector("body").classList.toggle("init");

  //play
  flip(logo$, logoFirst);
  flip(searchBar$, searchBarFirst);
}

const urls = Object.freeze({
  1: "https://www.thecocktaildb.com/api/json/v1/1/search.php?s=",
  2: "https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=",
  3: "https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=",
});

const favorites = new Map(JSON.parse(localStorage.getItem("favorites")));

function saveFavorites() {
  localStorage.setItem(
    "favorites",
    JSON.stringify(Array.from(favorites.entries()))
  );
}

function clearFavorites() {
  favorites.clear();
  saveFavorites();

  const children = favoritesPage$.querySelector("#favorites-list").children;
  for (let child of children) {
    child.classList.remove("favorite");
  }
  favoritesDetailsContent$
    .querySelector("#toggle-favorite-btn")
    .classList.remove("favorite");
}

function toggleFavorite(drink, toUpdate) {
  let isFavorite;
  if (favorites.has(drink.id)) {
    favorites.delete(drink.id);
    isFavorite = false;
  } else {
    favorites.set(drink.id, drink);
    isFavorite = true;
  }

  saveFavorites();

  toUpdate.forEach((el$) => el$.classList.toggle("favorite", isFavorite));
}

function removeFavorite(drink) {
  if (!favorites.has(drink.id)) return;

  favorites.delete(drink.id);
  saveFavorites();
}

function closeDetails(container$) {
  container$.classList.remove("active");
}

function createIngredientItem(ingredient, drink) {
  const li$ = document.createElement("li");
  li$.classList.add("ingredient");

  li$.innerHTML = `
    <h2>${ingredient.name}</h2>
    <p class="center ${ingredient.measure == null ? "not-specified" : ""}" >${
    ingredient.measure ?? "Not specified"
  }</p>
  `;

  const deleteBtn$ = document.createElement("button");
  deleteBtn$.classList.add("delete-btn", "btn");
  deleteBtn$.innerHTML = '<i class="fa-solid fa-trash"></i>';
  deleteBtn$.onclick = (_) => {
    drink.ingredients = drink.ingredients.filter(
      (x) => x.name != ingredient.name
    );
    li$.remove();
  };

  li$.appendChild(deleteBtn$);
  return li$;
}

function getCreateIngredientTemplate(ingredientList$, drink) {
  const li$ = document.createElement("li");
  li$.classList.add("ingredient", "ingredient-add");

  const nameInput$ = document.createElement("input");
  const measureInput$ = document.createElement("input");

  li$.appendChild(nameInput$);
  li$.appendChild(measureInput$);

  const errMessage$ = createIngredientItem({
    name: "",
    measure: "* The ingridient name cannot be null.",
  });
  errMessage$.lastChild.remove();
  errMessage$.style.display = "none";
  errMessage$.classList.add("favorite");

  const addBtn$ = document.createElement("button");
  addBtn$.classList.add("add-btn", "btn");
  addBtn$.innerHTML = '<i class="fa-solid fa-square-plus"></i>';
  addBtn$.onclick = (_) => {
    const name = nameInput$.value;
    if (!name) return (errMessage$.style.display = "flex");
    errMessage$.style.display = "none";
    const ingredient = {
      name,
      measure: !measureInput$.value ? null : measureInput$.value,
    };
    ingredientList$.insertBefore(createIngredientItem(ingredient, drink), li$);
    nameInput$.value = "";
    measureInput$.value = "";
    drink.ingredients.push(ingredient);
  };

  li$.appendChild(addBtn$);

  ingredientList$.appendChild(li$);
  ingredientList$.appendChild(errMessage$);
}

function showDetails(container$, drink, source$) {
  container$.querySelector(".title").innerHTML = `${drink.name} (${drink.id})`;
  container$.querySelector("img").src = drink.imgUrl;

  container$.parentElement.querySelector("#remove-drink-btn").onclick = (_) => {
    deleteDialog$.querySelector(".cancel").onclick = (_) =>
      deleteDialog$.close();
    deleteDialog$.querySelector(".delete").onclick = (_) => {
      source$.remove();
      closeDetails(container$);
      removeFavorite(drink);
      deleteDialog$.close();
    };
    deleteDialog$.showModal();
    // alert("to implement");
  };

  const toggleFavoriteBtn$ = container$.querySelector("#toggle-favorite-btn");
  toggleFavoriteBtn$.onclick = (_) =>
    toggleFavorite(drink, [source$, toggleFavoriteBtn$]);
  toggleFavoriteBtn$.classList.toggle("favorite", favorites.has(drink.id));

  const ingredientList$ = container$.querySelector(".section-content");
  ingredientList$.innerHTML = "";
  drink.ingredients.forEach((ingredient) => {
    const ingredient$ = createIngredientItem(ingredient, drink);
    ingredientList$.appendChild(ingredient$);
  });

  getCreateIngredientTemplate(ingredientList$, drink);

  container$.classList.add("active");
}

function createResultItem(container$, drink) {
  const li$ = document.createElement("li");
  li$.classList.add("result");
  li$.classList.toggle("favorite", favorites.has(drink.id));
  li$.innerHTML = `
    <div class="color-bar"></div>
    <div class="result-content">
      <img
        src="${drink.imgUrl}"
      />
      <div class="left">
        <div class="wrapper">
          <span class="name"> ${drink.name} (${drink.id}) </span>
          <span class="type"> ${drink.category} </span>
        </div>
      </div>
      <div class="right">
        <i class="fa-solid fa-heart"></i>
      </div>
    </div>
  `;
  li$.onclick = (_) => showDetails(container$, drink, li$);
  return li$;
}

function addResults(drinks) {
  const resultList$ = searchResults$.querySelector("#result-list");
  resultList$.querySelectorAll("li").forEach((el) => el.remove());

  drinks.forEach((drink) => {
    const result = createResultItem(searchDetailsContent$, drink);
    resultList$.insertBefore(result, resultList$.lastElementChild);
  });
}

async function search() {
  const container$ = main$.querySelector("#search-results .results");

  // start spinner
  container$.classList.remove("active");

  const filter = searchBar$.querySelector(".search-filter").value;
  const url = urls[filter];

  const query = searchBar$.querySelector(".search-input").value;

  let drinks;
  try {
    const res = await fetch(`${url}${query}`);
    const data = await res.json();
    drinks = data.drinks?.map((drink) => {
      const ingredients = [];
      for (let i = 1; i <= 15; i++) {
        if (drink[`strIngredient${i}`] == null) break;
        ingredients.push({
          name: drink[`strIngredient${i}`],
          measure: drink[`strMeasure${i}`],
        });
      }

      return {
        id: drink.idDrink,
        name: drink.strDrink,
        category: drink.strCategory,
        imgUrl: drink.strDrinkThumb,
        ingredients,
      };
    });

    searchResults$.querySelector(".empty").innerHTML = "Nothing found!";
  } catch (err) {
    searchResults$.querySelector(".empty").innerHTML =
      "Oops! Something went wrong... Please try again.";
  }

  addResults(drinks ?? []);

  // stop spinner
  container$.classList.add("active");
}

function startSearch() {
  navigate(true);
  closeDetails(searchDetailsContent$);
  if (body$.classList.contains("init")) {
    animateHeader();
    return setTimeout(search, 500);
  }

  search();
}

const body$ = document.querySelector("body");
const main$ = body$.querySelector("main");

const searchResults$ = main$.querySelector("#search-results");
const searchDetails$ = searchResults$.querySelector(".details");
const searchDetailsContent$ = searchDetails$.querySelector("#content");
searchDetailsContent$.querySelector("#close-content-btn").onclick = (_) =>
  closeDetails(searchDetailsContent$);

const searchBar$ = document.getElementById("search-bar");
searchBar$.onkeydown = (e) => {
  e.stopPropagation();

  if (e.keyCode !== 13) return;

  startSearch();
};
searchBar$.querySelector("#search-btn").onclick = startSearch;
searchBar$.querySelector("input").focus();

const nav$ = body$.querySelector("nav");
const searchBtn$ = nav$.querySelector(".nav-link:first-child");
const favoriteBtn$ = nav$.querySelector(".nav-link:last-child");

function navigate(toSearch) {
  favoriteBtn$.classList.toggle("active", !toSearch);
  searchBtn$.classList.toggle("active", toSearch);

  const searchPage$ = main$.querySelector("#search-results");
  const favoritePage$ = main$.querySelector("#favorites-page");

  favoritePage$.classList.toggle("active", !toSearch);
  searchPage$.classList.toggle("active", toSearch);
}

const navigateToSearch = (_) => startSearch();
const navigateToFavorites = (_) => {
  const container$ = favoritesPage$.querySelector(".favorites");

  // start spinner
  container$.classList.remove("active");

  navigate(false);
  closeDetails(favoritesDetailsContent$);
  if (body$.classList.contains("init")) {
    animateHeader();
    return setTimeout((_) => {
      initFavorites();

      // start spinner
      container$.classList.add("active");
    }, 500);
  }
  initFavorites();

  // start spinner
  container$.classList.add("active");
};

searchBtn$.onclick = (_) => {
  if (!searchBtn$.classList.contains("active")) navigateToSearch();
};
favoriteBtn$.onclick = navigateToFavorites;

// Favorites
function initFavorites() {
  const favoritesList$ = favoritesPage$.querySelector("#favorites-list");
  favoritesList$.querySelectorAll("li").forEach((el) => el.remove());

  for (let [_, drink] of favorites.entries()) {
    const result = createResultItem(favoritesDetailsContent$, drink);
    favoritesList$.insertBefore(result, favoritesList$.lastElementChild);
  }
}

const favoritesPage$ = main$.querySelector("#favorites-page");
const favoritesDetails$ = favoritesPage$.querySelector(".details");
const favoritesDetailsContent$ = favoritesDetails$.querySelector("#content");
favoritesDetailsContent$.querySelector("#close-content-btn").onclick = (_) =>
  closeDetails(favoritesDetailsContent$);

favoritesPage$.querySelector("#clear-favorites-btn").onclick = (_) =>
  clearFavorites();

initFavorites();

const deleteDialog$ = main$.querySelector("#delete-dialog");
