/***********************************************************************
 * App Controllers. These controllers will be called on page initialization. *
 ***********************************************************************/

myApp.controllers = {

    //////////////////////////
    // Tabbar Page Controller //
    //////////////////////////
    tabbarPage: function (page) {
        // set input functionality to search the recipes
        const searchInput = page.querySelector("#recipe_search_input");
        searchInput.addEventListener('input', function (event) {
            const searchValue = searchInput.value.toLocaleLowerCase();
            let recipeList = document.querySelector('#recipe-list');
            recipeList.textContent = null;
            userData.filter((userEl) => userEl.strMeal.toLocaleLowerCase().indexOf(searchValue) > -1).forEach(function (data) {
                myApp.services.recipes.create(data);
            })
            apiData.filter((apiEl) => apiEl.strMeal.toLocaleLowerCase().indexOf(searchValue) > -1).forEach(function (data) {
                myApp.services.recipes.create(data);
            });
        })
        // Set button functionality to push 'new_recipe.html' page.
        Array.prototype.forEach.call(page.querySelectorAll('[component="button/new-task"]'), function (element) {
            element.style.cursor = 'pointer';
            element.onclick = function () {
                if (!window.indexedDB) {
                    ons.notification.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
                } else {
                    document.querySelector('#myNavigator').pushPage('src/html/new_recipe.html');
                }
            };

            element.show && element.show(); // Fix ons-fab in Safari.
        });

        // Change tabbar animation depending on platform.
        page.querySelector('#myTabbar').setAttribute('animation', ons.platform.isAndroid() ? 'slide' : 'none');
    },

    ////////////////////////////
    // New Task Page Controller //
    ////////////////////////////
    newRecipePage: function (page) {
        const notificationDiv = page.querySelector('#enable-notification-div');
        const notificationBtn = page.querySelector('#enable-notification-btn');
        // Do an initial check to see what the notification permission state is
        if (window.Notification.permission === 'denied' || window.Notification.permission === 'default') {
            notificationBtn.style.display = 'block';
        } else {
            notificationDiv.style.display = 'none';
        }

        // ask notification permission
        function askNotificationPermission() {
            // function to actually ask the permissions
            function handlePermission(permission) {
                // Whatever the user answers, we make sure Chrome stores the information
                if (!('permission' in window.Notification)) {
                    window.Notification.permission = permission;
                }

                // set the button to shown or hidden, depending on what the user answers
                if (window.Notification.permission === 'denied' || window.Notification.permission === 'default') {
                    notificationBtn.style.display = 'block';
                } else {
                    notificationBtn.style.display = 'none';
                }
            }

            // Let's check if the browser supports notifications
            if (!"Notification" in window) {
                console.log("This browser does not support notifications.");
            } else {
                if (checkNotificationPromise()) {
                    window.Notification.requestPermission()
                        .then((permission) => {
                            handlePermission(permission);
                        })
                } else {
                    window.Notification.requestPermission(function (permission) {
                        handlePermission(permission);
                    });
                }
            }
        }

        // Function to check whether browser supports the promise version of requestPermission()
        // Safari only supports the old callback-based version
        function checkNotificationPromise() {
            try {
                window.Notification.requestPermission().then();
            } catch (e) {
                return false;
            }

            return true;
        }

        // wire up notification permission functionality to "Enable notifications" button

        notificationBtn.addEventListener('click', askNotificationPermission);

        // function for creating the notification
        function createNotification(title) {

            // Create and show the notification
            let img = 'pwa-recipe/assets/images/recipe_created.png';
            let text = 'HEY! Your recipe "' + title + '" is now created.';
            let notification = new Notification('Recipe list', {body: text, icon: img});
        }

        // Set button functionality to save a new task.
        Array.prototype.forEach.call(page.querySelectorAll('[component="button/save-task"]'), function (element) {
            element.onclick = function () {
                if (!window.indexedDB) {
                    console.log("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
                } else {
                    const newTitle = page.querySelector('#recipe-title').value;
                    const newCategory = page.querySelector("#recipe-category").value;
                    const newArea = page.querySelector("#recipe-area").value;
                    const newTags = page.querySelector("#recipe-area").value;
                    const newInstructions = page.querySelector("#recipe-instructions").value;

                    if (newTitle && newCategory && newArea && newTags && newInstructions) {
                        // If input title is not empty, create a new task.
                        const newRecipe = {
                            strMeal: newTitle,
                            strCategory: newCategory,
                            strArea: newArea,
                            strTags: newTags,
                            strInstructions: newInstructions,
                            userCreated: true
                        }

                        // save to indexedDB
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
                            store.put({
                                strMeal: newTitle,
                                strCategory: newCategory,
                                strArea: newArea,
                                strTags: newTags,
                                strInstructions: newInstructions,
                                userCreated: true
                            });
                            const data = store.getAll();
                            // Use transaction oncomplete to make sure the objectStore creation is
                            // finished before adding data into it.
                            tx.oncomplete = function () {
                                createNotification(newRecipe.strMeal);
                                myApp.services.recipes.create(newRecipe, data.result.length);
                                document.querySelector('#myNavigator').popPage();
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
                    } else {
                        // Show alert if the input title is empty.
                        ons.notification.alert('You must provide all of the recipe info');
                    }
                }
            };
        });
    },

    ////////////////////////////////
    // Details Task Page Controller //
    ///////////////////////////////
    detailsRecipePage: async function (page) {
        // Wake Lock API
        if ('wakeLock' in window.navigator) {
            const wakeLockDiv = page.querySelector("#wake-lock-div");

            // Create a reference for the Wake Lock.
            let wakeLock = null;

            // create an async function to request a wake lock
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLockDiv.textContent = 'Wake Lock is active!';
                wakeLock.addEventListener('release', () => {
                    // the wake lock has been released
                    wakeLockDiv.textContent = 'Wake Lock has been released';
                });

                document.addEventListener('visibilitychange', async () => {
                    if (wakeLock !== null && document.visibilityState === 'visible') {
                        wakeLock = await navigator.wakeLock.request('screen');
                    }
                });

            } catch (err) {
                // The Wake Lock request has failed - usually system related, such as battery.
                wakeLockDiv.textContent = `${err.name}, ${err.message}`;
            }

        } else {
            ons.notification.alert('Wake Lock is not supported by this browser.');
        }

        // Get the element passed as argument to pushPage.
        const element = page.data.element;

        // Fill the view with the stored data.
        page.querySelector('#recipe-title').textContent = element.data.strMeal;
        page.querySelector('#recipe-category').textContent = element.data.strCategory;
        page.querySelector('#recipe-instructions').textContent = element.data.strInstructions;
        page.querySelector("#recipe-area").textContent = element.data.strArea;
        page.querySelector("#recipe-tags").textContent = element.data.strTags;

        // Share API
        const shareBtn = page.querySelector("#share-btn");
        shareBtn.addEventListener('click', async function () {
            try {
                const shareData = {
                    title: element.data.strMeal,
                    text: element.data.strInstructions
                }
                await window.navigator.share(shareData);
            } catch (err) {
                ons.notification.alert('Error: ' + err);
            }
        });
    }
};
