// App logic.
window.myApp = {};

let apiData = [];
let userData = [];

document.addEventListener('init', function (event) {

    // init indexedDB
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) {
        ons.notification.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
    }
    var page = event.target;

    // Each page calls its own initialization controller.
    if (myApp.controllers.hasOwnProperty(page.id)) {
        myApp.controllers[page.id](page);
    }

    // shortcuts for list page and create page
    document.addEventListener('keydown', onKeyDown);

    function onKeyDown(event) {
        console.log('keydown event triggered');
        const cmd = event.ctrlKey && (event.altKey || event.metaKey);
        if (cmd && event.key === 'l') {
            const backBtn = page.querySelector('ons-back-button .back-button__label');
            if (backBtn) {
                backBtn.click();
            }
        } else if (cmd && event.key === 'c') {
            const divNewRecipe = document.querySelector("#div-new-recipe");
            if (!divNewRecipe) {
                document.querySelector('#myNavigator').pushPage('src/html/new_recipe.html');
            }
        }
    }

    // Fill the lists with initial data when the pages we need are ready.
    // This only happens once at the beginning of the app.
    if (page.id === 'menuPage' || page.id === 'recipesPage') {
        if (document.querySelector('#menuPage')
            && document.querySelector('#recipesPage')
            && !document.querySelector('#recipesPage ons-list-item')
        ) {
            // api data
            const proxy = "https://calm-tor-18718.herokuapp.com";
            const mealUrl = "https://www.themealdb.com/api/json/v1/1/search.php?f=a";
            const url = `${proxy}/${mealUrl}`;
            fetch(url, {
                method: "GET",
                mode: "cors",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
            })
                .then(resp => resp.json())
                .then(function (data) {
                    console.log('data', data);
                    apiData = data.meals;
                    data.meals.forEach(function (data) {
                        myApp.services.recipes.create(data);
                    });
                });
            // indexedDB data
            const dbName = "MyRecipes";
            let request = window.indexedDB.open(dbName, 2), db, tx, store, index;
            request.onerror = function (e) {
                console.log('there was an error: ' + e.target.errorCode);
            }
            request.onsuccess = function (e) {
                db = e.target.result;
                tx = db.transaction("recipesStore", "readwrite");
                store = tx.objectStore("recipesStore");
                index = store.index("strMeal");

                db.onerror = function (e) {
                    console.log("ERROR" + e.target.errorCode);
                };
                const data = store.getAll();
                tx.oncomplete = function () {
                    userData = data.result;
                    data.result.forEach(function (data) {
                        myApp.services.recipes.create(data);
                    })
                    db.close();
                };
            };
            request.onupgradeneeded = function (e) {
                let db = e.target.result,
                    store = db.createObjectStore("recipesStore", {keyPath: "strMeal"});
                // store = db.createObjectStore("recipesStore", {autoIncrement:true});

                // Create an index to search customers by name. We may have duplicates
                // so we can't use a unique index.
                index = store.createIndex("strMeal", "strMeal", {unique: false})
            };
        }
    }
});
