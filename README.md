# windChaser
## setup firebase tool
npm install -g firebase-tools
## to get a token
firebase login:ci
export GToken=...
## Deploy to cloud
firebase deploy --only functions --token=$GToken
## Project Console 
https://console.firebase.google.com/project/windchaser-d1c0d/overview