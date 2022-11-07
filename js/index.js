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
    offset: (logo$.offsetHeight - logo$.clientHeight) / 2
  };
  const searchBarFirst = {
    boundingRect: searchBar$.getBoundingClientRect(),
    offset: (searchBar$.offsetHeight - searchBar$.clientHeight) / 2
  };

  //last
  document.querySelector("body").classList.toggle("init");

  //play
  flip(logo$, logoFirst);
  flip(searchBar$, searchBarFirst);
}

const urls = Object.freeze({
  1: 'https://www.thecocktaildb.com/api/json/v1/1/search.php?s=',
  2: 'https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=',
  3: 'https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=',
});

const favorites = new Map(JSON.parse(localStorage.getItem("favorites")));

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(Array.from(favorites.entries())));
}

function clearFavorites() {
  favorites.clear();
  saveFavorites();

  const children = searchResults$.querySelector("#result-list").children
  for(let child of children) {
    child.classList.remove('favorite');
  }
  detailsContent$.querySelector('#toggle-favorite-btn').classList.remove('favorite');
}

function toggleFavorite(drink, toUpdate) {
  let isFavorite;
  if(favorites.has(drink.id)) {
    favorites.delete(drink.id);
    isFavorite = false;
  } else {
    favorites.set(drink.id, drink);
    isFavorite = true;
  }

  saveFavorites();
  
  toUpdate.forEach(el$ => el$.classList.toggle('favorite', isFavorite));
}

function closeDetails() {
  detailsContent$.classList.remove('active');
}

function createIngredientItem(ingredient, drink) {
  const li$ = document.createElement('li');
  li$.classList.add('ingredient');
  
  li$.innerHTML = `
    <h2>${ingredient.name}</h2>
    <p class="center ${ingredient.measure == null ? 'not-specified' : ''}" >${ingredient.measure ?? 'Not specified'}</p>
  `;

  const deleteBtn$ = document.createElement('button');
  deleteBtn$.classList.add('delete-btn', 'btn');
  deleteBtn$.innerHTML = '<i class="fa-solid fa-trash"></i>';
  deleteBtn$.onclick = _ => { 
    drink.ingredients = drink.ingredients.filter(x => x.name != ingredient.name);
    li$.remove();
  }

  li$.appendChild(deleteBtn$);
  return li$;
}

function getCreateIngredientTemplate(ingredientList$, drink) {
  const li$ = document.createElement('li');
  li$.classList.add('ingredient', 'ingredient-add');

  const nameInput$ = document.createElement('input');
  const measureInput$ = document.createElement('input');

  li$.appendChild(nameInput$);
  li$.appendChild(measureInput$);

  const errMessage$ = createIngredientItem({name: "", measure: "* The ingridient name cannot be null."});
  errMessage$.lastChild.remove();
  errMessage$.style.display = 'none';
  errMessage$.classList.add('favorite');

  const addBtn$ = document.createElement('button');
  addBtn$.classList.add('add-btn', 'btn');
  addBtn$.innerHTML = '<i class="fa-solid fa-square-plus"></i>';
  addBtn$.onclick = _ => {
    const name = nameInput$.value;
    if(!name) return errMessage$.style.display = 'flex';
    errMessage$.style.display = 'none';
    const ingredient = {
      name,
      measure: (!measureInput$.value) ? null : measureInput$.value,
    };
    ingredientList$.insertBefore(createIngredientItem(ingredient, drink), li$);
    nameInput$.value = '';
    measureInput$.value = '';
    drink.ingredients.push(ingredient);
  }

  li$.appendChild(addBtn$);

  ingredientList$.appendChild(li$);
  ingredientList$.appendChild(errMessage$);
}

function showDetails(drink, source$) {
  detailsContent$.querySelector('.title').innerHTML = `${drink.name} (${drink.id})`;
  detailsContent$.querySelector('img').src = drink.imgUrl;

  details$.querySelector('#remove-drink-btn').onclick = _ => alert('to implement')

  const toggleFavoriteBtn$ = detailsContent$.querySelector('#toggle-favorite-btn');
  toggleFavoriteBtn$.onclick = _ => toggleFavorite(drink, [source$, toggleFavoriteBtn$]);
  toggleFavoriteBtn$.classList.toggle('favorite', favorites.has(drink.id))

  const ingredientList$ = detailsContent$.querySelector('.section-content');
  ingredientList$.innerHTML = '';
  drink.ingredients.forEach(ingredient => {
    const ingredient$ = createIngredientItem(ingredient, drink);
    ingredientList$.appendChild(ingredient$);
  });

  getCreateIngredientTemplate(ingredientList$, drink)

  detailsContent$.classList.add('active');
}

function createResultItem(drink) {
  const li$ = document.createElement('li');
  li$.classList.add('result');
  li$.classList.toggle('favorite', favorites.has(drink.id))
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
  li$.onclick = _ => showDetails(drink, li$);
  return li$;
}

function addResults(drinks) {
  const resultList$ = searchResults$.querySelector("#result-list");
  resultList$.innerHTML = '';

  if(drinks.length == 0) return searchResults$.querySelector('.empty').style.display = 'flex';
  else searchResults$.querySelector('.empty').style.display = 'none';

  drinks.forEach(drink => {
    const result = createResultItem(drink);
    resultList$.appendChild(result);
  });
}

async function search() {
  const container$ = main$.querySelector("#search-results .results");

  // start spinner
  container$.classList.remove('active');

  const filter = searchBar$.querySelector('.search-filter').value;
  const url = urls[filter];

  const query = searchBar$.querySelector('.search-input').value;

  let drinks;
  try {
    const res = await fetch(`${url}${query}`)
    const data = await res.json()
    drinks = data.drinks?.map(drink => {
      const ingredients = [];
      for(let i = 1; i <= 15; i++) {
        if(drink[`strIngredient${i}`] == null) break;
        ingredients.push({
          name: drink[`strIngredient${i}`],
          measure: drink[`strMeasure${i}`]
        })
      }
  
      return {
        id: drink.idDrink,
        name: drink.strDrink,
        category: drink.strCategory,
        imgUrl: drink.strDrinkThumb,
        ingredients
      };
    });

    searchResults$.querySelector('.empty').innerHTML = 'Nothing found!'
  } catch (err) {
    searchResults$.querySelector('.empty').innerHTML = 'Oops! Something went wrong... Please try again.'
  }

  addResults(drinks ?? []);

  // stop spinner
  container$.classList.add('active');
}

const body$ = document.querySelector("body");
const main$ = body$.querySelector("main");

const searchResults$ = main$.querySelector('#search-results');
const details$ = searchResults$.querySelector('.details');
const detailsContent$ = details$.querySelector('#content');
detailsContent$.querySelector('#close-content-btn').onclick = closeDetails

const searchBar$ = document.getElementById("search-bar");
searchBar$.onkeydown = (e) => {
  e.stopPropagation();

  if (e.keyCode !== 13) return;

  if(body$.classList.contains('init')) {
    animateHeader();
    return setTimeout(search, 500);
  }

  search();
};
searchBar$.querySelector('#search-btn').onclick = search
searchBar$.querySelector("input").focus();