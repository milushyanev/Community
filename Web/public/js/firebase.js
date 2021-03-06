// web app's Firebase configuration goes here

// Initialize Firebase

firebase.initializeApp(firebaseConfig);


/////////ATHENTICATION//////////

var currentComm;
var recID = "";
var recCommUID = "";

// sign out
async function signOut() {
  await firebase.auth().signOut().then(function() {
    localStorage.clear();
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

async function getCommunities() {
  var user = firebase.auth().currentUser;
  var communities = [];
  if (user) {
    await db.collection("users").doc(user.uid).get().then(function(doc) {
      if (doc.exists) {
        communities = doc.data()['communities'];
        currentComm = communities[0];
        getCommunityData(communities[0]);
        showCommunity(communities);
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
  await db.collection("communities").doc(commUID).get().then(function(doc) {
    if (doc.exists) {
      showCommunityInfo(commUID);
      showTokens(commUID);
      getMessages("publicMessages");
      hasMaintenance();
      hasRent();
      console.log(doc.data);
    } else {
      console.log("No such document!");
    }
  }).catch(function(error) {
    console.log("Error getting document:", error);
  });
}

async function showCommunityInfo(commUID) {

  var body = document.getElementById('infoCardBody');
  body.innerHTML = "";

  await db.collection('communities').doc(commUID).get().then(async function(doc) {
    body.innerHTML += "<h5><i><strong>" + doc.data()['name'].toUpperCase() + "</strong></i><h5/>";
    body.innerHTML += "<h7>" + doc.data()['street'].toUpperCase() +
      ", " + doc.data()['city'].toUpperCase() + ", " + doc.data()['zip'] + "</h7>";
    body.innerHTML += "<hr class=\"bg-light\">";
    body.innerHTML += "<h7>Vacancies: " + (doc.data()['capacity'] - doc.data()['tenants'].length) + "</h7>";
    body.innerHTML += "<hr class=\"bg-light\">";
    body.innerHTML += "<h7>Tenants:</h7>";

    for (var i = 0; i < doc.data()['tenants'].length; i++) {
      body.innerHTML += "<div class=\"accodion\" id=\"accordion" + i + "\">";
      await db.collection('users').doc(doc.data()['tenants'][i]).get().then(function(userDoc) {
        body.innerHTML += "<button class=\"btn btn-link text-white tenantCollapseLink\" id=\"tenant" + i +
          "\" data-toggle=\"collapse\" data-target=\"#collapse" + i + "\" aria-expanded=\"true\" aria-controls=\"collapse" + i + "\" >" +
          userDoc.data()['first'] + " " + userDoc.data()['last'] + "</button>";
        body.innerHTML += "<div id=\"collapse" + i + "\" class=\"collapse\" data-parent=\"#accordion" + i +
          "\"><div class=\"d-flex justify-content-between\"><div class=\"col\"><p>Unit: " + userDoc.data()['unit'] + "</p></div>" +
          "<div class=\"col\"><svg type=\"button\" data-toggle=\"modal\" onClick=\"sendMessageInfo('" + doc.data()['tenants'][i] + "','" + commUID + "')\" data-target=\"#sendMessageModal\" class=\"bi bi-chat-square-fill iconButton\" width=\"1em\" height=\"1em\" viewBox=\"0 0 16 16\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\">" +
          "<path fill-rule=\"evenodd\" d=\"M2 0a2 2 0 00-2 2v8a2 2 0 002 2h2.5a1 1 0 01.8.4l1.9 2.533a1 1 0 001.6 0l1.9-2.533a1 1 0 01.8-.4H14a2 2 0 002-2V2a2 2 0 00-2-2H2z\" clip-rule=\"evenodd\"/>" +
          "</svg></div></div></div>";
      });
      body.innerHTML += "</div>";
    }
  });
}

function sendMessageInfo(userID, commUID) {
  recID = userID;
  recCommUID = commUID;
}

async function sendMessages() {
  var senderID = firebase.auth().currentUser.uid;
  var subject = document.getElementById('subjectPrivateText').value;
  var message = document.getElementById('privateText').value;
  await db.collection("communities").doc(recCommUID).collection("privateMessages").add({
    isRead: false,
    message: message,
    senderId: senderID,
    subject: subject,
  }).then(function(docRef) {
    db.collection("users").doc(recID).update({
      privateMessages: firebase.firestore.FieldValue.arrayUnion(docRef.id),
    })
    db.collection("users").doc(senderID).update({
      privateMessages: firebase.firestore.FieldValue.arrayUnion(docRef.id),
    })
  }).catch(function(error) {
    console.error("Error adding document: ", error);
  });
  setTimeout(function() {
    window.parent.location = window.parent.location.href;
  }, 1000);
}


async function showCommunity(communityList) {
  var comms = "<div class=\"buttonContainer\">";
  var thisComm = "";
  for (i = 0; i < communityList.length; i++) {
    await db.collection("communities").doc(communityList[i]).get().then(function(doc) {
      if (doc.exists) {
        comms += "<li><button id=\"btn" + i + "\" onClick=\"btnInfo(this.id)\" class=\"linkBtn\" value=" + communityList[i] + ">" + doc.data()['name'] + "</button></li>";
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
  currentComm = commUID;
  getCommunityData(commUID);
  getMessages("publicMessages");
  hasMaintenance();
  hasRent();
}


// function to create new community
async function submitCreateForm() {
  var name = document.getElementById('communityNameField').value;
  var capacity = document.getElementById('comunnityUnits').value;
  var street = document.getElementById('communityStreet').value;
  var city = document.getElementById('communityCity').value;
  var zip = document.getElementById('communityZip').value;
  document.getElementById('createError').hidden = true;

  if (name != "" && capacity != "" && street != "" &&
    city != "" && zip != "") {
    await db.collection("communities").add({
        capacity: capacity,
        city: city,
        street: street,
        zip: zip,
        name: name,
        tenants: [],
        tokenIDs: [],
      })
      .then(function(docRef) {
        console.log(docRef.id);
        addCommunityToAdmin(docRef.id);
      })
      .catch(function(error) {
        // error adding user
      });
  } else {
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

async function generateToken(commUID, unit) {
  var token = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
  var date = "" + new Date();

  await db.collection("tokens").doc(token).get().then(async function(doc) {
    if (doc.exists) {
      // if generated token exists, regenerate
      generateToken(commUID, unit);
    } else {
      var tokenIDs = [];
      // get current list
      await db.collection("communities").doc(commUID).get().then(function(doc) {
          if (doc.data()['tokenIDs'].length > 0) {
            tokenIDs = doc.data()['tokenIDs'];
          }
        })
        .catch(function(error) {
          // error
        });

      //push new token
      tokenIDs.push(token);

      // update community token ids
      await db.collection("communities").doc(commUID).update({
          tokenIDs: tokenIDs
        })
        .catch(function(error) {
          // error
        });

      // update tokens db
      await db.collection("tokens").doc(token).set({
          community: commUID,
          time: date,
          inuse: false,
          unit: unit,
        })
        .catch(function(error) {
          // error
        });

      // regenerate list
      showTokens(commUID);
    }
  });
}

function validateUnit(commUID) {
  var unit = document.getElementById('tokenUnitInput').value;
  document.getElementById('tokenUnitInputError').hidden = true;

  // add validation for unit vacancy
  if (unit != "") {
    generateToken(commUID, unit);
  } else {
    document.getElementById('tokenUnitInputError').hidden = false;
    document.getElementById('tokenUnitInputError').innerHTML = "Enter a unit number.";
  }
}

async function showTokens(commUID) {
  //set add token button to current community
  document.getElementById('generateTokenBtn').onclick = function() {
    validateUnit(commUID);
  };
  var tokenContainer = document.getElementById('tokensContainer');
  var tokenIDs;

  //clear current list
  tokenContainer.innerHTML = "";

  // get token ids
  await db.collection('communities').doc(commUID).get().then(function(doc) {
    tokenIDs = doc.data()['tokenIDs'];
  });
  console.log(tokenIDs);

  // check length
  if (tokenIDs.length < 1) {
    tokenContainer.innerHTML += "No active tokens.";
  } else {
    var code = "";
    // get token data by id
    for (var i = 0; i < tokenIDs.length; i++) {

      await db.collection('tokens').doc(tokenIDs[i]).get().then(function(doc) {
        if (doc.data()['inuse']) {
          code += "<div class=\"d-flex justify-content-between w-100 \"> " +
            "<a data-toggle=\"tooltip\" data-placement=\"top\" title=\"toggle use\"" +
            "class=\"nav-link tokenLinks\" onclick=\"return false;\">" +
            tokenIDs[i] +
            "</a>";
          code += "<div class=\"col w-100\">" + doc.data()['unit'] + "</div>";
          code += "<div class=\"col w-100\">in use</div>";
        } else {
          code += "<div class=\"d-flex justify-content-between w-100 \"> " +
            "<a data-toggle=\"tooltip\" data-placement=\"top\" title=\"toggle use\"" +
            "class=\"nav-link tokenLinks inuse\" onclick=\"toggleToken('" + tokenIDs[i] + "','" + commUID + "')\">" +
            tokenIDs[i] +
            "</a>";
          code += "<div class=\"col w-100\">" + doc.data()['unit'] + "</div>";
          code += "<div class=\"col w-100\">not in use</div>";
        }
      });
      code += "</div><hr class=\"bg-light\"/>";
      tokenContainer.innerHTML = code;
    }
  }
}

async function toggleToken(tokenID, commUID) {
  // toggle inuse
  await db.collection('tokens').doc(tokenID).update({
    inuse: true,
  }).then(function(doc) {
    // regenerate token list
    showTokens(commUID);
  });
}

async function getUser(userUID) {
  var name = "";
  await db.collection("users").doc(userUID).get().then(function(doc) {
    if (doc.exists) {
      name = doc.data()['first'];
      name += " " + doc.data()['last'];
    } else {
      console.log("No such user");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
  return name;
}

async function getMessages(msgType) {
  var msg = document.getElementById("messages");
  msg.innerHTML = "";
  var data = "";
  var name = "";
  var userUID = "";
  var commUID = currentComm;
  console.log("this community: " + commUID);
  var i = 0;
  await db.collection("communities").doc(commUID).collection(msgType).get().then(function(snapshot) {
      snapshot.forEach(async function(doc) {
        if (JSON.stringify(doc.data()) !== "'{}'") { //might want to change the condition if the database for communities doesn't have the collection for messages yet
          userUID = doc.data()['senderId'];
          // console.log(userUID);
          await getUser(userUID).then(function(val) {
            if (val != name) {
              name = val;
              data += "<li><button id=\"sender" + i + "\" onClick=\"showMessages('" + doc.data()['senderId'] + "','" + msgType + "','" + commUID + "')\" class=\"linkBtn\" data-toggle=\"modal\" data-target=\"#privateMessageModal\">" + name + "</button></li>";
              msg.innerHTML = data;
              i++;
            }
          });
        } else {
          console.log("No Data");
          data += "<h6> No Messages </h6>";
          msg.innerHTML = data;
        }
      });
    })
    .catch(function(error) {
      console.log("Error getting documents: ", error);
    });
}


async function showMessages(userUID, msgType, commUID) {
  var arr = [];
  document.getElementById("userMsg").innerHTML = "";
  await db.collection("users").doc(userUID).get().then(function(doc) {
    if (doc.exists) {
      arr = doc.data()[msgType]
      for (var i in arr) {
        getUserMsg(msgType, commUID, arr[i])
      }
    } else {
      console.log("No messages");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
  //toggle isRead to true when opened
}

async function getUserMsg(msgType, commUID, msgUID) {
  var modal = document.getElementById("userMsg");
  var data = "";
  await db.collection("communities").doc(commUID).collection(msgType).doc(msgUID).get().then(function(doc) {
    if (doc.exists) { //was thinking of putting this on a modal of some sort instead of showing
      data += "<p>Subject: " + doc.data()["subject"] + " </p>"
      data += "<p>Message: " + doc.data()["message"] + " </p>"
      data += "<hr class=\"bg-light\">";
      modal.innerHTML += data;
    } else {
      console.log("No");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
}

async function hasMaintenance() {
  var maintenance = document.getElementById("userMaintenance").innerHTML = "";
  var tenantID = "";
  var name = "";
  await db.collection("communities").doc(currentComm).get().then(async function(doc) {
    if (doc.exists) {
      for (var i = 0; i < doc.data()["tenants"].length; i++) {
        tenantID = doc.data()["tenants"][i];
        await db.collection("users").doc(tenantID).get().then(function(doc) {
          name = doc.data()["first"] + " " + doc.data()["last"];
          if (typeof doc.data()["maintenance"] !== "undefined") {
            showMaintenance(name, tenantID)
          }
        });
      }
    } else {
      console.log("No messages");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
}

async function showMaintenance(name, tenantID) {
  var mtnc;
  var maintenance = document.getElementById("userMaintenance");
  var data = "";
  await db.collection("users").doc(tenantID).get().then(function(doc) {
    if (doc.exists) {
      for (var i = 0; i < doc.data()["maintenance"].length; i++) {
        mtnc = doc.data()["maintenance"][i];
        data += "<p>- " + name + " -</p>"
        data += "<p>" + mtnc["dateTime"] + " - " + mtnc["status"] + "</p>";
        data += "<p>Topic: " + mtnc["topic"] + " </p>"
        data += "<p>Messages: " + mtnc["text"] + " </p>"
        data += "<hr class=\"bg-light\">";
      }
    } else {
      console.log("No messages");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
  maintenance.innerHTML = data;
}

async function hasRent() {
  var payment = document.getElementById("userPayment").innerHTML = "";
  var tenantID = "";
  var name = "";
  await db.collection("communities").doc(currentComm).get().then(async function(doc) {
    if (doc.exists) {
      for (var i = 0; i < doc.data()["tenants"].length; i++) {
        tenantID = doc.data()["tenants"][i];
        await db.collection("users").doc(tenantID).get().then(function(doc) {
          name = doc.data()["first"] + " " + doc.data()["last"];
          if (typeof doc.data()["payment"] !== "undefined") {
            showPayment(name, tenantID)
          }
        });
      }
    } else {
      console.log("No messages");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
}

async function showPayment(name, tenantID) {
  var pmnt;
  var payment = document.getElementById("userPayment");
  var data = "";
  await db.collection("users").doc(tenantID).get().then(function(doc) {
    if (doc.exists) {
      for (var i = 0; i < doc.data()["payment"].length; i++) {
        pmnt = doc.data()["payment"][i];
        data += "<p>- " + name + " -</p>"
        data += "<p>" + pmnt["dateTime"] + "</p>";
        data += "<p>Amount: $" + pmnt["amount"] + " </p>"
        data += "<hr class=\"bg-light\">";
      }
    } else {
      console.log("No messages");
    }
  }).catch(function(error) {
    console.log("Error getting user data:", error);
  });
  payment.innerHTML = data;
}
