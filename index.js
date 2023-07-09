/**
 * Import function triggers from their respective submodules:
*
* const {onCall} = require("firebase-functions/v2/https");
* const {onDocumentWritten} = require("firebase-functions/v2/firestore");
*
* See a full list of supported triggers at https://firebase.google.com/docs/functions
*/

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require('node-fetch');
const {Firestore} = require('@google-cloud/firestore');

const PROJECTID = 'windchaser-d1c0d';
const COLLECTION_NAME = 'windChaser';
const WEATHER_API_URL = "https://api.openweathermap.org/data/3.0/onecall?lat=32.27&lon=34.83&appid="

const firestore = new Firestore({
  projectId: PROJECTID,
  timestampsInSnapshots: true
});


exports.windTrends = onRequest((req, res) => {
    logger.info("Hello logs!", {structuredData: true});
    const getCurrentWindSpeed = async() => {
        let docData ={ firestore:"before db read"}
        try {
            const docObj = await firestore.collection(COLLECTION_NAME).doc("current").get()
            docData = await docObj.data()
        } catch (err) {
            return {err:"error fetching data from firestore"}
        }
        let weatherData = {...docData.weatherInfo,date: Date.now()}
        if(Date.now() / 1000 - 3600 > docData.weatherInfo.current.dt){
            try {
                logger.info("get fresh data from weather api", {structuredData: true});
                const resFetch = await fetch(WEATHER_API_URL+docData.appid);
                weatherData = await resFetch.json();
            } catch (err) {
                return {err:"error fetching data from weather api"}
            }
        }else{
            logger.info("skipping weather api we already have data from the last 60 min", {structuredData: true});
        }
        const currentDate = Date.now()
        await firestore.collection(COLLECTION_NAME).doc("current").update({"owners":"Team Lachmish",...docData,weatherInfo:{date:currentDate,...weatherData}})
      return res.status(200).send({"owners":"Team Lachmish",...docData,weatherInfo:{date:currentDate,...weatherData}})
    }
    return getCurrentWindSpeed()
    
});
