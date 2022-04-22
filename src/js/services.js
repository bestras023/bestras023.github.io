/***********************************************************************************
 * App Services. This contains the logic of the application organised in modules/objects. *
 ***********************************************************************************/

myApp.services = {
  recipes: {

    // Creates a new recipe and attaches it to the recipe list.
    create: function(data, index = -1) {
      // Task item template.
      var taskItem = ons.createElement(
        '<ons-list-item tappable>'  +
          '<div class="center">' +
            data.strMeal +
          '</div>' +
        '</ons-list-item>'
      );

      // Store data within the element.
      taskItem.data = data;

      // Add functionality to push 'details_recipe.html' page with the current element as a parameter.
      taskItem.style.cursor = 'pointer';
      taskItem.querySelector('.center').onclick = function() {
        document.querySelector('#myNavigator')
          .pushPage('src/html/details_recipe.html',
            {
              animation: 'lift',
              data: {
                element: taskItem
              }
            }
          );
      };

      // Add the highlight if necessary.
      if (taskItem.data.userCreated) {
        taskItem.classList.add('highlight');
      }

      // Insert urgent recipes at the top and non urgent recipes at the bottom.
      let recipeList = document.querySelector('#recipe-list');
      recipeList.insertBefore(taskItem, index === -1 ? null: recipeList.childNodes[index]);
    }
  }
};
