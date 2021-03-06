var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var app = require('../app');
var pwd = require('pwd');
var knexConfig = require('../knexfile.js');
var knex = require('knex')(knexConfig);
var database = app.get('database');
var request = require('request');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static('public'));

/* GET home page. */
router.get('/', function(req, res, next) {

  if (req.cookies.preferences) {
    res.render('results', {
      title: "I'm Bored!"
    });
  } else {
    res.render('login', {
      title: "I'm Bored!"
    });
  }
});

//Login 
router.post('/', function(req, res) {

  knex('authtable')
    .where({
      'username': req.body.username
    })
    .then(function(records) {

      var user = records[0];

      if (records.length === 0) {
        res.render('login', {
          title: 'Im Bored',
          user: null,
          error: 'No Such User'
        });

      } else {
        pwd.hash(req.body.password, user.salt, function(err, hash) {

          if (err) {
            console.log(err);
          }

          if (user.hash === hash) {

            //Get user ID from DB
            knex('authtable')
              .where({
                'username': req.body.username
              }).select('userid')
              .then(function(results) {

                var userid = results[0].userid;

                //Get user preferences from DB 
                knex('userpreftable')
                  .where({
                    'userid': results[0].userid
                  }).select('preferenceid')
                  .then(function(result) {

                    var prefs = [];

                    //Store user preferences in prefs array
                    for (var prop in result) {
                      if (prop !== 'userid') {
                        prefs.push(result[prop].preferenceid);
                      }
                    }

                    var prefName = [];
                    
                    //loop through prefs array
                    for (var i = 0; i < prefs.length; i++) {
                      if (i !== prefs.length - 1) {
                        
                        // Match users preference id with their preferences.
                        // Gets the apiname and puts it into prefName
                        knex('preftable').where({
                            'preferenceid': prefs[i]
                          }).select('apiname')
                          .then(function(rezult) {
                            
                            prefName.push(rezult[0].apiname);
                          });

                      } else if (i == prefs.length - 1) {

                        knex('preftable').where({
                            'preferenceid': prefs[i]
                          }).select('apiname')
                          .then(function(rezult) {

                            prefName.push(rezult[0].apiname);
                            request('https://maps.googleapis.com/maps/api/geocode/json?address=' + req.body.city + '&key=AIzaSyD0OGfjwg9iGIWxr-IUCVHCFI8EWPl-HbI', function(err, resp, body) {

                              var citySelect = JSON.parse(body);

                              if (citySelect.results.length !== 0) {

                                res.cookie('preferences', prefName.join());
                                res.cookie('lat', citySelect.results[0].geometry.location.lat);
                                res.cookie('lng', citySelect.results[0].geometry.location.lng);
                                res.redirect('/results');

                              } else {
                                res.render('login', {
                                  title: 'Im Bored',
                                  user: null,
                                  error: 'Not a valid location. Please try again'
                                });
                              }
                            });
                          });
                      }
                    }
                  });
              });

          } else {
            res.render('login', {
              title: 'Im Bored',
              user: null,
              error: 'Incorrect Password '
            });
          }
        });
      }
    });
});

//Render Results Page
router.get('/results', function(req, res, next) {

  res.render('results', {
    title: "I'm Bored!"
  });
});
//Logout and clear all cookies 
router.get('/logout', function(req, res, next) {

  res.clearCookie('preferences');
  res.clearCookie('lat');
  res.clearCookie('lng');

  res.render('logout', {
    title: "I'm Bored!"
  });
});




//Render Register Page
router.get('/register', function(req, res, next) {

  res.render('regis', {
    title: "I'm Bored!"
  });
});

//Register 
router.post('/register', function(req, res) {

  var prefArr = [];
  var prefs = [];
  var prefName = [];

  knex('authtable')
    .where({
      'username': req.body.username
    })
    .then(function(result) {

      //Hash and salt   
      pwd.hash(req.body.password, function(err, salt, hash) {

        var stored = {
          username: req.body.username,
          salt: salt,
          hash: hash
        };

        knex('authtable')
          .returning('userid')
          .insert(stored)
          .then(function(userid) {

            for (var prop in req.body) {

              if (prop !== 'username' && prop !== 'city' && prop !== 'password' && prop !== 'password_confirm') {
                prefs.push(prop);
              }
            }

            for (var i = 0; i < prefs.length; i++) {

              knex('preftable').where({
                  'preferenceid': prefs[i]
                }).select('apiname')
                .then(function(rezult) {

                  prefName.push(rezult[0].apiname);
                });
            }

            knex('authtable')
              .where({
                'username': req.body.username
              }).select('userid')
              .then(function(results) {

                if (results.length !== 0) {

                  for (var i = 0; i < 20; i++) {

                    var k = parseInt(i);

                    if (req.body[k]) {
                      prefArr.push(k);
                    }
                  }

                  for (var j = 0; j < prefArr.length; j++) {

                    knex('userpreftable')
                      .insert([{
                        preferenceid: prefArr[j],
                        userid: results[0].userid
                      }])
                      .then();
                  }

                  knex('userpreftable')
                    .then(function() {

                      request('https://maps.googleapis.com/maps/api/geocode/json?address=' + req.body.city + '&key=AIzaSyD0OGfjwg9iGIWxr-IUCVHCFI8EWPl-HbI', function(err, resp, body) {

                        var citySelect = JSON.parse(body);

                        if (citySelect.results.length !== 0) {

                          res.cookie('preferences', prefName.join());
                          res.cookie('lat', citySelect.results[0].geometry.location.lat);
                          res.cookie('lng', citySelect.results[0].geometry.location.lng);
                          res.redirect('/results');

                        } else {
                          res.render('regis', {
                            title: 'Im Bored',
                            user: null,
                            error: 'Not a valid location. Please try again'
                          });
                        }
                      });
                    });
                }
              });
          });
      });
    });
});

module.exports = router;
 