const express = require('express');
const openid = require('openid-client');
const cookieParser = require('cookie-parser');
const jwt_decode = require('jwt-decode');
const session = require('express-session');
const app = express();
const cors = require('cors');
const mongoose = require("mongoose");

app.set('view engine', 'jade');
app.use(cors());
app.use(cookieParser());

app.use(session({
  secret: "Tottenham Sucks.",
  resave: false,
  saveUninitialized: false
}));

mongoose.connect('mongodb+srv://surbhit:1234@cluster0.tas80.mongodb.net/testdb6', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
    address:String,
    faceId: String,
  });

const User = new mongoose.model("user", userSchema);

app.use(async (req, res, next) => {
  if (res.app.get('client') === undefined) {
    // Humanode Issuer a.k.a. Identity provider.
    const humanodeIssuer = await openid.Issuer.discover(
      'https://auth.staging.oauth2.humanode.io'
    );

    // Set up the common hackathon client.
    const client = new humanodeIssuer.Client({
      client_id: 'hackathon-participant',
      client_secret: 'q4_GkveX47i3M9wYXSkU5CKn3h',
      redirect_uris: ['http://localhost:3000/callback'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post'
    });

    // Save client configuration for later use.
    res.app.set('client', client);
  }
  next();
});

app.get('/token/:address', async (req, res) => {
  const addr = req.params.address;
  console.log("Line 67 " + addr);
  const user = await User.find(
    {
      address: addr
    })

    console.log(user);
    console.log(user[0].faceId);
 
    return res.json(
      {
          id:user[0].faceId
      }
      );
  
});

app.get('/login', async (req, res) => {
  // Get OAuth 2 client.
  const client = res.app.get('client');

  // Set up codeVerifier and save it as a cookie for later use.
  const codeVerifier = openid.generators.codeVerifier(64);
  res.cookie('codeVerifier', codeVerifier, { maxAge: 360000 });

  // Set up codeChallenge for login flow.
  const codeChallenge = openid.generators.codeChallenge(codeVerifier);

  // Get the redirect URI.
  const redirectUri = client.authorizationUrl({
    scope: 'openid',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: 'some-state'
  });

  // Redirect end-user to Humanode login page.
  // After the login flow user will be redirected to our callback URI.
  res.redirect(redirectUri);
});

app.get('/callback', async (req, res) => {
  // Get codeVerifier and client.
  const { codeVerifier } = req.cookies;
  const client = res.app.get('client');

  // Get callback params with auth code.
  const params = client.callbackParams(req);

  // If callback params have an error instead of auth code
  // render error page with description.
  if ('error' in params) {
    res.render('error', { errorDescription: params.error_description });
    return;
  }

  // Exchange auth code for JWT token.
  const tokenSet = await client.callback('http://localhost:3000/callback', params, { state: 'some-state', code_verifier: codeVerifier });
  // Save JWT.
  res.cookie('jwtSet', tokenSet, { maxAge: 360000 });
  console.log(req.cookies.address);
  console.log(tokenSet.access_token);
  var decoded = jwt_decode(tokenSet.access_token);
  // Redirect end-user to root route.
  
  //store here
  try{
    const user = await User.create(
      {
        address: req.cookies.address,
        faceId: decoded.sub
      }
    )
    }
    catch(e){
      console.log(e.message);
    } 

  res.redirect(`/${req.cookies.address}`);
});

app.get('/:address', (req, res) => {
  
  const address = req.params.address;
  if(address != "favicon.ico"){
  console.log("Line 180" + address);
  res.cookie("address",address);
  // console.log(req.cookies.jwtS);
  res.render('index', {
    address
  });
}
});

app.listen(3000, () => {
  console.log('App listening on port 3000!');
});
