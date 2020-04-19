// web app's Firebase configuration goes here

// Initialize Firebase
firebase.initializeApp(firebaseConfig);


/////////ATHENTICATION//////////

// sign out
async function signOut() {
  await firebase.auth().signOut().then(function() {
    // Sign-out successful.
    window.location.pathname = '/';
  }).catch(function(error) {
    // An error happened.
  });
}

// sign in with email and password
async function signIn(email, password) {
  return await firebase.auth().signInWithEmailAndPassword(email, password);
}

// authenticate new user
async function createNewUser(email, password) {
  return await firebase.auth().createUserWithEmailAndPassword(email, password);
}

/////////DATABASE//////////

//initialize firestore
var db = firebase.firestore();

// initialize new user
async function initializeNewUserData(firstName, lastName, userCategory) {
  await firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      addUserToDB(user.uid, firstName, lastName, userCategory, user.email);
    };
  })
}

// add new user data to db
async function addUserToDB(uid, firstName, lastName, userCategory, userEmail) {
  console.log("in add user")
  await db.collection("users").doc(uid).set({
      first: firstName,
      last: lastName,
      category: userCategory,
      email: userEmail,
      communities: [],
    })
    .then(function(docRef) {
      window.location.pathname = 'dashboard';
    })
    .catch(function(error) {
      // error adding user
    });
}


// on window load, check login state
window.onload = async function() {
  try {
    await firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        if (window.location.pathname === "/login.html") {
          window.location.pathname = 'dashboard';
        }

        // on dashboard load
        if (window.location.pathname === "/dashboard.html") {
          document.getElementsByTagName('body')[0].hidden = false;
          db.collection("users").doc(user.uid).get().then(function(doc) {
            if (doc.exists) {
              var navText = document.getElementById('userName');
              navText.innerHTML = doc.data()['first'] + " " + doc.data()['last'];

              console.log(doc.data()['first']);
              console.log(doc.data()['last']);
              console.log(doc.data()['category']);

            } else {
              console.log("No such document!");
            }
            getCommunities();
          }).catch(function(error) {
            console.log("Error getting document: ", error);
          });
        }
      } else {
        console.log("Logged out");
        if (window.location.pathname === "/dashboard.html")
          window.location.pathname = "/";
      }
    });

  } catch (error) {
    this.console.log(error);
  }
};

async function getCommunities() {
  var user = firebase.auth().currentUser;
  var communities = [];
  if (user) {
    await db.collection("users").doc(user.uid).get().then(function(doc) {
      if (doc.exists) {
        communities = doc.data()['communities'];
        getCommunityData(communities[0]);
        showCommunity(communities);
        showTokens();
      } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
      }
    }).catch(function(error) {
      console.log("Error getting document:", error);
    });
  }
}

async function getCommunityData(commUID) {
  var document;
  await db.collection("communities").doc(commUID).get().then(function(doc) {
    if (doc.exists) {
      showCommunityInfo(doc.data());
      console.log(doc.data);
    } else {
      console.log("No such document!");
    }
  }).catch(function(error) {
    console.log("Error getting document:", error);
  });
  return document;
}

function showCommunityInfo(map) {
  var name = document.getElementById('communityName');
  var addr = document.getElementById('communityAddr');
  var vacancies = document.getElementById('communityVacancy');

  var nameTitle = document.getElementById('communityNameTitle');
  var addrTitle = document.getElementById('communityAddrTitle');
  var vacanciesTitle = document.getElementById('communityVacancyTitle');

  nameTitle.innerHTML = "Name:";
  addrTitle.innerHTML = "Address:";
  vacanciesTitle.innerHTML = "Vacancies:";


  name.innerHTML = map['name'];
  addr.innerHTML = map['street'] + ", " + map['city'] + ", " + map['zip'];
  vacancies.innerHTML = (map['capacity'] - map['tenants'].length);
}

async function showCommunity(communityList) {
  var comms = "<div class=\"buttonContainer\">";
  var thisComm = "";
  for (i = 0; i < communityList.length; i++) {
    await db.collection("communities").doc(communityList[i]).get().then(function(doc) {
      if (doc.exists) {
        comms += "<li><button id=\"btn"+ i +"\" onClick=\"btnInfo(this.id)\" class=\"linkBtn\" value="+ communityList[i] +">" + doc.data()['name'] + "</button></li>";
        // console.log("COMM NAME = " + doc.data()['name']);
        // console.log(communityList[i]);
      } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
      }
    }).catch(function(error) {
      console.log("Error getting document:", error);
    });
  }
  comms += "</div>";
  var commListSection = document.getElementById("commList");
  commListSection.innerHTML = comms;
}

async function btnInfo(id) {
      var commUID = document.getElementById(id).value;
      console.log("Showing UID = " + commUID);
      await db.collection("communities").doc(commUID).get().then(function(doc) {
        if (doc.exists) {
          showCommunityInfo(doc.data());
        } else {
          console.log("No such document!");
        }
      }).catch(function(error) {
        console.log("Error getting document:", error);
      });
}


// function to create new community
async function submitCreateForm() {
  var name = document.getElementById('communityNameField').value;
  var capacity = document.getElementById('comunnityUnits').value;
  var street = document.getElementById('communityStreet').value;
  var city = document.getElementById('communityCity').value;
  var zip = document.getElementById('communityZip').value;
  document.getElementById('createError').hidden = true;
  
  if(name != "" && capacity != "" && street != ""
    && city != "" && zip != "") {
      await db.collection("communities").add({
        capacity: capacity,
        city: city,
        street: street,
        zip: zip,
        name: name,
        tenants: [],
      })
      .then(function(docRef) {
        console.log(docRef.id);
        addCommunityToAdmin(docRef.id);
      })
      .catch(function(error) {
        // error adding user
      });
    }
    else {
      document.getElementById('createError').hidden = false;
      document.getElementById('createError').innerHTML = "Please fill in all fields.";
    }  
}

async function addCommunityToAdmin(communityID) {
  var user = firebase.auth().currentUser;
  var communities;
  await db.collection("users").doc(user.uid).get().then(function(doc) {
    if (doc.exists) {
      communities = doc.data()['communities'];
      communities.push(communityID);
      db.collection("users").doc(user.uid).update({
        communities: communities,
      })
      .then(function(val) {
        window.location.pathname = 'dashboard';
      })
      .catch(function(error) {
        console.log("Error updating user communities:", error);
      });
    } else {
      // doc.data() will be undefined in this case
      console.log("No such user");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });

}

async function generateToken() {
  var user = firebase.auth().currentUser;
  var token = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
  var date = ""+ new Date();

  await db.collection("users").doc(user.uid)
  .collection("tokens").doc(token).get().then(async function(doc) {
    if (doc.exists) {
      // if generated token exists, regenerate
      generateToken();
    } 
    else {
      // else save token
      await db.collection("users").doc(user.uid)
        .collection("tokens").doc(token).set({
          date: date,
          inuse: false,
        })
        .then( async function(docRef) {
          var tokenList;
          // get token IDs
          await db.collection('users').doc(user.uid).get().then(async function(doc) {
            tokenList = doc.data()['tokenIDs'];
            tokenList.push(token);
            await db.collection('users').doc(user.uid).update({
              tokenIDs:tokenList,
            });
          });

          window.location.pathname = 'dashboard';
        })
        .catch(function(error) {
          // error adding user
        }
      );
    }
  });
}

async function showTokens() {
  var user = firebase.auth().currentUser;
  var tokenContainer = document.getElementById('tokensContainer');
  var tokenIDs;

  tokenContainer.innerHTML = "";

  // get token ids
  await db.collection('users').doc(user.uid).get().then(function(doc){
    tokenIDs = doc.data()['tokenIDs'];
  });
  console.log(tokenIDs.length);

  // check length
  if(tokenIDs.length < 1) {
    tokenContainer.innerHTML += "No active tokens.";
  }
  else {
    var code = "";
    // get token data by id
    for(var i = 0; i < tokenIDs.length; i++) {
      code += "<div class=\"d-flex justify-content-between w-100\"> "+
                  "<a data-toggle=\"tooltip\" data-placement=\"top\" title=\"toggle use\" class=\"nav-link tokenLinks\" onclick=\"toggleToken('"+tokenIDs[i]+"')\">"+tokenIDs[i]+"</a>";
      await db.collection('users').doc(user.uid).collection("tokens").doc(tokenIDs[i]).get().then(function(doc){
        if(doc.data()['inuse'])
          code += "<div class=\"col w-100\">in use</div>";
        else
          code += "<div class=\"col w-100\">not in use</div>";
      });
      code += "</div><hr class=\"bg-light\"/>";
      tokenContainer.innerHTML = code;
    }
  }
}

async function toggleToken(tokenID) {

  var user = firebase.auth().currentUser;
  var inuse;
  // get current inuse
  await db.collection('users').doc(user.uid).collection('tokens').doc(tokenID).get().then(function(doc){
    inuse = doc.data()['inuse'];
  });


  // toggle inuse
  await db.collection('users').doc(user.uid).collection('tokens').doc(tokenID).update({
    inuse:!inuse,
  }).then(function(doc) {
    // then reload dash
    window.location.pathname = 'dashboard';
  });
}