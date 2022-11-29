var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login_test', { title: 'Express' });
});

router.get("/registration", (req, res, next) => {
  res.render("registration", { title: "Account Register"});
});

module.exports = router;
