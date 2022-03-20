const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// create a reference to the notifications list in the bottom of the app; we will write database messages into this list by
//appending list items as children of this element
const note = document.getElementById('notifications');

// create an instance of a db object for us to store the IDB data in
let db;

// create a blank instance of the object that is used to transfer data into the IDB. This is mainly for reference
const newItem = [
  { taskTitle: '', hours: 0, minutes: 0, day: 0, month: '', year: 0, notified: 'no' },
];

// all the variables we need for the app
const taskList = document.getElementById('task-list');

const taskForm = document.getElementById('task-form');
const title = document.getElementById('title');

const hours = document.getElementById('deadline-hours');
const minutes = document.getElementById('deadline-minutes');
const day = document.getElementById('deadline-day');
const month = document.getElementById('deadline-month');
const year = document.getElementById('deadline-year');

const submit = document.getElementById('submit');

const notificationBtn = document.getElementById('enable');

// Do an initial check to see what the notification permission state is

if (Notification.permission === 'denied' || Notification.permission === 'default') {
  notificationBtn.style.display = 'block';
} else {
  notificationBtn.style.display = 'none';
}

window.onload = function() {
  note.appendChild(createListItem('App initialised.'));
  // In the following line, you should include the prefixes of implementations you want to test.
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  // DON'T use 'var indexedDB = ...' if you're not in a function.
  // Moreover, you may need references to some window.IDB* objects:
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

  // Let us open our database
  const DBOpenRequest = window.indexedDB.open('toDoList', 4);

  // Gecko-only IndexedDB temp storage option:
  // var request = window.indexedDB.open('toDoList', {version: 4, storage: 'temporary'});

  // these two event handlers act on the database being opened successfully, or not
  DBOpenRequest.onerror = function(event) {
    note.appendChild(createListItem('Error loading database.'));
  };

  DBOpenRequest.onsuccess = function(event) {
    note.appendChild(createListItem('Database initialised.'));

    // store the result of opening the database in the db variable. This is used a lot below
    db = DBOpenRequest.result;

    // Run the displayData() function to populate the task list with all the to-do list data already in the IDB
    displayData();
  };

  // This event handles the event whereby a new version of the database needs to be created
  // Either one has not been created before, or a new version number has been submitted via the
  // window.indexedDB.open line above
  //it is only implemented in recent browsers
  DBOpenRequest.onupgradeneeded = function(event) {
    const db = event.target.result;

    db.onerror = function(event) {
      note.appendChild(createListItem('Error loading database.'));
    };

    // Create an objectStore for this database

    const objectStore = db.createObjectStore('toDoList', { keyPath: 'taskTitle' });

    // define what data items the objectStore will contain

    objectStore.createIndex('hours', 'hours', { unique: false });
    objectStore.createIndex('minutes', 'minutes', { unique: false });
    objectStore.createIndex('day', 'day', { unique: false });
    objectStore.createIndex('month', 'month', { unique: false });
    objectStore.createIndex('year', 'year', { unique: false });

    objectStore.createIndex('notified', 'notified', { unique: false });

    note.appendChild(createListItem('Object store created.'));
  };

  function displayData() {
    // first clear the content of the task list so that you don't get a huge long list of duplicate stuff each time
    //the display is updated.
    while (taskList.firstChild) {
      taskList.removeChild(taskList.lastChild);
    }

    // Open our object store and then get a cursor list of all the different data items in the IDB to iterate through
    const objectStore = db.transaction('toDoList').objectStore('toDoList');
    objectStore.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      // if there are no (more) cursor items to iterate through, say so, and exit the function
      if (!cursor) { 
        note.appendChild(createListItem('Entries all displayed.'));
        return;
      }
      // if there is still another cursor to go, keep runing this code
      // check which suffix the deadline day of the month needs
      const { hours, minutes, day, month, year, notified, taskTitle } = cursor.value;
      const ordDay = ordinal(day);

      // build the to-do list entry and put it into the list item.
      const toDoText = `${taskTitle} — ${hours}:${minutes}, ${month} ${ordDay} ${year}.`;
      const listItem = createListItem(toDoText);

      if (notified === 'yes') {
        listItem.style.textDecoration = 'line-through';
        listItem.style.color = 'rgba(255,0,0,0.5)';
      }

      // put the item item inside the task list
      taskList.appendChild(listItem);

      // create a delete button inside each list item, giving it an event handler so that it runs the deleteButton()
      // function when clicked
      const deleteButton = document.createElement('button');
      listItem.appendChild(deleteButton);
      deleteButton.textContent = 'X';
      // here we are setting a data attribute on our delete button to say what task we want deleted if it is clicked!
      deleteButton.setAttribute('data-task', taskTitle);
      deleteButton.onclick = function(event) {
        deleteItem(event);
      };

      // continue on to the next item in the cursor
      cursor.continue();
    };
  };

  // give the form submit button an event listener so that when the form is submitted the addData() function is run
  taskForm.addEventListener('submit', addData, false);

  function addData(e) {
    // prevent default - we don't want the form to submit in the conventional way
    e.preventDefault();

    // Stop the form submitting if any values are left empty. This is just for browsers that don't support the HTML5 form
    // required attributes
    if (title.value === '' || hours.value === null || minutes.value === null || day.value === '' || month.value === '' || year.value === null) {
      note.appendChild(createListItem('Data not submitted — form incomplete.'));
      return;
    }
    // grab the values entered into the form fields and store them in an object ready for being inserted into the IDB
    const newItem = [
      { taskTitle: title.value, hours: hours.value, minutes: minutes.value, day: day.value, month: month.value, year: year.value, notified: 'no' },
    ];

    // open a read/write db transaction, ready for adding the data
    const transaction = db.transaction(['toDoList'], 'readwrite');

    // report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
      note.appendChild(createListItem('Transaction completed: database modification finished.'));

      // update the display of data to show the newly added item, by running displayData() again.
      displayData();
    };

    transaction.onerror = function() {
      note.appendChild(createListItem(`Transaction not opened due to error: ${transaction.error}`));
    };

    // call an object store that's already been added to the database
    const objectStore = transaction.objectStore('toDoList');
    console.log(objectStore.indexNames);
    console.log(objectStore.keyPath);
    console.log(objectStore.name);
    console.log(objectStore.transaction);
    console.log(objectStore.autoIncrement);

    // Make a request to add our newItem object to the object store
    const objectStoreRequest = objectStore.add(newItem[0]);
    objectStoreRequest.onsuccess = function(event) {

      // report the success of our request
      // (to detect whether it has been succesfully
      // added to the database, you'd look at transaction.oncomplete)
      note.appendChild(createListItem('Request successful.'));

      // clear the form, ready for adding the next entry
      title.value = '';
      hours.value = null;
      minutes.value = null;
      day.value = 01;
      month.value = 'January';
      year.value = 2020;
    };
  };

  function deleteItem(event) {
    // retrieve the name of the task we want to delete
    const dataTask = event.target.getAttribute('data-task');

    // open a database transaction and delete the task, finding it by the name we retrieved above
    const transaction = db.transaction(['toDoList'], 'readwrite');
    transaction.objectStore('toDoList').delete(dataTask);

    // report that the data item has been deleted
    transaction.oncomplete = function() {
      // delete the parent of the button, which is the list item, so it no longer is displayed
      event.target.parentNode.parentNode.removeChild(event.target.parentNode);
      note.appendChild(createListItem(`Task "${dataTask}" deleted.`));
    };
  };

  // this function checks whether the deadline for each task is up or not, and responds appropriately
  function checkDeadlines() {
    // First of all check whether notifications are enabled or denied
    if (Notification.permission === 'denied' || Notification.permission === 'default') {
      notificationBtn.style.display = 'block';
    } else {
      notificationBtn.style.display = 'none';
    }

    // grab the time and date right now
    const now = new Date();

    // from the now variable, store the current minutes, hours, day of the month (getDate is needed for this, as getDay
    // returns the day of the week, 1-7), month, year (getFullYear needed; getYear is deprecated, and returns a weird value
    // that is not much use to anyone!) and seconds
    const minuteCheck = now.getMinutes();
    const hourCheck = now.getHours();
    const dayCheck = now.getDate();
    const monthCheck = now.getMonth();
    const yearCheck = now.getFullYear();

    // again, open a transaction then a cursor to iterate through all the data items in the IDB
    const objectStore = db.transaction(['toDoList'], 'readwrite').objectStore('toDoList');
    objectStore.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if (!cursor) return;
      const { hours, minutes, day, month, year, notified, taskTitle } = cursor.value;

      // convert the month names we have installed in the IDB into a month number that JavaScript will understand.
      // The JavaScript date object creates month values as a number between 0 and 11.
      const monthNumber = MONTHS.indexOf(month);
      if (monthNumber === -1) alert('Incorrect month entered in database.');
      
      // check if the current hours, minutes, day, month and year values match the stored values for each task in the IDB.
      // The + operator in this case converts numbers with leading zeros into their non leading zero equivalents, so e.g.
      // 09 -> 9. This is needed because JS date number values never have leading zeros, but our data might.
      // The secondsCheck = 0 check is so that you don't get duplicate notifications for the same task. The notification
      // will only appear when the seconds is 0, meaning that you won't get more than one notification for each task
      let mached = parseInt(hours) === hourCheck;
      mached &&= parseInt(minutes) === minuteCheck;
      mached &&= parseInt(day) === dayCheck;
      mached &&= parseInt(monthNumber) === monthCheck;
      mached &&= parseInt(year) === yearCheck;
      if (mached && notified === 'no') {
        // If the numbers all do match, run the createNotification() function to create a system notification
        // but only if the permission is set

        if (Notification.permission === 'granted') {
          createNotification(taskTitle);
        }
      }

      // move on and perform the same deadline check on the next cursor item
      cursor.continue();
    };
  };


  // askNotificationPermission function to ask for permission when the 'Enable notifications' button is clicked

  function askNotificationPermission() {
    // function to actually ask the permissions
    function handlePermission(permission) {
      // Whatever the user answers, we make sure Chrome stores the information
      if (!Reflect.has(Notification, 'permission')) {
        Notification.permission = permission;
      }

      // set the button to shown or hidden, depending on what the user answers
      if (Notification.permission === 'denied' || Notification.permission === 'default') {
        notificationBtn.style.display = 'block';
      } else {
        notificationBtn.style.display = 'none';
      }
    };

    // Let's check if the browser supports notifications
    if (!Reflect.has(window, 'Notification')) {
      console.log('This browser does not support notifications.');
    } else {
      if (checkNotificationPromise()) {
        Notification.requestPermission()
        .then((permission) => {
          handlePermission(permission);
        });
      } else {
        Notification.requestPermission(function(permission) {
          handlePermission(permission);
        });
      }
    }
  };

  // Function to check whether browser supports the promise version of requestPermission()
  // Safari only supports the old callback-based version
  function checkNotificationPromise() {
    try {
      Notification.requestPermission().then();
    } catch(e) {
      return false;
    }

    return true;
  };

  // wire up notification permission functionality to 'Enable notifications' button

  notificationBtn.addEventListener('click', askNotificationPermission);

  function createListItem(contents) {
    const listItem = document.createElement('li');
    listItem.textContent = contents;
    return listItem;
  };

  // function for creating the notification
  function createNotification(title) {

    // Create and show the notification
    const img = '/to-do-notifications/img/icon-128.png';
    const text = `HEY! Your task "${title}" is now overdue.`;
    const notification = new Notification('To do list', { body: text, icon: img });

    // we need to update the value of notified to 'yes' in this particular data object, so the
    // notification won't be set off on it again

    // first open up a transaction as usual
    const objectStore = db.transaction(['toDoList'], 'readwrite').objectStore('toDoList');

    // get the to-do list object that has this title as it's title
    const objectStoreTitleRequest = objectStore.get(title);

    objectStoreTitleRequest.onsuccess = function() {
      // grab the data object returned as the result
      const data = objectStoreTitleRequest.result;

      // update the notified value in the object to 'yes'
      data.notified = 'yes';

      // create another request that inserts the item back into the database
      const updateTitleRequest = objectStore.put(data);

      // when this new request succeeds, run the displayData() function again to update the display
      updateTitleRequest.onsuccess = function() {
        displayData();
      };
    };
  };

  // using a setInterval to run the checkDeadlines() function every second
  setInterval(checkDeadlines, 1000);
}

const ordinal = (day) => {
  const n = day.toString();
  const last = n.slice(-1);
  if (last === '1') return `${n}st`;
  if (last === '2') return `${n}nd`;
  if (last === '3') return `${n}rd`;
  return `${n}th`;
};